"""
generate_transfer_recommendations.py
Recommendation engine pentru Medical Stock AI.

1. Citeste ai_predictions pentru EXPIRY_RISK HIGH/MID.
2. Citeste ai_predictions pentru SHORTAGE_RISK HIGH/MID.
3. Gaseste potriviri sursa -> destinatie pentru acelasi medicament.
4. Verifica:
   - destinatia are storage compatibil
   - ruta de transport sustine conditia de storage
   - sursa ramane peste safety stock dupa transfer
   - destinatia poate folosi cantitatea inainte de expirare
5. Salveaza recomandari in transfer_recommendations.

Nota despre confidence_score:
- Nu mai este derivat direct din priority_score.
- Confidence-ul recomandarii combina confidence-ul predictiilor AI cu siguranta logistica,
  marja economica si capacitatea destinatiei de a consuma cantitatea in timp.
"""

from __future__ import annotations

import sys
from pathlib import Path
import uuid

ROOT_DIR = Path(__file__).resolve().parent.parent

if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any

import psycopg2
import psycopg2.extras
from config.db_config import get_connection

import sys

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

# =========================
# CONFIG
# =========================

TODAY = date.today()
MAX_RECOMMENDATIONS_PER_BATCH = 2
MIN_RECOMMENDED_QUANTITY = 5

MAX_DISTANCE_KM_BY_STORAGE = {
    "normal": 450,
    "cold": 280,
    "frozen": 180,
    "controlled": 350,
    "hazardous": 200,
}

TRANSPORT_COST_MULTIPLIER_BY_STORAGE = {
    "normal": 1.00,
    "cold": 1.35,
    "frozen": 1.75,
    "controlled": 1.50,
    "hazardous": 1.60,
}

MIN_DESTINATION_CONSUMPTION_RATIO = 0.70
MIN_RECOMMENDATION_CONFIDENCE = 0.20
MAX_RECOMMENDATION_CONFIDENCE = 0.99


@dataclass
class ExpiryCandidate:
    batch_id: str
    hospital_id: str
    medication_id: str
    batch_number: str
    quantity_current: int
    expiry_date: date
    days_to_expiry: int
    estimated_expired_quantity: int
    predicted_daily_demand_source: float
    purchase_price_per_unit: float
    disposal_cost_per_unit: float
    storage_condition: str
    source_hospital_name: str
    medication_name: str
    risk_level: str
    prediction_confidence: float


@dataclass
class ShortageCandidate:
    hospital_id: str
    medication_id: str
    predicted_daily_demand: float
    stock_coverage_days: float
    current_stock: int
    incoming_restock_quantity: int
    risk_level: str
    destination_hospital_name: str
    prediction_confidence: float


@dataclass
class Route:
    source_hospital_id: str
    destination_hospital_id: str
    distance_km: float
    estimated_hours: float
    base_transport_cost: float
    supports_cold_chain: bool
    supports_frozen_chain: bool
    supports_controlled_transport: bool


def fetch_all(cur, query: str, params: tuple[Any, ...] | None = None) -> list[dict[str, Any]]:
    cur.execute(query, params or ())
    return list(cur.fetchall())


def clamp(value: float, minimum: float = 0.0, maximum: float = 1.0) -> float:
    return max(minimum, min(maximum, value))


def get_latest_successful_ai_run_id(cur) -> str:
    cur.execute(
        """
        SELECT id::text
        FROM ai_run_logs
        WHERE status = 'success'
        ORDER BY finished_at DESC NULLS LAST, started_at DESC
        LIMIT 1;
        """
    )
    row = cur.fetchone()
    if not row:
        raise RuntimeError("Nu exista niciun AI run cu status success.")
    return row["id"]


def clear_previous_recommendations(cur):
    # Nu stergem recomandarile care sunt deja folosite in cereri de transfer (transfer_requests)
    cur.execute("""
        DELETE FROM transfer_recommendations 
        WHERE id NOT IN (
            SELECT DISTINCT source_recommendation_id 
            FROM transfer_requests 
            WHERE source_recommendation_id IS NOT NULL
        );
    """)


def load_expiry_candidates(cur, ai_run_id: str) -> list[ExpiryCandidate]:
    rows = fetch_all(
        cur,
        """
        SELECT
            b.id::text AS batch_id,
            b.hospital_id::text,
            b.medication_id::text,
            b.batch_number,
            b.quantity_current,
            b.expiry_date,
            b.purchase_price_per_unit,
            b.disposal_cost_per_unit,
            b.storage_condition::text,
            p.days_to_expiry,
            p.estimated_expired_quantity,
            p.predicted_daily_demand AS predicted_daily_demand_source,
            p.risk_level::text AS risk_level,
            p.confidence_score,
            h.name AS source_hospital_name,
            m.name AS medication_name
        FROM ai_predictions p
        JOIN medication_batches b ON b.id = p.batch_id
        JOIN hospitals h ON h.id = b.hospital_id
        JOIN medications m ON m.id = b.medication_id
        WHERE p.ai_run_id = %s
          AND p.prediction_type = 'EXPIRY_RISK'
          AND p.risk_level IN ('HIGH', 'MID')
          AND b.status = 'available'
          AND b.quantity_current > 0
          AND p.estimated_expired_quantity > 0
        ORDER BY
          CASE p.risk_level WHEN 'HIGH' THEN 1 WHEN 'MID' THEN 2 ELSE 3 END,
          p.days_to_expiry ASC,
          p.estimated_expired_quantity DESC;
        """,
        (ai_run_id,),
    )

    return [
        ExpiryCandidate(
            batch_id=row["batch_id"],
            hospital_id=row["hospital_id"],
            medication_id=row["medication_id"],
            batch_number=row["batch_number"],
            quantity_current=int(row["quantity_current"]),
            expiry_date=row["expiry_date"],
            days_to_expiry=int(row["days_to_expiry"]),
            estimated_expired_quantity=int(row["estimated_expired_quantity"]),
            predicted_daily_demand_source=float(row["predicted_daily_demand_source"] or 0.01),
            purchase_price_per_unit=float(row["purchase_price_per_unit"] or 0),
            disposal_cost_per_unit=float(row["disposal_cost_per_unit"] or 0),
            storage_condition=row["storage_condition"],
            source_hospital_name=row["source_hospital_name"],
            medication_name=row["medication_name"],
            risk_level=row["risk_level"],
            prediction_confidence=float(row["confidence_score"] or 0.50),
        )
        for row in rows
    ]


def load_shortage_candidates(cur, ai_run_id: str) -> dict[str, list[ShortageCandidate]]:
    rows = fetch_all(
        cur,
        """
        SELECT
            p.hospital_id::text,
            p.medication_id::text,
            p.predicted_daily_demand,
            p.stock_coverage_days,
            p.risk_level::text AS risk_level,
            p.confidence_score,
            p.input_snapshot,
            h.name AS destination_hospital_name
        FROM ai_predictions p
        JOIN hospitals h ON h.id = p.hospital_id
        WHERE p.ai_run_id = %s
          AND p.prediction_type = 'SHORTAGE_RISK'
          AND p.risk_level IN ('HIGH', 'MID')
        ORDER BY
          CASE p.risk_level WHEN 'HIGH' THEN 1 WHEN 'MID' THEN 2 ELSE 3 END,
          p.stock_coverage_days ASC;
        """,
        (ai_run_id,),
    )

    by_medication: dict[str, list[ShortageCandidate]] = {}
    for row in rows:
        snapshot = row["input_snapshot"] or {}
        candidate = ShortageCandidate(
            hospital_id=row["hospital_id"],
            medication_id=row["medication_id"],
            predicted_daily_demand=float(row["predicted_daily_demand"] or 0.01),
            stock_coverage_days=float(row["stock_coverage_days"] or 0),
            current_stock=int(snapshot.get("current_stock", 0)),
            incoming_restock_quantity=int(snapshot.get("incoming_restock_quantity", 0)),
            risk_level=row["risk_level"],
            destination_hospital_name=row["destination_hospital_name"],
            prediction_confidence=float(row["confidence_score"] or 0.50),
        )
        by_medication.setdefault(candidate.medication_id, []).append(candidate)

    return by_medication


def load_storage_capabilities(cur) -> set[tuple[str, str]]:
    rows = fetch_all(
        cur,
        """
        SELECT hospital_id::text, storage_type::text
        FROM hospital_storage_capabilities
        WHERE is_validated = TRUE;
        """,
    )
    return {(row["hospital_id"], row["storage_type"]) for row in rows}


def load_routes(cur) -> dict[tuple[str, str], Route]:
    rows = fetch_all(
        cur,
        """
        SELECT
            source_hospital_id::text,
            destination_hospital_id::text,
            distance_km,
            estimated_hours,
            base_transport_cost,
            supports_cold_chain,
            supports_frozen_chain,
            supports_controlled_transport
        FROM transport_routes
        WHERE is_active = TRUE;
        """,
    )

    routes: dict[tuple[str, str], Route] = {}
    for row in rows:
        route = Route(
            source_hospital_id=row["source_hospital_id"],
            destination_hospital_id=row["destination_hospital_id"],
            distance_km=float(row["distance_km"] or 0),
            estimated_hours=float(row["estimated_hours"] or 0),
            base_transport_cost=float(row["base_transport_cost"] or 0),
            supports_cold_chain=bool(row["supports_cold_chain"]),
            supports_frozen_chain=bool(row["supports_frozen_chain"]),
            supports_controlled_transport=bool(row["supports_controlled_transport"]),
        )
        routes[(route.source_hospital_id, route.destination_hospital_id)] = route
    return routes


def load_thresholds(cur) -> dict[tuple[str, str], dict[str, int]]:
    rows = fetch_all(
        cur,
        """
        SELECT
            hospital_id::text,
            medication_id::text,
            min_buffer_days,
            target_buffer_days,
            max_buffer_days
        FROM stock_thresholds
        WHERE department_id IS NULL;
        """,
    )
    return {
        (row["hospital_id"], row["medication_id"]): {
            "min_buffer_days": int(row["min_buffer_days"]),
            "target_buffer_days": int(row["target_buffer_days"]),
            "max_buffer_days": int(row["max_buffer_days"]),
        }
        for row in rows
    }


def get_max_distance_for_storage(storage_condition: str) -> float:
    return float(MAX_DISTANCE_KM_BY_STORAGE.get(storage_condition, 0))


def get_transport_cost_multiplier(storage_condition: str) -> float:
    return float(TRANSPORT_COST_MULTIPLIER_BY_STORAGE.get(storage_condition, 1.0))


def route_supports_storage(route: Route, storage_condition: str) -> bool:
    max_distance = get_max_distance_for_storage(storage_condition)
    if max_distance <= 0 or route.distance_km > max_distance:
        return False

    if storage_condition == "normal":
        return True
    if storage_condition == "cold":
        return route.supports_cold_chain
    if storage_condition == "frozen":
        return route.supports_frozen_chain
    if storage_condition == "controlled":
        return route.supports_controlled_transport
    if storage_condition == "hazardous":
        return True
    return False


def calculate_source_transferable_quantity(
    expiry: ExpiryCandidate,
    source_threshold: dict[str, int] | None,
) -> int:
    min_buffer_days = source_threshold["min_buffer_days"] if source_threshold else 7
    source_safety_stock = int(expiry.predicted_daily_demand_source * min_buffer_days)
    source_transferable_quantity = max(0, expiry.quantity_current - source_safety_stock)
    return source_transferable_quantity


def calculate_destination_need(
    shortage: ShortageCandidate,
    destination_threshold: dict[str, int] | None,
) -> int:
    target_days = destination_threshold["target_buffer_days"] if destination_threshold else 30
    target_stock = int(shortage.predicted_daily_demand * target_days)
    current_effective_stock = shortage.current_stock + shortage.incoming_restock_quantity
    return max(0, target_stock - current_effective_stock)


def calculate_destination_consumption_ratio(
    shortage: ShortageCandidate,
    quantity: int,
    days_to_expiry: int,
) -> float:
    if quantity <= 0 or days_to_expiry <= 0:
        return 0.0
    expected_consumption_until_expiry = shortage.predicted_daily_demand * days_to_expiry
    return expected_consumption_until_expiry / quantity


def destination_can_consume_before_expiry(shortage: ShortageCandidate, quantity: int, days_to_expiry: int) -> bool:
    consumption_ratio = calculate_destination_consumption_ratio(shortage, quantity, days_to_expiry)
    return consumption_ratio >= MIN_DESTINATION_CONSUMPTION_RATIO


def compute_priority_score(
    expiry: ExpiryCandidate,
    shortage: ShortageCandidate,
    route: Route,
    net_savings: float,
) -> float:
    expiry_score = 100 if expiry.risk_level == "HIGH" else 65
    shortage_score = 100 if shortage.risk_level == "HIGH" else 70
    distance_score = max(0, 100 - route.distance_km / 5)
    savings_score = min(100, max(0, net_savings / 100))
    urgency_score = max(0, 100 - expiry.days_to_expiry)

    return (
        expiry_score * 0.28
        + shortage_score * 0.32
        + distance_score * 0.12
        + savings_score * 0.13
        + urgency_score * 0.15
    )


def compute_recommendation_confidence(
    expiry: ExpiryCandidate,
    shortage: ShortageCandidate,
    route: Route,
    recommended_quantity: int,
    saved_value: float,
    avoided_disposal: float,
    transport_cost: float,
    net_savings: float,
) -> float:
    """
    Calculeaza confidence-ul recomandarii.
    Combina siguranta predictiilor cu marja logistica, marja financiara si consumul estimat la destinatie.
    """
    prediction_confidence = min(expiry.prediction_confidence, shortage.prediction_confidence)

    max_distance = max(get_max_distance_for_storage(expiry.storage_condition), 1.0)
    distance_margin_ratio = clamp((max_distance - route.distance_km) / max_distance, 0.0, 1.0)
    logistics_confidence = 0.55 + 0.45 * distance_margin_ratio

    gross_savings = max(saved_value + avoided_disposal, 1.0)
    savings_margin_ratio = clamp(net_savings / gross_savings, 0.0, 1.0)
    savings_confidence = 0.45 + 0.55 * savings_margin_ratio

    consumption_ratio = calculate_destination_consumption_ratio(
        shortage=shortage,
        quantity=recommended_quantity,
        days_to_expiry=expiry.days_to_expiry,
    )
    consumption_margin_ratio = clamp(
        (consumption_ratio - MIN_DESTINATION_CONSUMPTION_RATIO) / max(1.0 - MIN_DESTINATION_CONSUMPTION_RATIO, 0.01),
        0.0,
        1.0,
    )
    consumption_confidence = 0.50 + 0.50 * consumption_margin_ratio

    final_confidence = (
        prediction_confidence * 0.45
        + logistics_confidence * 0.20
        + savings_confidence * 0.20
        + consumption_confidence * 0.15
    )

    return round(clamp(final_confidence, MIN_RECOMMENDATION_CONFIDENCE, MAX_RECOMMENDATION_CONFIDENCE), 3)


def generate_recommendations(cur):
    ai_run_id = get_latest_successful_ai_run_id(cur)
    clear_previous_recommendations(cur)

    expiry_candidates = load_expiry_candidates(cur, ai_run_id)
    shortage_by_medication = load_shortage_candidates(cur, ai_run_id)
    storage_capabilities = load_storage_capabilities(cur)
    routes = load_routes(cur)
    thresholds = load_thresholds(cur)

    print(f"AI run folosit: {ai_run_id}")
    print(f"Expiry candidates: {len(expiry_candidates)}")
    print(f"Medicamente cu shortage: {len(shortage_by_medication)}")

    recommendation_rows = []
    skipped_stats = {
        "no_shortage_destination": 0,
        "same_hospital": 0,
        "no_storage": 0,
        "no_route": 0,
        "route_incompatible": 0,
        "source_not_transferable": 0,
        "destination_no_need": 0,
        "cannot_consume_before_expiry": 0,
        "quantity_too_low": 0,
        "negative_savings": 0,
    }

    for expiry in expiry_candidates:
        possible_destinations = shortage_by_medication.get(expiry.medication_id, [])
        if not possible_destinations:
            skipped_stats["no_shortage_destination"] += 1
            continue

        source_threshold = thresholds.get((expiry.hospital_id, expiry.medication_id))
        source_transferable = calculate_source_transferable_quantity(expiry, source_threshold)
        if source_transferable <= 0:
            skipped_stats["source_not_transferable"] += 1
            continue

        candidate_recommendations = []

        for shortage in possible_destinations:
            if shortage.hospital_id == expiry.hospital_id:
                skipped_stats["same_hospital"] += 1
                continue

            if (shortage.hospital_id, expiry.storage_condition) not in storage_capabilities:
                skipped_stats["no_storage"] += 1
                continue

            route = routes.get((expiry.hospital_id, shortage.hospital_id))
            if route is None:
                skipped_stats["no_route"] += 1
                continue

            if not route_supports_storage(route, expiry.storage_condition):
                skipped_stats["route_incompatible"] += 1
                continue

            destination_threshold = thresholds.get((shortage.hospital_id, shortage.medication_id))
            destination_need = calculate_destination_need(shortage, destination_threshold)
            if destination_need <= 0:
                skipped_stats["destination_no_need"] += 1
                continue

            recommended_quantity = min(
                expiry.estimated_expired_quantity,
                source_transferable,
                destination_need,
            )

            if recommended_quantity < MIN_RECOMMENDED_QUANTITY:
                skipped_stats["quantity_too_low"] += 1
                continue

            if not destination_can_consume_before_expiry(shortage, recommended_quantity, expiry.days_to_expiry):
                skipped_stats["cannot_consume_before_expiry"] += 1
                continue

            saved_value = recommended_quantity * expiry.purchase_price_per_unit
            avoided_disposal = recommended_quantity * expiry.disposal_cost_per_unit
            transport_cost = route.base_transport_cost * get_transport_cost_multiplier(expiry.storage_condition)

            net_savings = saved_value + avoided_disposal - transport_cost
            if net_savings <= 0:
                skipped_stats["negative_savings"] += 1
                continue

            recommended_transfer_date = min(
                TODAY + timedelta(days=2),
                expiry.expiry_date - timedelta(days=3),
            )
            if recommended_transfer_date < TODAY:
                recommended_transfer_date = TODAY

            risk_level = "HIGH" if expiry.risk_level == "HIGH" or shortage.risk_level == "HIGH" else "MID"

            confidence = compute_recommendation_confidence(
                expiry=expiry,
                shortage=shortage,
                route=route,
                recommended_quantity=recommended_quantity,
                saved_value=saved_value,
                avoided_disposal=avoided_disposal,
                transport_cost=transport_cost,
                net_savings=net_savings,
            )

            reason = (
                f"Transfer recomandat pentru {expiry.medication_name}, batch {expiry.batch_number}. "
                f"Sursa ({expiry.source_hospital_name}) are {expiry.quantity_current} unități, "
                f"iar {expiry.estimated_expired_quantity} unități sunt estimate la risc de expirare în {expiry.days_to_expiry} zile. "
                f"Destinația ({shortage.destination_hospital_name}) are risc {shortage.risk_level} de shortage, "
                f"cu acoperire estimată {shortage.stock_coverage_days:.1f} zile. "
                f"Cantitate recomandată: {recommended_quantity} unități. "
                f"Storage: {expiry.storage_condition}. Distanță: {route.distance_km:.1f} km. "
                f"Economii nete estimate: {net_savings:.2f} RON. "
                f"Confidence recomandare: {confidence:.3f}."
                #f"Confidence-ul recomandarii combina siguranta expiry risk, siguranta shortage risk, "
                #f"logistica, economia neta si capacitatea destinatiei de consum inainte de expirare."
            )

            rec_id = str(uuid.uuid5(uuid.NAMESPACE_OID, f"{expiry.hospital_id}_{shortage.hospital_id}_{expiry.medication_id}_{expiry.batch_id}"))

            priority_score = compute_priority_score(expiry, shortage, route, net_savings)

            candidate_recommendations.append(
                {
                    "priority_score": priority_score,
                    "row": (
                        rec_id,
                        ai_run_id,
                        expiry.hospital_id,
                        shortage.hospital_id,
                        expiry.medication_id,
                        expiry.batch_id,
                        recommended_quantity,
                        reason,
                        risk_level,
                        round(saved_value, 2),
                        round(avoided_disposal, 2),
                        round(transport_cost, 2),
                        round(net_savings, 2),
                        round(route.distance_km, 2),
                        recommended_transfer_date,
                        confidence,
                        "pending",
                    ),
                }
            )

        candidate_recommendations.sort(key=lambda item: item["priority_score"], reverse=True)
        for item in candidate_recommendations[:MAX_RECOMMENDATIONS_PER_BATCH]:
            recommendation_rows.append(item["row"])

    if recommendation_rows:
        psycopg2.extras.execute_values(
            cur,
            """
            INSERT INTO transfer_recommendations (
                id,
                ai_run_id,
                source_hospital_id,
                destination_hospital_id,
                medication_id,
                batch_id,
                recommended_quantity,
                reason,
                risk_level,
                expected_savings,
                avoided_disposal_cost,
                transport_cost,
                net_savings,
                distance_km,
                recommended_transfer_date,
                confidence_score,
                status
            ) VALUES %s;
            """,
            recommendation_rows,
            page_size=1000,
        )

    print(f"Recomandari generate: {len(recommendation_rows)}")
    print("\nSkip stats:")
    for key, value in skipped_stats.items():
        print(f"  {key}: {value}")

    return len(recommendation_rows)


def print_summary(cur):
    rows = fetch_all(
        cur,
        """
        SELECT risk_level::text, status::text, COUNT(*) AS count,
               ROUND(SUM(net_savings), 2) AS total_net_savings,
               ROUND(MIN(confidence_score), 3) AS min_confidence,
               ROUND(AVG(confidence_score), 3) AS avg_confidence,
               ROUND(MAX(confidence_score), 3) AS max_confidence
        FROM transfer_recommendations
        GROUP BY risk_level, status
        ORDER BY risk_level, status;
        """,
    )

    print("\nRezumat transfer_recommendations:")
    if not rows:
        print("  Nu s-au generat recomandari.")
        return

    for row in rows:
        print(
            f"  {row['risk_level']} / {row['status']}: "
            f"{row['count']} recomandari, economii nete {row['total_net_savings']} RON, "
            f"confidence min/avg/max = {row['min_confidence']}/{row['avg_confidence']}/{row['max_confidence']}"
        )

    top_rows = fetch_all(
        cur,
        """
        SELECT
            sm.name AS source_hospital,
            dh.name AS destination_hospital,
            m.name AS medication,
            tr.recommended_quantity,
            tr.risk_level::text,
            tr.net_savings,
            tr.distance_km,
            tr.confidence_score,
            tr.recommended_transfer_date
        FROM transfer_recommendations tr
        JOIN hospitals sm ON sm.id = tr.source_hospital_id
        JOIN hospitals dh ON dh.id = tr.destination_hospital_id
        JOIN medications m ON m.id = tr.medication_id
        ORDER BY tr.risk_level DESC, tr.net_savings DESC
        LIMIT 10;
        """,
    )

    print("\nTop 10 recomandari:")
    for row in top_rows:
        print(
            f"  {row['medication']} | {row['source_hospital']} -> {row['destination_hospital']} | "
            f"qty={row['recommended_quantity']} | risk={row['risk_level']} | "
            f"confidence={row['confidence_score']} | savings={row['net_savings']} RON | "
            f"dist={row['distance_km']} km | date={row['recommended_transfer_date']}"
        )


def main():
    print("Pornesc recommendation engine...")

    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            count = generate_recommendations(cur)
            print_summary(cur)
            conn.commit()

    print("\nGata. Recommendation engine a rulat cu succes.")


if __name__ == "__main__":
    main()
