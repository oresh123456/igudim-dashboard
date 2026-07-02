"""Build the table-level DAG from discovered statements.

Node = table; edge = statement moving rows source -> target.
Layering = topological sort over actual edges — never naming conventions.
"""
from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field

from .analyze import main_select, source_tables
from .models import EtlStatement


@dataclass
class Edge:
    source: str
    target: str
    statement_id: str
    obj_name: str


@dataclass
class Dag:
    nodes: list[str] = field(default_factory=list)
    edges: list[Edge] = field(default_factory=list)
    layers: list[list[str]] = field(default_factory=list)


def build_dag(statements: list[EtlStatement]) -> Dag:
    edges: list[Edge] = []
    nodes: set[str] = set()
    for st in statements:
        if st.error or not st.target:
            continue
        select = main_select(st)
        if select is None:
            continue
        for src in source_tables(select):
            if src == st.target:
                continue
            nodes.update((src, st.target))
            edges.append(Edge(src, st.target, st.id, st.obj.full_name))

    # Kahn topological layering; cycles fall into a final layer.
    preds: dict[str, set[str]] = defaultdict(set)
    succs: dict[str, set[str]] = defaultdict(set)
    for e in edges:
        preds[e.target].add(e.source)
        succs[e.source].add(e.target)
    remaining = set(nodes)
    layers: list[list[str]] = []
    while remaining:
        layer = sorted(n for n in remaining if not (preds[n] & remaining))
        if not layer:  # cycle
            layer = sorted(remaining)
        layers.append(layer)
        remaining -= set(layer)
    return Dag(nodes=sorted(nodes), edges=edges, layers=layers)
