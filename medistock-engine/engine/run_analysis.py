"""
run_analysis.py
AI engine pentru Medical Stock AI.

Ce face:
1. Creeaza un ai_run_logs.
2. Calculeaza forecast simplu pe baza daily_consumption:
   predicted_daily_demand = avg_7d * 0.50 + avg_30d * 0.30 + avg_90d * 0.20
3. Calculeaza shortage risk pe fiecare spital + medicament.
4. Calculeaza expiry risk pe fiecare batch.
5. Tine cont de restock_orders care ajung la timp.
6. Calculeaza confidence_score din simularea incertitudinii consumului, nu din valori fixe.
7. Scrie rezultatele in ai_predictions si alerts.

Nota despre confidence_score:
- Nu este hardcodat.
- Este calculat prin simulari Monte Carlo pe baza istoricului daily_consumption.
- Reprezinta cat de des ramane acelasi risk_level cand cererea viitoare variaza realist.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent

if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import hashlib
import random
from dataclasses import dataclass
from datetime import date
from typing import Any

import psycopg2
import psycopg2.extras
from config.db_config import get_connection

# =========================
# CONFIG
# =========================

TODAY = date.today()

DEFAULT_MIN_BUFFER_DAYS = 7
DEFAULT_TARGET_BUFFER_DAYS = 30

RESTOCK_STATUSES_ACTIVE = ("planned", "ordered", "in_transit")

CONFIDENCE_SIMULATIONS = 250
MIN_SIMULATED_DEMAND = 0.01


@dataclass
class DemandUncertainty:
    mean_value: float
    stdev_value: float
    days_available: int

@dataclass
class Forecast:
    hospital_id: str
    medication_id: str
    avg_7d: float
    avg_30d: float
    avg_90d: float
    predicted_daily_demand: float


@dataclass
class StockRecord:
    hospital_id: str
    medication_id: str
    current_stock: int
    nearest_expiry: date | None


@dataclass
class Threshold:
    hospital_id: str
    medication_id: str
    min_buffer_days: int
    target_buffer_days: int
    max_buffer_days: int


def fetch_all(cur, query: str, params: tuple[Any, ...] | None = None) -> list[dict[str, Any]]:
    cur.execute(query, params or ())
    return list(cur.fetchall())


def create_ai_run(cur) -> str:
    cur.execute(
        """
        INSERT INTO ai_run_logs (status, started_at, input_summary)
        VALUES ('running', NOW(), %s)
        RETURNING id::text;
        """,
        (psycopg2.extras.Json({"today": str(TODAY), "engine": "rule_based_v2_monte_carlo_confidence"}),),
    )
    return cur.fetchone()["id"]


def finish_ai_run(
    cur,
    ai_run_id: str,
    status: str,
    output_summary: dict[str, Any] | None = None,
    error_message: str | None = None,
):
    cur.execute(
        """
        UPDATE ai_run_logs
        SET status = %s,
            finished_at = NOW(),
            output_summary = %s,
            error_message = %s
        WHERE id = %s;
        """,
        (status, psycopg2.extras.Json(output_summary or {}), error_message, ai_run_id),
    )


def clear_previous_ai_outputs(cur):
    """Sterge rezultatele AI vechi, dar pastreaza datele operationale."""
    # Nu folosim TRUNCATE CASCADE deoarece acesta sterge si tabelele care au foreign keys active
    # (cum ar fi transfer_requests si inbox_messages). Folosim DELETE in ordinea cheilor straine.
    cur.execute("DELETE FROM alerts;")
    cur.execute("DELETE FROM ai_predictions;")
    cur.execute("DELETE FROM transfer_recommendations;")
    cur.execute("DELETE FROM ai_run_logs;")


def stable_seed(*parts: object) -> int:
    """Genereaza un seed stabil pentru rezultate reproductibile."""
    raw = "|".join(str(part) for part in parts)
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    return int(digest[:12], 16)


def clamp(value: float, minimum: float = 0.0, maximum: float = 1.0) -> float:
    return max(minimum, min(maximum, value))


def load_forecasts(cur) -> dict[tuple[str, str], Forecast]:
    """Forecast simplu: 50% media 7 zile, 30% media 30 zile, 20% media 90 zile."""
    rows = fetch_all(
        cur,
        """
        WITH base AS (
            SELECT
                hospital_id,
                medication_id,
                consumption_date,
                quantity_used
            FROM daily_consumption
            WHERE consumption_date >= CURRENT_DATE - INTERVAL '90 days'
        ),
        agg AS (
            SELECT
                hospital_id,
                medication_id,
                AVG(quantity_used) FILTER (WHERE consumption_date >= CURRENT_DATE - INTERVAL '7 days') AS avg_7d,
                AVG(quantity_used) FILTER (WHERE consumption_date >= CURRENT_DATE - INTERVAL '30 days') AS avg_30d,
                AVG(quantity_used) AS avg_90d
            FROM base
            GROUP BY hospital_id, medication_id
        )
        SELECT
            hospital_id::text,
            medication_id::text,
            COALESCE(avg_7d, avg_30d, avg_90d, 0) AS avg_7d,
            COALESCE(avg_30d, avg_7d, avg_90d, 0) AS avg_30d,
            COALESCE(avg_90d, avg_30d, avg_7d, 0) AS avg_90d
        FROM agg;
        """,
    )

    forecasts: dict[tuple[str, str], Forecast] = {}
    for row in rows:
        avg_7d = float(row["avg_7d"] or 0)
        avg_30d = float(row["avg_30d"] or 0)
        avg_90d = float(row["avg_90d"] or 0)
        predicted = avg_7d * 0.50 + avg_30d * 0.30 + avg_90d * 0.20
        predicted = max(predicted, MIN_SIMULATED_DEMAND)

        key = (row["hospital_id"], row["medication_id"])
        forecasts[key] = Forecast(
            hospital_id=row["hospital_id"],
            medication_id=row["medication_id"],
            avg_7d=avg_7d,
            avg_30d=avg_30d,
            avg_90d=avg_90d,
            predicted_daily_demand=predicted,
        )

    return forecasts


def load_consumption_history(cur) -> dict[tuple[str, str], list[int]]:
    """Incarca istoricul zilnic folosit pentru incertitudine si confidence."""
    rows = fetch_all(
        cur,
        """
        SELECT
            hospital_id::text,
            medication_id::text,
            consumption_date,
            quantity_used
        FROM daily_consumption
        WHERE consumption_date >= CURRENT_DATE - INTERVAL '90 days'
        ORDER BY hospital_id, medication_id, consumption_date;
        """,
    )

    history: dict[tuple[str, str], list[int]] = {}
    for row in rows:
        key = (row["hospital_id"], row["medication_id"])
        history.setdefault(key, []).append(int(row["quantity_used"] or 0))

    return history


def load_current_stock(cur) -> dict[tuple[str, str], StockRecord]:
    rows = fetch_all(
        cur,
        """
        SELECT
            hospital_id::text,
            medication_id::text,
            SUM(quantity_current)::int AS current_stock,
            MIN(expiry_date) AS nearest_expiry
        FROM medication_batches
        WHERE status = 'available'
        GROUP BY hospital_id, medication_id;
        """,
    )

    stocks: dict[tuple[str, str], StockRecord] = {}
    for row in rows:
        key = (row["hospital_id"], row["medication_id"])
        stocks[key] = StockRecord(
            hospital_id=row["hospital_id"],
            medication_id=row["medication_id"],
            current_stock=int(row["current_stock"] or 0),
            nearest_expiry=row["nearest_expiry"],
        )
    return stocks


def load_thresholds(cur) -> dict[tuple[str, str], Threshold]:
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

    thresholds: dict[tuple[str, str], Threshold] = {}
    for row in rows:
        key = (row["hospital_id"], row["medication_id"])
        thresholds[key] = Threshold(
            hospital_id=row["hospital_id"],
            medication_id=row["medication_id"],
            min_buffer_days=int(row["min_buffer_days"]),
            target_buffer_days=int(row["target_buffer_days"]),
            max_buffer_days=int(row["max_buffer_days"]),
        )
    return thresholds


def load_active_restock(cur) -> dict[tuple[str, str], list[dict[str, Any]]]:
    rows = fetch_all(
        cur,
        """
        SELECT
            hospital_id::text,
            medication_id::text,
            requested_quantity,
            expected_delivery_date,
            status::text
        FROM restock_orders
        WHERE status IN ('planned', 'ordered', 'in_transit')
          AND expected_delivery_date >= CURRENT_DATE;
        """,
    )

    restocks: dict[tuple[str, str], list[dict[str, Any]]] = {}
    for row in rows:
        key = (row["hospital_id"], row["medication_id"])
        restocks.setdefault(key, []).append(row)
    return restocks


def classify_shortage_risk(stock_coverage_days: float) -> str:
    if stock_coverage_days <= 7:
        return "HIGH"
    if stock_coverage_days <= 14:
        return "MID"
    if stock_coverage_days <= 30:
        return "LOW"
    return "OK"


def classify_expiry_risk(days_to_expiry: int, estimated_expired_quantity: int) -> str:
    if estimated_expired_quantity <= 0:
        return "OK"
    if days_to_expiry < 0:
        return "HIGH"
    if days_to_expiry <= 30:
        return "HIGH"
    if days_to_expiry <= 90:
        return "MID"
    return "LOW"


def calculate_effective_stock_coverage(
    current_stock: int,
    predicted_daily_demand: float,
    restocks: list[dict[str, Any]],
) -> tuple[float, int, int]:
    """
    Returneaza:
    - acoperire in zile dupa restock-uri care ajung inainte de epuizare
    - cantitate incoming considerata
    - zile pana la primul restock considerat
    """
    if predicted_daily_demand <= 0:
        return 9999.0, 0, 9999

    raw_days_until_stockout = current_stock / predicted_daily_demand
    incoming_quantity = 0
    first_restock_days = 9999

    for restock in restocks:
        expected_date = restock["expected_delivery_date"]
        days_until_delivery = (expected_date - TODAY).days
        if days_until_delivery < 0:
            continue

        if days_until_delivery <= raw_days_until_stockout + 1:
            incoming_quantity += int(restock["requested_quantity"] or 0)
            first_restock_days = min(first_restock_days, days_until_delivery)

    effective_stock = current_stock + incoming_quantity
    effective_coverage = effective_stock / predicted_daily_demand
    return effective_coverage, incoming_quantity, first_restock_days


def daily_demand_uncertainty(history_values: list[int], forecast: Forecast | None) -> DemandUncertainty:
    """
    Calculeaza media, deviatia standard si numarul de zile.
    Varianta rapida, fara statistics.stdev, ca sa nu incetineasca simularile.
    """
    predicted = forecast.predicted_daily_demand if forecast else MIN_SIMULATED_DEMAND
    values = [float(value) for value in history_values if value is not None]
    days_available = len(values)

    if days_available >= 2:
        mean_value = sum(values) / days_available
        variance = sum((value - mean_value) ** 2 for value in values) / (days_available - 1)
        stdev_value = variance ** 0.5
    elif days_available == 1:
        mean_value = values[0]
        stdev_value = max(predicted * 0.25, 1.0)
    else:
        mean_value = predicted
        stdev_value = max(predicted * 0.45, 1.0)

    mean_value = max(mean_value, MIN_SIMULATED_DEMAND)

    minimum_stdev = max(mean_value * 0.08, 0.5)
    stdev_value = max(float(stdev_value), minimum_stdev)

    maximum_stdev = max(mean_value * 1.25, 1.0)
    stdev_value = min(stdev_value, maximum_stdev)

    return DemandUncertainty(
        mean_value=mean_value,
        stdev_value=stdev_value,
        days_available=days_available,
    )


def sample_future_daily_demand(
    rng: random.Random,
    forecast: Forecast | None,
    uncertainty: DemandUncertainty,
) -> float:
    """
    Genereaza o cerere zilnica viitoare plauzibila.
    Foloseste uncertainty pre-calculat, ca sa nu recalculam stdev la fiecare simulare.
    """
    predicted = forecast.predicted_daily_demand if forecast else MIN_SIMULATED_DEMAND

    center = predicted * 0.70 + uncertainty.mean_value * 0.30

    if uncertainty.days_available < 14:
        uncertainty_multiplier = 1.45
    elif uncertainty.days_available < 30:
        uncertainty_multiplier = 1.25
    elif uncertainty.days_available < 60:
        uncertainty_multiplier = 1.10
    else:
        uncertainty_multiplier = 1.00

    stdev = uncertainty.stdev_value * uncertainty_multiplier

    simulated = rng.gauss(center, stdev)
    return max(MIN_SIMULATED_DEMAND, simulated)


def confidence_from_votes(same_risk_count: int, total_simulations: int, days_available: int) -> float:
    """
    Calculeaza confidence din cate simulari confirma acelasi risk_level.
    Foloseste smoothing ca sa evite 0.000 sau 1.000 perfecte.
    """
    if total_simulations <= 0:
        return 0.50

    confidence = (same_risk_count + 1) / (total_simulations + 2)

    if days_available < 14:
        confidence *= 0.86
    elif days_available < 30:
        confidence *= 0.92
    elif days_available < 60:
        confidence *= 0.96

    return round(clamp(confidence, 0.05, 0.999), 3)


def calculate_shortage_confidence(
    key: tuple[str, str],
    forecast: Forecast,
    target_risk: str,
    current_stock: int,
    restocks: list[dict[str, Any]],
    history_values: list[int],
) -> tuple[float, dict[str, Any]]:
    """Confidence real derivat din simulari de consum viitor pentru shortage risk."""
    rng = random.Random(stable_seed("shortage", key[0], key[1], TODAY))
    uncertainty = daily_demand_uncertainty(history_values, forecast)

    same_risk_count = 0
    simulated_coverages: list[float] = []

    for _ in range(CONFIDENCE_SIMULATIONS):
        simulated_demand = sample_future_daily_demand(
            rng=rng,
            forecast=forecast,
            uncertainty=uncertainty,
        )

        effective_coverage, _, _ = calculate_effective_stock_coverage(
            current_stock=current_stock,
            predicted_daily_demand=simulated_demand,
            restocks=restocks,
        )

        simulated_risk = classify_shortage_risk(effective_coverage)
        simulated_coverages.append(effective_coverage)

        if simulated_risk == target_risk:
            same_risk_count += 1

    confidence = confidence_from_votes(
        same_risk_count=same_risk_count,
        total_simulations=CONFIDENCE_SIMULATIONS,
        days_available=uncertainty.days_available,
    )

    sorted_coverages = sorted(simulated_coverages)
    p10 = sorted_coverages[int(0.10 * (len(sorted_coverages) - 1))]
    p50 = sorted_coverages[int(0.50 * (len(sorted_coverages) - 1))]
    p90 = sorted_coverages[int(0.90 * (len(sorted_coverages) - 1))]

    details = {
        "confidence_method": "monte_carlo_same_risk_ratio",
        "confidence_simulations": CONFIDENCE_SIMULATIONS,
        "confidence_same_risk_count": same_risk_count,
        "confidence_days_available": uncertainty.days_available,
        "demand_uncertainty_mean": round(uncertainty.mean_value, 4),
        "demand_uncertainty_stdev": round(uncertainty.stdev_value, 4),
        "simulated_coverage_p10": round(p10, 4),
        "simulated_coverage_p50": round(p50, 4),
        "simulated_coverage_p90": round(p90, 4),
    }

    return confidence, details


def calculate_expiry_confidence(
    key: tuple[str, str],
    forecast: Forecast | None,
    target_risk: str,
    quantity_current: int,
    days_to_expiry: int,
    history_values: list[int],
) -> tuple[float, dict[str, Any]]:
    """Confidence real derivat din simulari de consum viitor pentru expiry risk."""
    rng = random.Random(stable_seed("expiry", key[0], key[1], quantity_current, days_to_expiry, TODAY))
    uncertainty = daily_demand_uncertainty(history_values, forecast)

    same_risk_count = 0
    simulated_expired_quantities: list[int] = []

    safe_days_to_expiry = max(days_to_expiry, 0)

    for _ in range(CONFIDENCE_SIMULATIONS):
        simulated_daily_demand = sample_future_daily_demand(
            rng=rng,
            forecast=forecast,
            uncertainty=uncertainty,
        )

        simulated_consumption_until_expiry = simulated_daily_demand * safe_days_to_expiry
        simulated_expired_quantity = max(0, int(quantity_current - simulated_consumption_until_expiry))
        simulated_risk = classify_expiry_risk(days_to_expiry, simulated_expired_quantity)

        simulated_expired_quantities.append(simulated_expired_quantity)

        if simulated_risk == target_risk:
            same_risk_count += 1

    confidence = confidence_from_votes(
        same_risk_count=same_risk_count,
        total_simulations=CONFIDENCE_SIMULATIONS,
        days_available=uncertainty.days_available,
    )

    sorted_quantities = sorted(simulated_expired_quantities)
    p10 = sorted_quantities[int(0.10 * (len(sorted_quantities) - 1))]
    p50 = sorted_quantities[int(0.50 * (len(sorted_quantities) - 1))]
    p90 = sorted_quantities[int(0.90 * (len(sorted_quantities) - 1))]

    details = {
        "confidence_method": "monte_carlo_same_risk_ratio",
        "confidence_simulations": CONFIDENCE_SIMULATIONS,
        "confidence_same_risk_count": same_risk_count,
        "confidence_days_available": uncertainty.days_available,
        "demand_uncertainty_mean": round(uncertainty.mean_value, 4),
        "demand_uncertainty_stdev": round(uncertainty.stdev_value, 4),
        "simulated_expired_quantity_p10": p10,
        "simulated_expired_quantity_p50": p50,
        "simulated_expired_quantity_p90": p90,
    }

    return confidence, details

def save_shortage_predictions(
    cur,
    ai_run_id: str,
    forecasts: dict[tuple[str, str], Forecast],
    stocks: dict[tuple[str, str], StockRecord],
    thresholds: dict[tuple[str, str], Threshold],
    active_restocks: dict[tuple[str, str], list[dict[str, Any]]],
    consumption_history: dict[tuple[str, str], list[int]],
) -> int:
    prediction_rows = []
    alert_rows = []

    for key, forecast in forecasts.items():
        stock = stocks.get(key)
        current_stock = stock.current_stock if stock else 0
        restocks = active_restocks.get(key, [])

        effective_coverage, incoming_quantity, first_restock_days = calculate_effective_stock_coverage(
            current_stock=current_stock,
            predicted_daily_demand=forecast.predicted_daily_demand,
            restocks=restocks,
        )

        risk = classify_shortage_risk(effective_coverage)
        threshold = thresholds.get(key)
        min_buffer = threshold.min_buffer_days if threshold else DEFAULT_MIN_BUFFER_DAYS
        target_buffer = threshold.target_buffer_days if threshold else DEFAULT_TARGET_BUFFER_DAYS

        history_values = consumption_history.get(key, [])
        confidence_score, confidence_details = calculate_shortage_confidence(
            key=key,
            forecast=forecast,
            target_risk=risk,
            current_stock=current_stock,
            restocks=restocks,
            history_values=history_values,
        )

        if risk == "OK":
            text = (
                f"Stoc suficient pentru aproximativ {effective_coverage:.1f} zile. "
                f"Consum estimat: {forecast.predicted_daily_demand:.2f} unitati/zi."
            )
        else:
            text = (
                f"Risc {risk}: stoc curent {current_stock} unitati, acoperire estimata {effective_coverage:.1f} zile. "
                f"Consum estimat: {forecast.predicted_daily_demand:.2f} unitati/zi. "
                f"Buffer minim recomandat: {min_buffer} zile."
            )
            if incoming_quantity > 0:
                text += f" Exista restock de {incoming_quantity} unitati in aproximativ {first_restock_days} zile."

        input_snapshot = {
            "avg_7d": forecast.avg_7d,
            "avg_30d": forecast.avg_30d,
            "avg_90d": forecast.avg_90d,
            "current_stock": current_stock,
            "incoming_restock_quantity": incoming_quantity,
            "first_restock_days": first_restock_days,
            "target_buffer_days": target_buffer,
            **confidence_details,
        }

        prediction_rows.append(
            (
                ai_run_id,
                forecast.hospital_id,
                None,
                forecast.medication_id,
                None,
                "SHORTAGE_RISK",
                risk,
                round(forecast.predicted_daily_demand, 4),
                round(effective_coverage, 4),
                None,
                None,
                confidence_score,
                text,
                psycopg2.extras.Json(input_snapshot),
            )
        )

        if risk in {"HIGH", "MID"}:
            alert_rows.append(
                (
                    ai_run_id,
                    forecast.hospital_id,
                    forecast.medication_id,
                    None,
                    "SHORTAGE_RISK",
                    risk,
                    f"Risc de lipsa stoc: {risk}",
                    text,
                    "new",
                )
            )

    if prediction_rows:
        psycopg2.extras.execute_values(
            cur,
            """
            INSERT INTO ai_predictions (
                ai_run_id, hospital_id, department_id, medication_id, batch_id,
                prediction_type, risk_level, predicted_daily_demand, stock_coverage_days,
                days_to_expiry, estimated_expired_quantity, confidence_score,
                recommendation_text, input_snapshot
            ) VALUES %s;
            """,
            prediction_rows,
            page_size=2000,
        )

    if alert_rows:
        psycopg2.extras.execute_values(
            cur,
            """
            INSERT INTO alerts (
                ai_run_id, hospital_id, medication_id, batch_id,
                alert_type, severity, title, message, status
            ) VALUES %s;
            """,
            alert_rows,
            page_size=1000,
        )

    return len(prediction_rows)


def save_expiry_predictions(
    cur,
    ai_run_id: str,
    forecasts: dict[tuple[str, str], Forecast],
    consumption_history: dict[tuple[str, str], list[int]],
) -> int:
    batches = fetch_all(
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
            m.name AS medication_name,
            h.name AS hospital_name
        FROM medication_batches b
        JOIN medications m ON m.id = b.medication_id
        JOIN hospitals h ON h.id = b.hospital_id
        WHERE b.status = 'available';
        """,
    )

    prediction_rows = []
    alert_rows = []

    for batch in batches:
        key = (batch["hospital_id"], batch["medication_id"])
        forecast = forecasts.get(key)
        daily_demand = forecast.predicted_daily_demand if forecast else MIN_SIMULATED_DEMAND

        days_to_expiry = (batch["expiry_date"] - TODAY).days
        predicted_consumption_until_expiry = max(0, daily_demand * max(days_to_expiry, 0))
        quantity_current = int(batch["quantity_current"] or 0)
        estimated_expired_quantity = max(0, int(quantity_current - predicted_consumption_until_expiry))
        risk = classify_expiry_risk(days_to_expiry, estimated_expired_quantity)

        history_values = consumption_history.get(key, [])
        confidence_score, confidence_details = calculate_expiry_confidence(
            key=key,
            forecast=forecast,
            target_risk=risk,
            quantity_current=quantity_current,
            days_to_expiry=days_to_expiry,
            history_values=history_values,
        )

        text = (
            f"Batch {batch['batch_number']} are {quantity_current} unitati si expira in {days_to_expiry} zile. "
            f"Consum estimat pana la expirare: {predicted_consumption_until_expiry:.1f} unitati. "
            f"Cantitate estimata la risc de expirare: {estimated_expired_quantity} unitati."
        )

        input_snapshot = {
            "batch_number": batch["batch_number"],
            "quantity_current": quantity_current,
            "predicted_consumption_until_expiry": predicted_consumption_until_expiry,
            "purchase_price_per_unit": float(batch["purchase_price_per_unit"] or 0),
            "disposal_cost_per_unit": float(batch["disposal_cost_per_unit"] or 0),
            **confidence_details,
        }

        prediction_rows.append(
            (
                ai_run_id,
                batch["hospital_id"],
                None,
                batch["medication_id"],
                batch["batch_id"],
                "EXPIRY_RISK",
                risk,
                round(daily_demand, 4),
                None,
                days_to_expiry,
                estimated_expired_quantity,
                confidence_score,
                text,
                psycopg2.extras.Json(input_snapshot),
            )
        )

        if risk in {"HIGH", "MID"}:
            alert_rows.append(
                (
                    ai_run_id,
                    batch["hospital_id"],
                    batch["medication_id"],
                    batch["batch_id"],
                    "EXPIRY_RISK",
                    risk,
                    f"Risc expirare batch: {risk}",
                    text,
                    "new",
                )
            )

    if prediction_rows:
        psycopg2.extras.execute_values(
            cur,
            """
            INSERT INTO ai_predictions (
                ai_run_id, hospital_id, department_id, medication_id, batch_id,
                prediction_type, risk_level, predicted_daily_demand, stock_coverage_days,
                days_to_expiry, estimated_expired_quantity, confidence_score,
                recommendation_text, input_snapshot
            ) VALUES %s;
            """,
            prediction_rows,
            page_size=2000,
        )

    if alert_rows:
        psycopg2.extras.execute_values(
            cur,
            """
            INSERT INTO alerts (
                ai_run_id, hospital_id, medication_id, batch_id,
                alert_type, severity, title, message, status
            ) VALUES %s;
            """,
            alert_rows,
            page_size=1000,
        )

    return len(prediction_rows)


def print_summary(cur):
    rows = fetch_all(
        cur,
        """
        SELECT prediction_type::text, risk_level::text, COUNT(*) AS count,
               ROUND(MIN(confidence_score), 3) AS min_confidence,
               ROUND(AVG(confidence_score), 3) AS avg_confidence,
               ROUND(MAX(confidence_score), 3) AS max_confidence
        FROM ai_predictions
        GROUP BY prediction_type, risk_level
        ORDER BY prediction_type, risk_level;
        """,
    )

    print("\nRezumat ai_predictions:")
    for row in rows:
        print(
            f"  {row['prediction_type']} - {row['risk_level']}: {row['count']} "
            f"| confidence min/avg/max = {row['min_confidence']}/{row['avg_confidence']}/{row['max_confidence']}"
        )

    alert_rows = fetch_all(
        cur,
        """
        SELECT alert_type, severity::text, COUNT(*) AS count
        FROM alerts
        GROUP BY alert_type, severity
        ORDER BY alert_type, severity;
        """,
    )

    print("\nRezumat alerts:")
    if not alert_rows:
        print("  Nu exista alerte.")
    for row in alert_rows:
        print(f"  {row['alert_type']} - {row['severity']}: {row['count']}")


def run_ai_analysis():
    print("Pornesc AI analysis v2 cu confidence Monte Carlo...")

    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            clear_previous_ai_outputs(cur)
            ai_run_id = create_ai_run(cur)

            try:
                forecasts = load_forecasts(cur)
                consumption_history = load_consumption_history(cur)
                stocks = load_current_stock(cur)
                thresholds = load_thresholds(cur)
                active_restocks = load_active_restock(cur)

                shortage_count = save_shortage_predictions(
                    cur=cur,
                    ai_run_id=ai_run_id,
                    forecasts=forecasts,
                    stocks=stocks,
                    thresholds=thresholds,
                    active_restocks=active_restocks,
                    consumption_history=consumption_history,
                )

                expiry_count = save_expiry_predictions(
                    cur=cur,
                    ai_run_id=ai_run_id,
                    forecasts=forecasts,
                    consumption_history=consumption_history,
                )

                output_summary = {
                    "forecasts": len(forecasts),
                    "consumption_history_keys": len(consumption_history),
                    "shortage_predictions": shortage_count,
                    "expiry_predictions": expiry_count,
                    "confidence_method": "monte_carlo_same_risk_ratio",
                    "confidence_simulations": CONFIDENCE_SIMULATIONS,
                    "today": str(TODAY),
                }

                finish_ai_run(cur, ai_run_id, "success", output_summary)
                print_summary(cur)
                conn.commit()

                print("\nGata. AI analysis v2 a rulat cu succes.")
                print(f"AI run id: {ai_run_id}")

            except Exception as exc:
                finish_ai_run(cur, ai_run_id, "failed", error_message=str(exc))
                conn.commit()
                raise


if __name__ == "__main__":
    run_ai_analysis()