"""
ai_service.py
FastAPI service pentru AI Engine cu auto-refresh controlat.

Ce face:
1. Expune endpoint-uri manuale:
   - GET  /health
   - GET  /summary
   - GET  /counts
   - GET  /refresh-state
   - POST /request-refresh
   - POST /run-analysis
   - POST /run-if-refresh-required

2. Ruleaza automat:
   run_analysis.py
   apoi
   generate_transfer_recommendations.py

3. Auto-refresh:
   - verifica tabelul ai_refresh_state la fiecare AUTO_REFRESH_INTERVAL_SECONDS secunde
   - daca refresh_required = TRUE, ruleaza cele doua
   - nu porneste un run peste alt run
   - nu sterge flag-ul refresh_required daca apar schimbari noi in DB in timpul rularii

Dependente:
    py -m pip install fastapi uvicorn psycopg2-binary pydantic

SQL necesar:
    ruleaza 07_ai_refresh_state.sql inainte.

Rulare recomandata:
    set AUTO_REFRESH_ENABLED=true
    set AUTO_REFRESH_INTERVAL_SECONDS=15
    py -m uvicorn engine_service:app --host 127.0.0.1 --port 8001

Nota:
    Pentru development cu --reload, uvicorn reporneste procesul la modificari de cod.
    Pentru demo este ok. Pentru productie folositi un singur worker pentru acest serviciu AI.
"""

from __future__ import annotations

import asyncio
import os
import subprocess
import sys
import threading
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import psycopg2
import psycopg2.extras
from config.db_config import get_connection
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel


# =========================
# CONFIG
# =========================

BASE_DIR = Path(__file__).resolve().parent
AI_ANALYSIS_SCRIPT = BASE_DIR / "run_analysis.py"
RECOMMENDATION_SCRIPT = BASE_DIR / "generate_transfer_recommendations.py"

AUTO_REFRESH_ENABLED = os.getenv("AUTO_REFRESH_ENABLED", "false").lower() == "true"
AUTO_REFRESH_INTERVAL_SECONDS = max(15, int(os.getenv("AUTO_REFRESH_INTERVAL_SECONDS", "15")))

# PostgreSQL advisory lock pentru a evita doua run-uri simultane daca serviciul este pornit accidental de doua ori.
# Valoare arbitrar aleasa, dar stabila.
POSTGRES_ADVISORY_LOCK_KEY = 88010501

RUN_LOCK = threading.Lock()


# =========================
# MODELS
# =========================

class RunAnalysisResponse(BaseModel):
    status: str
    message: str
    duration_seconds: float
    ai_predictions_count: int
    alerts_count: int
    transfer_recommendations_count: int
    summary: dict[str, Any]


class SimpleResponse(BaseModel):
    status: str
    message: str


class RefreshStateResponse(BaseModel):
    refresh_required: bool
    change_version: int
    last_change_at: Any | None = None
    last_change_table: str | None = None
    last_change_operation: str | None = None
    last_refresh_started_at: Any | None = None
    last_refresh_finished_at: Any | None = None
    last_refresh_status: str | None = None
    last_refresh_error: str | None = None


# =========================
# DB HELPERS
# =========================

def fetch_one_dict(query: str, params: tuple[Any, ...] | None = None) -> dict[str, Any]:
    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(query, params or ())
            row = cur.fetchone()
            return dict(row) if row else {}


def execute_one_dict(query: str, params: tuple[Any, ...] | None = None) -> dict[str, Any]:
    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(query, params or ())
            row = cur.fetchone()
            conn.commit()
            return dict(row) if row else {}


def fetch_count(table_name: str) -> int:
    allowed_tables = {
        "ai_predictions",
        "alerts",
        "transfer_recommendations",
        "medication_batches",
        "daily_consumption",
        "restock_orders",
        "transport_routes",
        "transfer_requests",
        "inbox_messages",
        "inventory_transactions",
    }

    if table_name not in allowed_tables:
        raise ValueError(f"Table not allowed: {table_name}")

    row = fetch_one_dict(f"SELECT COUNT(*) AS count FROM {table_name};")
    return int(row.get("count", 0))


def get_dashboard_summary() -> dict[str, Any]:
    return fetch_one_dict("SELECT * FROM v_ai_dashboard_summary;")


def get_refresh_state() -> dict[str, Any]:
    return fetch_one_dict(
        """
        SELECT
            refresh_required,
            change_version,
            last_change_at,
            last_change_table,
            last_change_operation,
            last_refresh_started_at,
            last_refresh_finished_at,
            last_refresh_status,
            last_refresh_error
        FROM ai_refresh_state
        WHERE id = 1;
        """
    )


def request_refresh(reason: str = "manual_api") -> dict[str, Any]:
    return execute_one_dict("SELECT request_ai_refresh(%s) AS result;", (reason,)).get("result", {})


def mark_refresh_started() -> int:
    """
    Marcheaza inceputul refresh-ului si returneaza change_version observat.
    Acest change_version este folosit dupa run ca sa stim daca intre timp au aparut schimbari noi.
    """
    row = execute_one_dict(
        """
        UPDATE ai_refresh_state
        SET last_refresh_started_at = NOW(),
            last_refresh_status = 'running',
            last_refresh_error = NULL
        WHERE id = 1
        RETURNING change_version;
        """
    )
    return int(row["change_version"])


def complete_refresh(observed_change_version: int, status: str = "success", error: str | None = None) -> dict[str, Any]:
    row = execute_one_dict(
        "SELECT complete_ai_refresh(%s, %s, %s) AS result;",
        (observed_change_version, status, error),
    )
    return row.get("result", {})


def try_acquire_postgres_advisory_lock() -> bool:
    row = fetch_one_dict("SELECT pg_try_advisory_lock(%s) AS acquired;", (POSTGRES_ADVISORY_LOCK_KEY,))
    return bool(row.get("acquired"))


def release_postgres_advisory_lock() -> None:
    try:
        fetch_one_dict("SELECT pg_advisory_unlock(%s) AS released;", (POSTGRES_ADVISORY_LOCK_KEY,))
    except Exception:
        # Nu vrem sa ascundem rezultatul run-ului pentru o eroare la unlock.
        pass


# =========================
# RUN HELPERS
# =========================

def run_python_script(script_path: Path) -> str:
    if not script_path.exists():
        raise FileNotFoundError(f"Script not found: {script_path}")

    result = subprocess.run(
        [sys.executable, str(script_path)],
        cwd=str(BASE_DIR),
        text=True,
        capture_output=True,
        check=False,
    )

    if result.returncode != 0:
        raise RuntimeError(
            f"Script failed: {script_path.name}\n"
            f"STDOUT:\n{result.stdout}\n\n"
            f"STDERR:\n{result.stderr}"
        )

    return result.stdout


def run_analysis_internal() -> RunAnalysisResponse:
    """
    Ruleaza cele doua.
    Protejat de:
    - RUN_LOCK local
    - pg_try_advisory_lock global pe DB
    """
    if not RUN_LOCK.acquire(blocking=False):
        raise RuntimeError("AI analysis is already running in this service process.")

    acquired_db_lock = False
    started_at = time.perf_counter()
    observed_change_version: int | None = None

    try:
        acquired_db_lock = try_acquire_postgres_advisory_lock()
        if not acquired_db_lock:
            raise RuntimeError("AI analysis is already running in another service process.")

        observed_change_version = mark_refresh_started()

        # 1. Forecast + shortage risk + expiry risk + alerts.
        run_python_script(AI_ANALYSIS_SCRIPT)

        # 2. Transfer recommendations.
        run_python_script(RECOMMENDATION_SCRIPT)

        complete_refresh(observed_change_version, status="success", error=None)

        duration = round(time.perf_counter() - started_at, 2)

        return RunAnalysisResponse(
            status="success",
            message="AI analysis completed. Results were refreshed in PostgreSQL.",
            duration_seconds=duration,
            ai_predictions_count=fetch_count("ai_predictions"),
            alerts_count=fetch_count("alerts"),
            transfer_recommendations_count=fetch_count("transfer_recommendations"),
            summary=get_dashboard_summary(),
        )

    except Exception as exc:
        if observed_change_version is not None:
            complete_refresh(observed_change_version, status="failed", error=str(exc))
        raise

    finally:
        if acquired_db_lock:
            release_postgres_advisory_lock()
        RUN_LOCK.release()


def run_if_refresh_required_internal() -> dict[str, Any]:
    state = get_refresh_state()

    if not state:
        raise RuntimeError(
            "ai_refresh_state does not exist. Run 11_ai_refresh_state.sql first."
        )

    if not bool(state.get("refresh_required")):
        return {
            "status": "skipped",
            "message": "No AI refresh required.",
            "refresh_state": state,
        }

    result = run_analysis_internal()
    return {
        "status": "success",
        "message": "AI refresh was required and has been completed.",
        "analysis": result.model_dump(),
        "refresh_state": get_refresh_state(),
    }


# =========================
# APP LIFESPAN / SCHEDULER
# =========================

async def auto_refresh_loop() -> None:
    print(
        f"[AI refresh scheduler] enabled=true interval={AUTO_REFRESH_INTERVAL_SECONDS}s",
        flush=True,
    )

    while True:
        try:
            print("[AI refresh scheduler] checking for changes...", flush=True)

            state = await asyncio.to_thread(get_refresh_state)

            if not state:
                print(
                    "[AI refresh scheduler] ai_refresh_state does not exist. Run 07_ai_refresh_state.sql first.",
                    flush=True,
                )

            elif bool(state.get("refresh_required")):
                print("[AI refresh scheduler] detected database changes", flush=True)
                print("[AI refresh scheduler] running analysis...", flush=True)

                started_at = time.perf_counter()
                result = await asyncio.to_thread(run_analysis_internal)
                duration = round(time.perf_counter() - started_at, 2)

                print(
                    f"[AI refresh scheduler] analysis completed in {duration}s "
                    f"predictions={result.ai_predictions_count} "
                    f"alerts={result.alerts_count} "
                    f"recommendations={result.transfer_recommendations_count}",
                    flush=True,
                )

            else:
                print("[AI refresh scheduler] no changes detected", flush=True)

        except Exception as exc:
            print(f"[AI refresh scheduler] skipped/failed: {exc}", flush=True)

        print(
            f"[AI refresh scheduler] next check in {AUTO_REFRESH_INTERVAL_SECONDS}s",
            flush=True,
        )

        await asyncio.sleep(AUTO_REFRESH_INTERVAL_SECONDS)
        

@asynccontextmanager
async def lifespan(app: FastAPI):
    task: asyncio.Task | None = None

    if AUTO_REFRESH_ENABLED:
        task = asyncio.create_task(auto_refresh_loop())
    else:
        print("[AI refresh scheduler] disabled. Set AUTO_REFRESH_ENABLED=true to enable it.")

    yield

    if task:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass


app = FastAPI(
    title="Medical Stock AI Engine",
    description="AI service pentru forecast, risk analysis si transfer recommendations.",
    version="2.0.0",
    lifespan=lifespan,
)


# =========================
# ENDPOINTS
# =========================

@app.get("/health", response_model=SimpleResponse)
def health_check():
    try:
        row = fetch_one_dict("SELECT 1 AS ok;")
        if row.get("ok") != 1:
            raise RuntimeError("Database health check failed")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {exc}")

    return SimpleResponse(
        status="success",
        message="AI service is running and database connection works.",
    )


@app.get("/summary")
def summary():
    try:
        return get_dashboard_summary()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/counts")
def counts():
    try:
        return {
            "medication_batches": fetch_count("medication_batches"),
            "daily_consumption": fetch_count("daily_consumption"),
            "restock_orders": fetch_count("restock_orders"),
            "transport_routes": fetch_count("transport_routes"),
            "transfer_requests": fetch_count("transfer_requests"),
            "inbox_messages": fetch_count("inbox_messages"),
            "inventory_transactions": fetch_count("inventory_transactions"),
            "ai_predictions": fetch_count("ai_predictions"),
            "alerts": fetch_count("alerts"),
            "transfer_recommendations": fetch_count("transfer_recommendations"),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/refresh-state", response_model=RefreshStateResponse)
def refresh_state():
    try:
        state = get_refresh_state()
        if not state:
            raise RuntimeError("ai_refresh_state does not exist. Run 07_ai_refresh_state.sql first.")
        return state
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/request-refresh")
def request_ai_refresh():
    try:
        return request_refresh("manual_api")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/run-analysis", response_model=RunAnalysisResponse)
def run_analysis():
    """
    Ruleaza fortat AI-ul, indiferent daca refresh_required este TRUE sau FALSE.
    Folositor pentru demo/test.
    """
    try:
        return run_analysis_internal()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/run-if-refresh-required")
def run_if_refresh_required():
    """
    Ruleaza AI-ul doar daca ai_refresh_state.refresh_required = TRUE.
    Acesta este endpoint-ul recomandat pentru backend.
    """
    try:
        return run_if_refresh_required_internal()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# =========================
# OPTIONAL: local CLI info
# =========================

if __name__ == "__main__":
    print("Acest fisier este gandit sa fie rulat cu uvicorn:")
    print("py -m uvicorn engine_service:app --host 127.0.0.1 --port 8001")
