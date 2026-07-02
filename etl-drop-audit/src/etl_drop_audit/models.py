"""Shared dataclasses for all pipeline stages."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class SourceObject:
    schema: str
    name: str
    kind: str  # procedure | function | view | matview
    definition: str

    @property
    def full_name(self) -> str:
        return f"{self.schema}.{self.name}"


@dataclass
class EtlStatement:
    obj: SourceObject
    index: int
    sql: str
    target: Optional[str] = None
    ast: Any = None
    error: Optional[str] = None  # set => UNPARSED

    @property
    def id(self) -> str:
        return f"{self.obj.full_name}#{self.index}"


@dataclass
class JoinInfo:
    right_alias: str
    right_table_sql: str
    join_type: str  # INNER | LEFT | RIGHT | FULL | CROSS
    condition_sql: str
    keys: list[tuple[str, str]] = field(default_factory=list)


@dataclass
class AuditQuery:
    label: str  # e.g. survived, dropped, null_key, fanout_dup_keys, sample
    sql: str
    is_sample: bool = False


@dataclass
class DropPoint:
    id: str
    kind: str  # INNER_JOIN | OUTER_TO_INNER | NULL_KEY | WHERE_FILTER | FANOUT
    obj_name: str
    target: Optional[str]
    description: str
    audit_queries: list[AuditQuery] = field(default_factory=list)


@dataclass
class AuditResult:
    drop_point: DropPoint
    counts: dict[str, Optional[int]] = field(default_factory=dict)
    samples: list[dict] = field(default_factory=list)
    status: str = "OK"  # OK | TIMEOUT | ERROR | NOT_RUN
    error: Optional[str] = None

    @property
    def dropped(self) -> int:
        v = self.counts.get("dropped")
        return v if isinstance(v, int) else 0
