"""Render a single-file HTML report: DAG + drop-point table + UNPARSED list.

No server, no external assets; UTF-8 with dir="auto" so any-language data
(incl. RTL) renders correctly.
"""
from __future__ import annotations

import html
import json
from collections import defaultdict

from .graph import Dag
from .models import AuditResult, EtlStatement

_NODE_W, _NODE_H, _GAP_X, _GAP_Y, _PAD = 210, 34, 120, 18, 20


def _esc(s) -> str:
    return html.escape(str(s if s is not None else ""))


def _svg_dag(dag: Dag, dropped_by_stmt: dict[str, int]) -> str:
    pos: dict[str, tuple[int, int]] = {}
    for li, layer in enumerate(dag.layers):
        for ni, node in enumerate(layer):
            x = _PAD + li * (_NODE_W + _GAP_X)
            y = _PAD + ni * (_NODE_H + _GAP_Y)
            pos[node] = (x, y)
    width = _PAD * 2 + max((len(dag.layers)), 1) * (_NODE_W + _GAP_X)
    height = _PAD * 2 + max((len(l) for l in dag.layers), default=1) * (_NODE_H + _GAP_Y)

    parts = [f'<svg viewBox="0 0 {width} {height}" style="width:100%;min-height:200px" xmlns="http://www.w3.org/2000/svg">']
    for e in dag.edges:
        if e.source not in pos or e.target not in pos:
            continue
        x1, y1 = pos[e.source][0] + _NODE_W, pos[e.source][1] + _NODE_H // 2
        x2, y2 = pos[e.target][0], pos[e.target][1] + _NODE_H // 2
        dropped = dropped_by_stmt.get(e.statement_id, 0)
        color = "#c0392b" if dropped > 0 else "#95a5a6"
        w = 2.5 if dropped > 0 else 1.2
        parts.append(
            f'<g class="edge" data-stmt="{_esc(e.statement_id)}" style="cursor:pointer">'
            f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="{w}"/>'
            + (
                f'<text x="{(x1 + x2) / 2}" y="{(y1 + y2) / 2 - 4}" font-size="10" '
                f'fill="{color}" text-anchor="middle">-{dropped:,}</text>'
                if dropped > 0 else ""
            )
            + "</g>"
        )
    for node, (x, y) in pos.items():
        parts.append(
            f'<g><rect x="{x}" y="{y}" width="{_NODE_W}" height="{_NODE_H}" rx="6" '
            f'fill="#fff" stroke="#34495e"/>'
            f'<text x="{x + _NODE_W / 2}" y="{y + _NODE_H / 2 + 4}" font-size="11" '
            f'text-anchor="middle">{_esc(node)}</text></g>'
        )
    parts.append("</svg>")
    return "".join(parts)


def _results_json(results: list[AuditResult]) -> str:
    data = defaultdict(list)
    for r in results:
        p = r.drop_point
        stmt_id = p.id.rsplit("/", 2)[0]
        data[stmt_id].append(
            {
                "kind": p.kind,
                "description": p.description,
                "counts": r.counts,
                "samples": r.samples,
                "status": r.status,
                "error": r.error,
            }
        )
    return json.dumps(data, ensure_ascii=False)


def render(
    dag: Dag,
    results: list[AuditResult],
    unparsed: list[EtlStatement],
    title: str = "ETL silent-drop audit",
) -> str:
    dropped_by_stmt: dict[str, int] = defaultdict(int)
    for r in results:
        stmt_id = r.drop_point.id.rsplit("/", 2)[0]
        dropped_by_stmt[stmt_id] += r.dropped

    rows = sorted(results, key=lambda r: r.dropped, reverse=True)
    table_rows = []
    for r in rows:
        p = r.drop_point
        counts = ", ".join(
            f"{k}={v if v is not None else '?'}" for k, v in r.counts.items()
        )
        cls = ' class="hit"' if r.dropped > 0 else ""
        table_rows.append(
            f"<tr{cls}><td dir='auto'>{_esc(p.obj_name)}</td><td>{_esc(p.kind)}</td>"
            f"<td dir='auto'>{_esc(p.target)}</td><td dir='auto'>{_esc(p.description)}</td>"
            f"<td>{r.dropped:,}</td><td>{_esc(counts)}</td><td>{_esc(r.status)}</td></tr>"
        )

    unparsed_items = "".join(
        f"<li><b dir='auto'>{_esc(s.id)}</b>: {_esc(s.error)}"
        f"<pre dir='auto'>{_esc(s.sql[:800])}</pre></li>"
        for s in unparsed
    )

    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<title>{_esc(title)}</title>
<style>
 body {{ font-family: system-ui, sans-serif; margin: 0; background: #f4f6f8; color: #202a35; }}
 header {{ background: #34495e; color: #fff; padding: 14px 24px; }}
 section {{ background: #fff; margin: 16px 24px; padding: 16px; border-radius: 8px;
           box-shadow: 0 1px 3px rgba(0,0,0,.08); }}
 table {{ border-collapse: collapse; width: 100%; font-size: 13px; }}
 th, td {{ border-bottom: 1px solid #e3e8ee; padding: 6px 8px; text-align: start; }}
 tr.hit td {{ background: #fdecea; }}
 pre {{ background: #f4f6f8; padding: 8px; overflow-x: auto; font-size: 12px; }}
 #detail {{ display: none; }}
 .badge {{ display: inline-block; background: #c0392b; color: #fff; border-radius: 10px;
          padding: 1px 8px; font-size: 12px; }}
</style></head>
<body>
<header><h1 style="margin:0;font-size:18px">{_esc(title)}</h1></header>
<section><h2>Pipeline DAG <small style="font-weight:normal">(red edge = confirmed drops; click an edge for details)</small></h2>
{_svg_dag(dag, dropped_by_stmt)}</section>
<section id="detail"><h2 id="detail-title"></h2><div id="detail-body"></div></section>
<section><h2>Drop points ({len(results)})</h2>
<table><thead><tr><th>object</th><th>class</th><th>target</th><th>description</th>
<th>dropped</th><th>counts</th><th>status</th></tr></thead>
<tbody>{''.join(table_rows)}</tbody></table></section>
<section><h2>UNPARSED statements ({len(unparsed)})</h2>
<p>Statements that looked like DML but could not be parsed — review manually; never silently skipped.</p>
<ul>{unparsed_items or '<li>none</li>'}</ul></section>
<script>
const DATA = {_results_json(results)};
document.querySelectorAll('.edge').forEach(g => g.addEventListener('click', () => {{
  const id = g.dataset.stmt, items = DATA[id] || [];
  document.getElementById('detail').style.display = 'block';
  document.getElementById('detail-title').textContent = id;
  document.getElementById('detail-body').innerHTML = items.map(it => `
    <h3>${{it.kind}} <span class="badge">${{it.status}}</span></h3>
    <p dir="auto">${{it.description}}</p>
    <p>${{Object.entries(it.counts).map(([k,v]) => k+' = '+(v ?? '?')).join(' · ')}}</p>
    ${{it.samples.length ? '<pre dir="auto">' + JSON.stringify(it.samples, null, 1) + '</pre>' : ''}}
    ${{it.error ? '<p style="color:#c0392b">' + it.error + '</p>' : ''}}
  `).join('') || '<p>no drop points on this edge</p>';
  document.getElementById('detail').scrollIntoView({{behavior: 'smooth'}});
}}));
</script>
</body></html>"""
