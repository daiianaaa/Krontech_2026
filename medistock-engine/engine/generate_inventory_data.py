"""
generate_inventory_data.py
Generator date dinamice pentru Medical Stock AI:
- transport_routes intre toate spitalele
- medication_batches doar pentru combinatii realiste spital/farmacie + medicament
- daily_consumption pe 90 zile pentru combinatii cu cerere estimata
- restock_orders pentru unele cazuri de reaprovizionare
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any

import psycopg2
import psycopg2.extras
from config.db_config import get_connection

# =========================
# CONFIG
# =========================

RANDOM_SEED = 42
HISTORY_DAYS = 90
TODAY = date.today()

random.seed(RANDOM_SEED)


@dataclass
class Hospital:
    id: str
    code: str
    name: str
    city: str
    county: str
    latitude: float | None
    longitude: float | None
    capacity_beds: int
    emergency_level: str
    has_icu: bool
    total_storage_capacity_units: int


@dataclass
class Medication:
    id: str
    code: str
    name: str
    category: str
    criticality: str
    required_storage_type: str
    controlled_substance: bool
    standard_daily_usage_per_patient: float


@dataclass
class Supplier:
    id: str
    code: str
    name: str
    average_delivery_days: float
    reliability_score: float

def fetch_all(cur, query: str, params: tuple[Any, ...] | None = None) -> list[dict[str, Any]]:
    cur.execute(query, params or ())
    return list(cur.fetchall())


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distanta aproximativa intre doua coordonate GPS."""
    radius = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return radius * c


def clear_dynamic_data(cur):
    """Sterge doar date generate, nu sterge spitale/medicamente/furnizori."""
    print("Curat datele dinamice existente...")
    cur.execute(
        """
        TRUNCATE TABLE
            alerts,
            transfer_recommendations,
            ai_predictions,
            ai_run_logs,
            inventory_transactions,
            daily_consumption,
            restock_orders,
            medication_batches,
            transport_routes
        RESTART IDENTITY CASCADE;
        """
    )

    cur.execute(
        """
        UPDATE hospital_storage_capabilities
        SET current_utilization_units = 0,
            updated_at = NOW();
        """
    )


def load_master_data(cur):
    hospitals_rows = fetch_all(
        cur,
        """
        SELECT id::text, code, name, city, county, latitude, longitude,
               capacity_beds, emergency_level::text, has_icu, total_storage_capacity_units
        FROM hospitals
        WHERE is_active = TRUE
        ORDER BY code;
        """,
    )

    medications_rows = fetch_all(
        cur,
        """
        SELECT id::text, code, name, category, criticality::text,
               required_storage_type::text, controlled_substance,
               standard_daily_usage_per_patient
        FROM medications
        WHERE is_active = TRUE
        ORDER BY code;
        """,
    )

    suppliers_rows = fetch_all(
        cur,
        """
        SELECT id::text, code, name, average_delivery_days, reliability_score
        FROM suppliers
        WHERE is_active = TRUE
        ORDER BY code;
        """,
    )

    storage_rows = fetch_all(
        cur,
        """
        SELECT hospital_id::text, storage_type::text, capacity_units
        FROM hospital_storage_capabilities
        WHERE is_validated = TRUE;
        """,
    )

    hospital_storage = {}
    for row in storage_rows:
        hospital_storage.setdefault(row["hospital_id"], set()).add(row["storage_type"])

    hospitals = [Hospital(**row) for row in hospitals_rows]
    medications = [Medication(**row) for row in medications_rows]
    suppliers = [Supplier(**row) for row in suppliers_rows]

    return hospitals, medications, suppliers, hospital_storage


def generate_transport_routes(cur, hospitals: list[Hospital]):
    print("Generez transport_routes...")

    rows = []
    for source in hospitals:
        for dest in hospitals:
            if source.id == dest.id:
                continue

            if source.latitude is not None and dest.latitude is not None:
                distance = haversine_km(
                    float(source.latitude),
                    float(source.longitude),
                    float(dest.latitude),
                    float(dest.longitude),
                )
            else:
                distance = random.uniform(20, 600)

            distance *= random.uniform(1.08, 1.35)
            estimated_hours = max(0.5, distance / random.uniform(55, 80))
            base_cost = 90 + distance * random.uniform(2.1, 3.4)

            supports_cold = random.random() < 0.78
            supports_frozen = random.random() < 0.35
            supports_controlled = random.random() < 0.70

            rows.append(
                (
                    source.id,
                    dest.id,
                    round(distance, 2),
                    round(estimated_hours, 2),
                    round(base_cost, 2),
                    supports_cold,
                    supports_frozen,
                    supports_controlled,
                )
            )

    psycopg2.extras.execute_values(
        cur,
        """
        INSERT INTO transport_routes (
            source_hospital_id, destination_hospital_id, distance_km, estimated_hours,
            base_transport_cost, supports_cold_chain, supports_frozen_chain,
            supports_controlled_transport
        ) VALUES %s;
        """,
        rows,
        page_size=1000,
    )

    print(f"  -> {len(rows)} rute generate")


def institution_can_store_medication(
    hospital: Hospital,
    medication: Medication,
    hospital_storage: dict[str, set[str]],
) -> bool:
    """Verifica daca institutia are storage valid pentru medicament."""
    available_storage = hospital_storage.get(hospital.id, set())
    return medication.required_storage_type in available_storage


def institution_should_have_current_stock(
    hospital: Hospital,
    medication: Medication,
    hospital_storage: dict[str, set[str]],
) -> bool:
    """Decide daca institutia are batch curent pentru medicament."""
    if not institution_can_store_medication(hospital, medication, hospital_storage):
        return False

    is_pharmacy = hospital.code.startswith("PHARM-") or hospital.name.lower().startswith("farmacia")

    if is_pharmacy:
        if medication.required_storage_type == "frozen":
            return random.random() < 0.05
        if medication.controlled_substance:
            return random.random() < 0.45
        if medication.criticality == "life_saving":
            return random.random() < 0.55
        if medication.category in {"ATI", "Anestezice", "Derivate sanguine"}:
            return random.random() < 0.20
        return random.random() < 0.82

    if hospital.emergency_level == "high":
        if medication.required_storage_type == "frozen":
            return random.random() < 0.78
        if medication.controlled_substance:
            return random.random() < 0.88
        return random.random() < 0.95

    if hospital.emergency_level == "medium":
        if medication.required_storage_type == "frozen":
            return random.random() < 0.38
        if medication.controlled_substance:
            return random.random() < 0.62
        if medication.criticality == "life_saving":
            return random.random() < 0.72
        return random.random() < 0.86

    if medication.required_storage_type in {"frozen", "controlled"}:
        return random.random() < 0.18
    if medication.criticality == "life_saving":
        return random.random() < 0.42
    return random.random() < 0.70


def institution_should_have_demand(
    hospital: Hospital,
    medication: Medication,
    has_current_stock: bool,
    hospital_storage: dict[str, set[str]],
) -> bool:
    """Decide daca generam consum istoric pentru forecast, chiar daca stocul curent este zero."""
    if has_current_stock:
        return True

    if not institution_can_store_medication(hospital, medication, hospital_storage):
        return False

    is_pharmacy = hospital.code.startswith("PHARM-") or hospital.name.lower().startswith("farmacia")

    if is_pharmacy:
        if medication.required_storage_type == "frozen":
            return False
        if medication.category in {"ATI", "Anestezice", "Derivate sanguine"}:
            return random.random() < 0.08
        return random.random() < 0.35

    if hospital.emergency_level == "high":
        return random.random() < 0.72
    if hospital.emergency_level == "medium":
        return random.random() < 0.50
    return random.random() < 0.28


def demand_factor_for_missing_stock(hospital: Hospital, medication: Medication) -> float:
    """Reduce cererea pentru institutii care au nevoie de medicament, dar nu au stoc curent."""
    is_pharmacy = hospital.code.startswith("PHARM-") or hospital.name.lower().startswith("farmacia")
    if is_pharmacy:
        return random.uniform(0.18, 0.45)
    if hospital.emergency_level == "high":
        return random.uniform(0.45, 0.90)
    if hospital.emergency_level == "medium":
        return random.uniform(0.30, 0.70)
    return random.uniform(0.15, 0.45)


def base_daily_demand(hospital: Hospital, medication: Medication) -> float:
    """Consum mediu estimat per zi, folosit doar pentru a genera date sintetice plauzibile."""
    standard_usage = float(medication.standard_daily_usage_per_patient or 0)
    hospital_size_factor = hospital.capacity_beds / 500

    emergency_factor = {
        "low": 0.75,
        "medium": 1.00,
        "high": 1.35,
    }.get(hospital.emergency_level, 1.0)

    criticality_factor = {
        "low": 0.75,
        "medium": 1.00,
        "high": 1.20,
        "life_saving": 1.35,
    }.get(medication.criticality, 1.0)

    category_factor = {
        "Fluide perfuzabile": 3.0,
        "Analgezice": 2.0,
        "Antibiotice": 1.35,
        "Cardiologie": 1.20,
        "Diabet": 1.10,
        "ATI": 0.90,
        "Vaccinuri": 0.55,
        "Derivate sanguine": 0.35,
        "Analgezice opioide": 0.45,
        "Sedative": 0.55,
        "Anestezice": 0.65,
    }.get(medication.category, 1.0)

    base = max(0.01, standard_usage)
    demand = base * hospital.capacity_beds * hospital_size_factor * emergency_factor * criticality_factor * category_factor
    return max(0.5, demand)


def choose_expiry_date(scenario: str) -> date:
    if scenario == "expiry_high":
        return TODAY + timedelta(days=random.randint(8, 28))
    if scenario == "expiry_mid":
        return TODAY + timedelta(days=random.randint(35, 85))
    if scenario == "long":
        return TODAY + timedelta(days=random.randint(120, 420))
    return TODAY + timedelta(days=random.randint(60, 240))


def choose_scenario(hospital: Hospital, medication: Medication) -> str:
    """
    Scenarii intentionate pentru AI:
    - expiry_high: stoc mare, expirare apropiata
    - shortage_high: stoc mic, consum mare
    - balanced: normal
    - long: stoc stabil si expirare indepartata
    """
    r = random.random()

    if hospital.capacity_beds < 300 and medication.required_storage_type in {"cold", "controlled", "frozen"}:
        if r < 0.35:
            return "shortage_high"

    if medication.criticality == "life_saving":
        if r < 0.18:
            return "shortage_high"
        if r < 0.28:
            return "expiry_mid"

    if r < 0.14:
        return "expiry_high"
    if r < 0.27:
        return "shortage_high"
    if r < 0.42:
        return "expiry_mid"
    if r < 0.72:
        return "balanced"
    return "long"


def price_for_medication(medication: Medication) -> tuple[float, float]:
    """Pret si cost de distrugere/unitate, sintetic."""
    category_price = {
        "Fluide perfuzabile": (4, 14),
        "Analgezice": (0.8, 8),
        "Analgezice opioide": (12, 45),
        "Antibiotice": (6, 90),
        "Diabet": (18, 130),
        "Anticoagulante": (15, 90),
        "Urgență": (5, 45),
        "ATI": (20, 180),
        "Cardiologie": (2, 35),
        "Corticosteroizi": (2, 25),
        "Antiemetice": (3, 30),
        "Gastroenterologie": (4, 35),
        "Respirator": (15, 80),
        "Anestezice": (20, 180),
        "Sedative": (15, 90),
        "Vaccinuri": (35, 160),
        "Derivate sanguine": (120, 900),
    }.get(medication.category, (3, 40))

    unit_price = random.uniform(*category_price)
    disposal_cost = max(0.5, unit_price * random.uniform(0.04, 0.15))
    return round(unit_price, 2), round(disposal_cost, 2)


def season_for_date(d: date) -> str:
    if d.month in {12, 1, 2}:
        return "winter"
    if d.month in {3, 4, 5}:
        return "spring"
    if d.month in {6, 7, 8}:
        return "summer"
    return "autumn"


def generate_batches_and_consumption(
    cur,
    hospitals: list[Hospital],
    medications: list[Medication],
    suppliers: list[Supplier],
    hospital_storage: dict[str, set[str]],
):
    print("Generez medication_batches si daily_consumption...")

    batch_rows = []
    consumption_rows = []
    restock_rows = []
    storage_utilization_delta: dict[tuple[str, str], int] = {}

    stocked_combinations = 0
    missing_with_demand_combinations = 0
    missing_without_demand_combinations = 0
    no_storage_combinations = 0

    for hospital in hospitals:
        for medication in medications:
            can_store = institution_can_store_medication(hospital, medication, hospital_storage)
            has_current_stock = institution_should_have_current_stock(hospital, medication, hospital_storage)
            has_demand_history = institution_should_have_demand(
                hospital=hospital,
                medication=medication,
                has_current_stock=has_current_stock,
                hospital_storage=hospital_storage,
            )

            if not can_store:
                no_storage_combinations += 1

            if has_current_stock:
                stocked_combinations += 1
            elif has_demand_history:
                missing_with_demand_combinations += 1
            else:
                missing_without_demand_combinations += 1
                continue

            daily_base = base_daily_demand(hospital, medication)
            if not has_current_stock:
                daily_base *= demand_factor_for_missing_stock(hospital, medication)

            scenario = choose_scenario(hospital, medication)
            if not has_current_stock:
                scenario = "shortage_high"

            if has_current_stock:
                if scenario == "expiry_high":
                    coverage_days = random.randint(45, 120)
                    expiry_scenario = "expiry_high"
                elif scenario == "expiry_mid":
                    coverage_days = random.randint(50, 110)
                    expiry_scenario = "expiry_mid"
                elif scenario == "shortage_high":
                    coverage_days = random.randint(2, 7)
                    expiry_scenario = random.choice(["balanced", "long"])
                elif scenario == "long":
                    coverage_days = random.randint(45, 120)
                    expiry_scenario = "long"
                else:
                    coverage_days = random.randint(18, 45)
                    expiry_scenario = "balanced"

                total_quantity_current = max(1, int(daily_base * coverage_days * random.uniform(0.75, 1.25)))
                total_quantity_initial = int(total_quantity_current * random.uniform(1.05, 1.55))

                batch_count = random.choices([1, 2, 3], weights=[0.55, 0.35, 0.10])[0]
                remaining_current = total_quantity_current
                remaining_initial = total_quantity_initial

                for batch_idx in range(1, batch_count + 1):
                    if batch_idx == batch_count:
                        q_current = max(0, remaining_current)
                        q_initial = max(q_current, remaining_initial)
                    else:
                        share = random.uniform(0.25, 0.65)
                        q_current = max(1, int(remaining_current * share))
                        q_initial = max(q_current, int(remaining_initial * share * random.uniform(1.05, 1.25)))

                    remaining_current -= q_current
                    remaining_initial -= q_initial

                    supplier = random.choice(suppliers)
                    expiry_date = choose_expiry_date(expiry_scenario)
                    received_date = TODAY - timedelta(days=random.randint(15, 180))
                    if received_date >= expiry_date:
                        received_date = expiry_date - timedelta(days=random.randint(30, 120))

                    price, disposal_cost = price_for_medication(medication)
                    batch_number = f"{medication.code}-{hospital.code}-B{batch_idx}-{random.randint(1000, 9999)}"
                    storage_condition = medication.required_storage_type

                    batch_rows.append(
                        (
                            medication.id,
                            hospital.id,
                            None,
                            supplier.id,
                            batch_number,
                            q_initial,
                            q_current,
                            expiry_date,
                            received_date,
                            price,
                            disposal_cost,
                            storage_condition,
                            "available",
                        )
                    )

                    storage_utilization_delta[(hospital.id, storage_condition)] = (
                        storage_utilization_delta.get((hospital.id, storage_condition), 0) + q_current
                    )

            if has_demand_history:
                for days_ago in range(HISTORY_DAYS, 0, -1):
                    current_day = TODAY - timedelta(days=days_ago)
                    weekday_factor = 0.88 if current_day.weekday() >= 5 else 1.0
                    seasonal_factor = 1.15 if medication.category in {"Antibiotice", "Respirator"} and current_day.month in {11, 12, 1, 2, 3} else 1.0
                    random_noise = random.uniform(0.65, 1.35)
                    trend_factor = 1 + ((HISTORY_DAYS - days_ago) / HISTORY_DAYS) * random.uniform(-0.10, 0.15)

                    if has_current_stock:
                        stockout_pressure = 1.0
                    else:
                        stockout_pressure = random.uniform(0.35, 0.80)

                    quantity_used = max(0, int(daily_base * weekday_factor * seasonal_factor * random_noise * trend_factor * stockout_pressure))
                    patients_count = max(1, int(hospital.capacity_beds * random.uniform(0.35, 0.92)))

                    if hospital.emergency_level == "high":
                        emergency_cases = int(random.uniform(20, 120))
                    elif hospital.emergency_level == "medium":
                        emergency_cases = int(random.uniform(5, 45))
                    else:
                        emergency_cases = int(random.uniform(0, 12))

                    consumption_rows.append(
                        (
                            hospital.id,
                            None,
                            medication.id,
                            current_day,
                            quantity_used,
                            patients_count,
                            emergency_cases,
                            season_for_date(current_day),
                        )
                    )

            should_create_restock = (
                scenario == "shortage_high"
                or not has_current_stock
                or (medication.criticality == "life_saving" and random.random() < 0.20)
            )

            if can_store and has_demand_history and should_create_restock and random.random() < 0.55:
                supplier = random.choice(suppliers)
                requested_quantity = max(20, int(daily_base * random.randint(20, 55)))
                expected_date = TODAY + timedelta(days=random.randint(1, 12))
                status = random.choices(
                    ["planned", "ordered", "in_transit", "delayed"],
                    weights=[0.25, 0.35, 0.30, 0.10],
                )[0]
                unit_price, _ = price_for_medication(medication)

                if has_current_stock:
                    note = f"Restock generat pentru scenariul {scenario}"
                else:
                    note = "Restock generat pentru medicament fara stoc curent"

                restock_rows.append(
                    (
                        hospital.id,
                        medication.id,
                        supplier.id,
                        requested_quantity,
                        expected_date,
                        status,
                        unit_price,
                        note,
                    )
                )

    if batch_rows:
        psycopg2.extras.execute_values(
            cur,
            """
            INSERT INTO medication_batches (
                medication_id, hospital_id, department_id, supplier_id,
                batch_number, quantity_initial, quantity_current,
                expiry_date, received_date,
                purchase_price_per_unit, disposal_cost_per_unit,
                storage_condition, status
            ) VALUES %s;
            """,
            batch_rows,
            page_size=2000,
        )

    if consumption_rows:
        psycopg2.extras.execute_values(
            cur,
            """
            INSERT INTO daily_consumption (
                hospital_id, department_id, medication_id, consumption_date,
                quantity_used, patients_count, emergency_cases, season
            ) VALUES %s;
            """,
            consumption_rows,
            page_size=5000,
        )

    if restock_rows:
        psycopg2.extras.execute_values(
            cur,
            """
            INSERT INTO restock_orders (
                hospital_id, medication_id, supplier_id, requested_quantity,
                expected_delivery_date, status, unit_price, notes
            ) VALUES %s;
            """,
            restock_rows,
            page_size=1000,
        )

    for (hospital_id, storage_type), qty in storage_utilization_delta.items():
        cur.execute(
            """
            UPDATE hospital_storage_capabilities
            SET current_utilization_units = LEAST(capacity_units, current_utilization_units + %s),
                updated_at = NOW()
            WHERE hospital_id = %s
              AND storage_type = %s;
            """,
            (qty, hospital_id, storage_type),
        )

    print(f"  -> {len(batch_rows)} batch-uri generate")
    print(f"  -> {len(consumption_rows)} randuri daily_consumption generate")
    print(f"  -> {len(restock_rows)} restock_orders generate")
    print("\nAcoperire medicamente per institutie:")
    print(f"  -> combinatii cu stoc curent: {stocked_combinations}")
    print(f"  -> combinatii fara stoc, dar cu cerere istorica: {missing_with_demand_combinations}")
    print(f"  -> combinatii fara stoc si fara cerere: {missing_without_demand_combinations}")
    print(f"  -> combinatii blocate din lipsa de storage: {no_storage_combinations}")


def print_summary(cur):
    print("\nRezumat date generate:")
    queries = [
        ("hospitals", "SELECT COUNT(*) AS count FROM hospitals"),
        ("medications", "SELECT COUNT(*) AS count FROM medications"),
        ("medication_batches", "SELECT COUNT(*) AS count FROM medication_batches"),
        ("daily_consumption", "SELECT COUNT(*) AS count FROM daily_consumption"),
        ("restock_orders", "SELECT COUNT(*) AS count FROM restock_orders"),
        ("transport_routes", "SELECT COUNT(*) AS count FROM transport_routes"),
    ]

    for label, query in queries:
        cur.execute(query)
        row = cur.fetchone()
        print(f"  {label}: {row['count']}")

    cur.execute(
        """
        SELECT storage_condition::text AS storage_condition, COUNT(*) AS count
        FROM medication_batches
        GROUP BY storage_condition
        ORDER BY storage_condition;
        """
    )
    print("\nBatch-uri pe tip de storage:")
    for row in cur.fetchall():
        print(f"  {row['storage_condition']}: {row['count']}")

    cur.execute(
        """
        SELECT
            COUNT(*) AS institution_medication_pairs,
            COUNT(*) FILTER (WHERE total_current_stock > 0) AS pairs_with_stock,
            COUNT(*) FILTER (WHERE total_current_stock = 0) AS pairs_without_stock
        FROM v_inventory_overview;
        """
    )
    row = cur.fetchone()
    print("\nAcoperire spital/farmacie + medicament:")
    print(f"  combinatii totale: {row['institution_medication_pairs']}")
    print(f"  cu stoc curent: {row['pairs_with_stock']}")
    print(f"  fara stoc curent: {row['pairs_without_stock']}")

    cur.execute(
        """
        SELECT
            COUNT(*) FILTER (WHERE expiry_date <= CURRENT_DATE + INTERVAL '30 days') AS expiring_30_days,
            COUNT(*) FILTER (WHERE expiry_date > CURRENT_DATE + INTERVAL '30 days'
                             AND expiry_date <= CURRENT_DATE + INTERVAL '90 days') AS expiring_31_90_days,
            COUNT(*) FILTER (WHERE expiry_date > CURRENT_DATE + INTERVAL '90 days') AS expiring_after_90_days
        FROM medication_batches
        WHERE status = 'available';
        """
    )
    row = cur.fetchone()
    print("\nExpirari batch-uri:")
    print(f"  <= 30 zile: {row['expiring_30_days']}")
    print(f"  31-90 zile: {row['expiring_31_90_days']}")
    print(f"  > 90 zile: {row['expiring_after_90_days']}")


def main():
    print("Pornesc generatorul de date pentru medical_stock_ai...")

    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            clear_dynamic_data(cur)
            hospitals, medications, suppliers, hospital_storage = load_master_data(cur)

            if len(hospitals) < 20:
                raise RuntimeError(f"Ai doar {len(hospitals)} spitale. Ruleaza 02_seed_static_data inainte.")
            if len(medications) < 30:
                raise RuntimeError(f"Ai doar {len(medications)} medicamente. Ruleaza 02_seed_static_data inainte.")
            if not suppliers:
                raise RuntimeError("Nu exista furnizori. Ruleaza 02_seed_static_data inainte.")

            generate_transport_routes(cur, hospitals)
            generate_batches_and_consumption(cur, hospitals, medications, suppliers, hospital_storage)
            print_summary(cur)

        conn.commit()

    print("\nGata. Datele dinamice au fost generate cu succes.")


if __name__ == "__main__":
    main()
