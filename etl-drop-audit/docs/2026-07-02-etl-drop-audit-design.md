# etl-drop-audit — design

**Goal:** find every silent row-drop in the SQL layer of the ETL (Postgres stored procs), quantify it, visualize it. Run by a business expert directly — no data-engineer loop, provably read-only.

## Context

- Pipeline: Glue (src→bronze→silver, out of scope — drops are SQL-side) → Postgres procs `sp_stg_*` (mrr→stg: joins+filters = drop zone) → `sp_dwh_*` (stg→dwh: straight copy).
- Confirmed drop pattern in `sp_stg_aa_dim_teams`: `LEFT JOIN mrr_aa_new_supportrequests r ON … WHERE r.support_request_code IS NOT NULL` — LEFT turned INNER, unmatched teams vanish unlogged.
- DB reachable at `localhost:5432` via user-run AWS SSM port-forward tunnel (same as DBeaver).

## Architecture — python CLI, 3 stages, one command

```
etl-drop-audit run  →  discover → analyze → audit → report.html
```

### 1. Discover
- Connect psycopg to `localhost:5432` (creds from `.env`).
- Pull all proc/function defs from `pg_proc` (`pg_get_functiondef`) + view defs from `pg_views`, schema `public`.
- Filter: bodies containing `INSERT INTO … SELECT` (procs) / any view with joins.

### 2. Analyze (sqlglot, postgres dialect)
Per statement, extract:
- **join inventory:** target table, source tables, join type, join keys.
- **drop-point classification:**
  - `INNER_JOIN` — unmatched rows dropped
  - `OUTER_TO_INNER` — LEFT/RIGHT join + WHERE null-check on inner side (the confirmed pattern)
  - `NULL_KEY` — rows whose join key IS NULL can never match
  - `WHERE_FILTER` — plain filter dropping rows
  - `FANOUT` — dup keys on the many-side inflating rows (opposite failure, same family)
- Emit audit SQL per drop-point: source count, survived count, dropped-by-join, dropped-by-filter, null-key count, + `LIMIT 20` sample of dropped rows.
- plpgsql parsing: strip proc wrapper (DECLARE/BEGIN/END, RAISE, GET DIAGNOSTICS, TRUNCATE) with regex, feed inner SQL statements to sqlglot. Statements sqlglot can't parse → listed in report as UNPARSED (never silently skipped — this tool of all tools must not silently drop).

### 3. Audit + report
- Run audit SQL, all read-only.
- Emit single-file `report.html` (no server, embedded JS):
  - **DAG** per entity chain `mrr → stg → dwh`; node = table, edge = proc; edge label `in → out (−dropped)`; red edge = drops > 0.
  - Click edge → breakdown by drop class + sample dropped rows (Hebrew-safe, UTF-8).
  - Summary table sorted by dropped-row count; UNPARSED list at bottom.

## Read-only guarantee (3 layers)

1. Connection opts: `default_transaction_read_only=on` — Postgres rejects any write in-session, even if the tool bugs out.
2. Every query wrapped `BEGIN READ ONLY … COMMIT`.
3. Optional later: dedicated `readonly_audit` role (not a blocker).

Plus safety valves: `statement_timeout=60s` per query (no runaway COUNTs), `--limit-sample N` for sample size.

## Config

`.env` (gitignored): `PGHOST=localhost PGPORT=5432 PGDATABASE=… PGUSER=… PGPASSWORD=…`
Precondition: SSM tunnel up (user runs in terminal, as for DBeaver).

## Out of scope (v1)

Glue/spark level · scheduling/CI · auto-fixing procs · non-public schemas.

## Error handling

- Tunnel down → clear message "connect failed — is the SSM tunnel running?"
- Unparseable proc → UNPARSED section, run continues.
- Audit query timeout → marked TIMEOUT in report, run continues.

## Testing

- Unit: parser fixtures = the 3 real procs from the dump (incl. the OUTER_TO_INNER case) + synthetic cases per drop class.
- Integration: run against live DB read-only; assert report renders + `sp_stg_aa_dim_teams` flagged.
