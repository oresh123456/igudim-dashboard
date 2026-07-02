"""Read-only Postgres connection.

Creds come from standard libpq PG* env vars (optionally via .env).
Read-only is enforced at the session level: even a bug in this tool cannot
write — Postgres itself rejects any write statement.
"""
from __future__ import annotations

import psycopg
from dotenv import load_dotenv


def connect(timeout_s: int = 60) -> psycopg.Connection:
    load_dotenv()
    opts = f"-c default_transaction_read_only=on -c statement_timeout={timeout_s * 1000}"
    conn = psycopg.connect(options=opts, autocommit=False)
    conn.read_only = True
    return conn


def fetch_all(conn: psycopg.Connection, sql: str, params=None) -> list[dict]:
    with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
        cur.execute(sql, params)
        return cur.fetchall()
