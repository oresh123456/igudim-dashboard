"""Discover auditable objects from Postgres catalogs — no naming assumptions.

Pulls every plpgsql/sql function+procedure and every view/matview in the
requested schemas (default: all non-system schemas).
"""
from __future__ import annotations

import psycopg

from .db import fetch_all
from .models import SourceObject

SYSTEM_SCHEMAS = ("pg_catalog", "information_schema")

_PROCS_SQL = """
SELECT n.nspname AS schema,
       p.proname  AS name,
       CASE p.prokind WHEN 'p' THEN 'procedure' ELSE 'function' END AS kind,
       pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_language l  ON l.oid = p.prolang
WHERE p.prokind IN ('f', 'p')
  AND l.lanname IN ('plpgsql', 'sql')
  AND n.nspname <> ALL(%(system)s)
  AND (%(schemas)s::text[] IS NULL OR n.nspname = ANY(%(schemas)s))
"""

_VIEWS_SQL = """
SELECT schemaname AS schema, viewname AS name, 'view' AS kind, definition
FROM pg_views
WHERE schemaname <> ALL(%(system)s)
  AND (%(schemas)s::text[] IS NULL OR schemaname = ANY(%(schemas)s))
UNION ALL
SELECT schemaname, matviewname, 'matview', definition
FROM pg_matviews
WHERE schemaname <> ALL(%(system)s)
  AND (%(schemas)s::text[] IS NULL OR schemaname = ANY(%(schemas)s))
"""


def discover(conn: psycopg.Connection, schemas: list[str] | None = None) -> list[SourceObject]:
    params = {"system": list(SYSTEM_SCHEMAS), "schemas": schemas or None}
    rows = fetch_all(conn, _PROCS_SQL, params) + fetch_all(conn, _VIEWS_SQL, params)
    return [SourceObject(**r) for r in rows if r["definition"]]
