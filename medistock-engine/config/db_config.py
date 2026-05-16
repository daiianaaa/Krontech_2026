"""
db_config.py
Configurare centralizata pentru conexiunea PostgreSQL / Supabase.

Prioritate:
1. DATABASE_URL, daca exista.
2. Variabile individuale: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_SSLMODE.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import psycopg2


def load_local_env() -> None:
    """Incarca un fisier .env simplu din acelasi folder, fara dependenta python-dotenv."""
    env_path = Path(__file__).resolve().parent / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")

        # Nu suprascriem variabilele setate deja in sistem / hosting.
        os.environ.setdefault(key, value)


load_local_env()


def get_db_connection_params() -> str | dict[str, Any]:
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        return database_url

    return {
        "host": os.getenv("DB_HOST", "localhost"),
        "port": int(os.getenv("DB_PORT", "5432")),
        "dbname": os.getenv("DB_NAME", "medical_stock_ai"),
        "user": os.getenv("DB_USER", "postgres"),
        "password": os.getenv("DB_PASSWORD", "password"),
        "sslmode": os.getenv("DB_SSLMODE", "prefer"),
    }


def get_connection():
    params = get_db_connection_params()
    if isinstance(params, str):
        return psycopg2.connect(params)
    return psycopg2.connect(**params)
