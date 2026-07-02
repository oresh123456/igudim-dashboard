"""Synthetic fixtures only — one per drop class, a clean straight-copy,
and an unparseable statement. No real system objects anywhere (genericity rule)."""
from etl_drop_audit.cli import pipeline
from etl_drop_audit.graph import build_dag
from etl_drop_audit.models import SourceObject
from etl_drop_audit.report import render


def proc(name: str, body: str) -> SourceObject:
    definition = (
        f"CREATE OR REPLACE PROCEDURE public.{name}()\n"
        f"LANGUAGE plpgsql\nAS $procedure$\nBEGIN\n{body}\nEND;\n$procedure$\n"
    )
    return SourceObject(schema="public", name=name, kind="procedure", definition=definition)


OUTER_TO_INNER = proc(
    "load_a",
    """
    TRUNCATE TABLE tgt_a;
    INSERT INTO tgt_a (id, name)
    SELECT s.id, s.name
    FROM src_main s
    LEFT JOIN src_lookup r ON s.code = r.code
    WHERE r.code IS NOT NULL;
    """,
)

INNER_JOIN = proc(
    "load_b",
    """
    INSERT INTO tgt_b
    SELECT s.id FROM src_main s JOIN src_lookup r ON s.code = r.code;
    """,
)

WHERE_ONLY = proc(
    "load_c",
    "INSERT INTO tgt_c SELECT id FROM src_main WHERE active = true;",
)

STRAIGHT_COPY = proc(
    "load_d",
    "INSERT INTO tgt_d SELECT id, name FROM src_main;",
)

UNPARSEABLE = proc(
    "load_e",
    "INSERT INTO tgt_e SELECT * FROM crosstab('nonsense' % 3 &&& bad);",
)


def kinds(points):
    return {p.kind for p in points}


def test_outer_to_inner_detected():
    _, points, unparsed = pipeline([OUTER_TO_INNER], sample_limit=5)
    assert not unparsed
    ks = kinds(points)
    assert "OUTER_TO_INNER" in ks
    otd = next(p for p in points if p.kind == "OUTER_TO_INNER")
    dropped_sql = next(q.sql for q in otd.audit_queries if q.label == "dropped")
    assert "IS NULL" in dropped_sql and "LEFT JOIN" in dropped_sql
    sample = next(q for q in otd.audit_queries if q.is_sample)
    assert "LIMIT 5" in sample.sql


def test_counts_only_mode_has_no_samples():
    _, points, _ = pipeline([OUTER_TO_INNER], sample_limit=0)
    assert not any(q.is_sample for p in points for q in p.audit_queries)


def test_inner_join_null_key_fanout_detected():
    _, points, _ = pipeline([INNER_JOIN], sample_limit=0)
    ks = kinds(points)
    assert {"INNER_JOIN", "NULL_KEY", "FANOUT"} <= ks


def test_where_filter_detected():
    _, points, _ = pipeline([WHERE_ONLY], sample_limit=0)
    assert kinds(points) == {"WHERE_FILTER"}


def test_straight_copy_no_false_positive():
    _, points, unparsed = pipeline([STRAIGHT_COPY], sample_limit=0)
    assert points == [] and unparsed == []


def test_unparseable_lands_in_unparsed_not_skipped():
    statements, points, unparsed = pipeline([UNPARSEABLE], sample_limit=0)
    assert len(statements) == 1 and len(unparsed) == 1
    assert unparsed[0].error


def test_no_naming_convention_anywhere():
    # tables here share no prefix with any convention — everything must still work
    _, points, _ = pipeline([OUTER_TO_INNER, INNER_JOIN], sample_limit=0)
    assert len(points) >= 2


def test_dag_and_report_render():
    statements, points, unparsed = pipeline(
        [OUTER_TO_INNER, INNER_JOIN, WHERE_ONLY, STRAIGHT_COPY], sample_limit=0
    )
    dag = build_dag(statements)
    assert ("src_main", "tgt_a") in {(e.source, e.target) for e in dag.edges}
    assert dag.layers[0] and "tgt_a" not in dag.layers[0]

    from etl_drop_audit.models import AuditResult

    results = [AuditResult(drop_point=p, counts={"dropped": 7}) for p in points]
    html_text = render(dag, results, unparsed)
    assert "<svg" in html_text and "OUTER_TO_INNER" in html_text
    assert 'dir="auto"' in html_text or "dir='auto'" in html_text
