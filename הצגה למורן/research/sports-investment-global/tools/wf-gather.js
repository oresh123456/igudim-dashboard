// Research-swarm dispatcher TEMPLATE. Copy to <project>/tools/wf-gather.js and adapt
// the SCHEMA `entity`/`field` vocabulary + buildPrompt to the project. Everything else is generic.
//
// Run via the Workflow tool:
//   Workflow({ scriptPath: "tools/wf-gather.js", args: { run, targets, dns, maxAgents, model, effort, perAgentTokens } })
// It returns { run, coverage[], findings[], suggest[] } for the orchestrator to Import-Run into ledgers.
// NOTE: Workflow scripts cannot touch the filesystem — the main agent merges the return value.

export const meta = {
  name: 'research-swarm-gather',
  description: 'Fan out N pure agents to gather/enrich web data; budget-capped; format-neutral findings',
  phases: [{ title: 'Gather', detail: 'one agent per disjoint target' }],
};

// --- args (accept object OR JSON string) ---
let A = args;
if (typeof A === 'string') { try { A = JSON.parse(A); } catch { A = {}; } }
A = A || {};
const RUN = A.run || 'run';
const MODEL = A.model || undefined;          // haiku | sonnet | opus | undefined(inherit)
const EFFORT = A.effort || undefined;        // low | medium | high | xhigh | max
const MAX_AGENTS = A.maxAgents || 24;
const PER_AGENT_EST = A.perAgentTokens || 12000;
const DNS = A.dns || {};                      // { "<target.key>": ["off-limits-canon-key", ...] }
let TARGETS = /*__TARGETS__*/ (Array.isArray(A.targets) ? A.targets : []);  // Build-Dispatcher bakes targets here; args.targets is the un-baked fallback

// --- budget guard: slice to what we can afford, LOG every drop ---
if (budget.total) {
  const afford = Math.floor(budget.remaining() / PER_AGENT_EST);
  if (afford < TARGETS.length) {
    log(`budget caps run to ${afford}/${TARGETS.length} targets (${PER_AGENT_EST} tok/agent)`);
    TARGETS = TARGETS.slice(0, Math.max(0, afford));
  }
}
if (TARGETS.length > MAX_AGENTS) {
  log(`maxAgents caps run to ${MAX_AGENTS}/${TARGETS.length} targets`);
  TARGETS = TARGETS.slice(0, MAX_AGENTS);
}
if (!TARGETS.length) { log('no targets to dispatch'); return { run: RUN, coverage: [], findings: [], suggest: [] }; }

// --- StructuredOutput schema (adapt entity/field to the project) ---
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    coverage: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['key', 'type', 'raw', 'status'],
        properties: {
          key: { type: 'string' },                                   // CANONICAL key (see swarm-lib)
          type: { enum: ['url', 'query', 'site', 'area'] },
          raw: { type: 'string' },
          status: { enum: ['mined', 'partial', 'blocked', 'dead', 'pending'] },
          area: { type: 'string' },
          yield: { type: 'string' },
          remaining: { type: 'string' },
          endpoint_status: { enum: ['live', 'context', 'auth', 'browser', 'file', 'image', 'dead', 'error', 'na'] },
        },
      },
    },
    findings: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['entity', 'field', 'value', 'source_key'],
        properties: {
          entity: { type: 'string' },      // project vocabulary — NOT an excel row/sheet
          field: { type: 'string' },       // project vocabulary — NOT a column index
          value: { type: 'string' },       // the fact; keep human-readable (may still carry year/marker text)
          source_key: { type: 'string' },  // canonical key of the coverage row it came from
          status: { enum: ['verified', 'estimate'] }, // OPTIONAL reconcile signal → feeds the `verification` rule (omit if unknown; rule then abstains)
          as_of: { type: 'string' },       // OPTIONAL ISO date the figure is "as of" → feeds the `recency` rule (omit if unknown; rule abstains)
          note: { type: 'string' },
        },
      },
    },
    suggest: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false, required: ['kind'],
        properties: { kind: { type: 'string' }, raw: { type: 'string' }, why: { type: 'string' } },
      },
    },
  },
  required: ['coverage', 'findings'],
};

function buildPrompt(t) {
  const off = (DNS[t.key] || []);
  const dnsBlock = off.length
    ? `\n## DO NOT SEARCH (already covered — find NEW sources only)\n${off.map((k) => `- ${k}`).join('\n')}`
    : '';
  return `You are a research agent gathering data for: ${t.label || t.key}
Subject/context: ${t.subject || '(none)'}
Hints: ${(t.hints || []).join('; ') || '(none)'}

Find data on the open web. For JS/SPA pages, fetch via r.jina.ai/<url>.
Return ONLY the StructuredOutput object:
- coverage[]: one row per source you TOUCHED (canonicalize keys: drop scheme/www/#/trailing-slash + tracking params; queries as "engine:collapsed text"). Set status honestly (mined/partial/blocked/dead). Record every failure as its own row with the real reason.
- findings[]: the facts as { entity, field, value, source_key }. source_key must match a coverage key. When known, ALSO set structured signals: status ("verified" from a primary/filing source vs "estimate" from a secondary) and as_of (ISO date the figure applies to) — these feed the reconciliation rules; omit either if unknown (the rule abstains, never guesses).
- suggest[]: optional next-action hints (new sources, deeper targets).${dnsBlock}`;
}

phase('Gather');
const results = await parallel(
  TARGETS.map((t) => () =>
    agent(buildPrompt(t), {
      label: `gather:${t.key}`,
      phase: 'Gather',
      schema: SCHEMA,
      ...(MODEL ? { model: MODEL } : {}),
      ...(EFFORT ? { effort: EFFORT } : {}),
    }).then((r) => ({ t, r }))
  )
);

// --- aggregate; stamp provenance; hand back for Import-Run ---
const coverage = [], findings = [], suggest = [];
for (const item of results.filter(Boolean)) {
  const { t, r } = item;
  if (!r) continue;
  for (const c of r.coverage || []) coverage.push({ ...c, run: RUN, agent: t.key, date: A.date || null, targets: [t.key] });
  for (const f of r.findings || []) findings.push({ ...f, run: RUN, agent: t.key, date: A.date || null });
  for (const s of r.suggest || []) suggest.push({ ...s, run: RUN, agent: t.key });
}
log(`run ${RUN}: ${coverage.length} coverage, ${findings.length} findings, ${suggest.length} suggestions from ${TARGETS.length} agents`);
return { run: RUN, coverage, findings, suggest };
