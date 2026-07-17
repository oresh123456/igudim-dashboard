// PERMITS swarm — sole purpose: map every source to OBTAIN building-permit data (היתרי בנייה / רישוי בנייה)
// in Israel, to catch sports-facility EXISTENCE outside the self-reported קובץ המתקנים spine.
// Two DISJOINT tiers, kept separate by design: NATIONAL aggregators (slim) vs PER-AUTHORITY feeds (build coverage).
// Same neutral schema / durability / retry as wf-frontier.js. Saved (not inline) so it survives sessions.
//
// Run: Workflow({ scriptPath: "api-research/tools/wf-permits.js", args: { run:"2026-07-17p", model:"sonnet", effort:"medium", partsDir:"<abs>/agents" } })
// Returns { run, coverage[], findings[], suggest[] } to merge with Import-Run.

export const meta = {
  name: 'permits-source-swarm',
  description: 'Map building-permit (היתרי בנייה) data sources — national tier + per-authority tier — for facility-existence tracking',
  phases: [{ title: 'Permits', detail: 'national + per-authority permit-source hunt' }],
};

let A = args; if (typeof A === 'string') { try { A = JSON.parse(A); } catch { A = {}; } } A = A || {};
const RUN = A.run || 'permits';
const MODEL = A.model || undefined;
const EFFORT = A.effort || 'medium';
const ONLY = Array.isArray(A.only) ? A.only : null;
const PARTS = A.partsDir || null;
const RETRIES = A.retries || 2;

const CTX = `Client = strategic dashboard for the Israeli Ministry of Culture & Sport (מינהל הספורט). GOAL OF THIS HUNT: sources to obtain BUILDING-PERMIT data (היתרי בנייה / רישוי בנייה / בקשות להיתר / טופס 4 אכלוס). WHY permits: the ministry's facility registry (קובץ המתקנים, published as data.gov.il "408" + Efshari Bari FeatureServer) is SELF-REPORTED by local-authority sport departments — audited as ~22-40% incomplete and STRUCTURALLY BLIND to privately-built facilities (gyms, clubs, hotels). A building permit is the one chokepoint EVERY physical facility passes through regardless of who funds/owns/operates it, so permit data is the completeness net. We need to know exactly WHERE permit data can be pulled.`;

const WON = `ALREADY ESTABLISHED this session (do NOT re-verify — extend only if your lane genuinely adds):
1. תכנון זמין / iplan Xplan (ags.iplan.gov.il/arcgisiplan/rest/services/PlanningPublic/Xplan/MapServer, layer 1, 36,667 plans, no auth, ITM) is PLANNING/תב"ע = plan-level land-use, NOT building permits and NOT a facility inventory. Do not re-pull it as if it were permits.
2. data.gov.il CKAN package_search for exact term "היתרי בנייה" returned 0 — so alt terms/orgs are needed, don't repeat that exact query.
3. Business licensing (רישיון עסק) is per-municipality (Beer Sheva resource 7d4c61e2-2416-453e-8efb-bd02ec89db35, Frequency=Day/Automat) — that is a SEPARATE lane already known; permits ≠ business licenses.
4. CBS (למ"ס) building starts/completions is AGGREGATE (by locality/building-type), derived from committee permit reports + field survey — not itemized, can't isolate sport. Known; only chase it if a per-permit MICRODATA path exists.`;

const TARGETS = [
  // ─────────────── TIER 1: NATIONAL (slim but check hard) ───────────────
  { key:'natl-datagov-sweep', tier:'national',
    label:'data.gov.il — exhaustive national CKAN sweep for permits under ALL alternate terms',
    subject:'Sweep data.gov.il for building-permit datasets NOT under the exact term "היתרי בנייה". Try package_search q= רישוי בנייה · בקשות להיתר · היתרים · טופס 4 · אכלוס · בנייה חדשה. Check national-org packages: מינהל התכנון, רשות מקרקעי ישראל (רמ"י), משרד הבינוי והשיכון, רשות המסים (עסקאות נדל"ן). For each hit: resource_id, format, declared Frequency/Update, is it national vs single-municipality, and cross-ref key (gush/helka, address, coords, permit#).',
    hints:['data.gov.il/api/3/action/package_search q=רישוי בנייה','q=בקשות להיתר','q=טופס 4','organization minhal-hatichnun / israel-land-authority / rasham','fq national vs local-authority'] },

  { key:'natl-iplan-rishuy-zamin', tier:'national',
    label:'מנהל התכנון רישוי זמין — does the NATIONAL licensing system expose any open API/GIS for permits?',
    subject:'רישוי זמין processes building permits for MANY authorities on one national platform — if it exposes data it is THE national source. Investigate: does bnhp.gov.il / רישוי זמין have any open API, export, or GIS FeatureServer for issued permits/בקשות? Check ags.iplan.gov.il/arcgisiplan/rest/services for a licensing (not planning) service; mavat.iplan.gov.il for permit/decision data; any "היתרים" layer. Distinguish workflow-portal-only (no open data) vs an actual queryable endpoint.',
    hints:['רישוי זמין bnhp.gov.il api','ags.iplan.gov.il/arcgisiplan/rest/services folders licensing rishui','mavat.iplan.gov.il permit decisions export','מנהל התכנון היתרי בנייה שכבה'] },

  { key:'natl-govmap-mapi-rami', tier:'national',
    label:'GovMap + מפ"י + רמ"י — national building/address/land layers with permit or footprint attributes',
    subject:'National geo bases that might carry building/permit attributes: GovMap layers (מבנים, בנייני ישראל BLDG, כתובות), מפ"י Survey of Israel national buildings layer + BNTL, רשות מקרקעי ישראל (רמ"י) GIS transactions/allocations. Do any expose building FOOTPRINTS with build-year/permit/use attributes joinable by gush/helka? Note token/auth requirements.',
    hints:['govmap layer מבנים בנייני ישראל BLDG','mapi.gov.il BNTL בסיס נתונים טופוגרפי','api.govmap.gov.il building layer','land.gov.il רמ"י GIS עסקאות'] },

  { key:'natl-commercial-cbs-micro', tier:'national',
    label:'Commercial nadlan-data vendors + CBS per-permit microdata path',
    subject:'Commercial aggregators that already centralize permits: Madlan, WinWin, נדל"ן/yad2-data, Intelligence/CoreLogic-style IL vendors, govmap-resellers — do any sell a national permits API? cost/ToS/coverage. Separately: does CBS (למ"ס) offer PER-PERMIT microdata (research files / קובץ מיקרו) beyond the aggregate series, and under what access (research room, request)? Record as leads with acquisition route, not necessarily live API.',
    hints:['madlan.co.il permits data api','cbs.gov.il קובץ מיקרו התחלות בנייה חדר מחקר','winwin נדל"ן היתרים','commercial building permits Israel dataset vendor'] },

  // ─────────────── TIER 2: PER-AUTHORITY (build coverage slowly) ───────────────
  { key:'auth-ckan-permit-datasets', tier:'authority',
    label:'Municipal CKAN / open-data portals publishing building-permit datasets',
    subject:'Enumerate authorities that publish a BUILDING-PERMIT dataset on an open-data portal. Known lead: Tel Aviv publishes היתרי בנייה + בקשות רישוי (nadlancenter reported a new TLV repository). Sweep data.gov.il local-authority orgs and municipal CKANs for permit packages. For each: authority, resource_id/endpoint, format (CSV/GeoJSON/ITM), declared Frequency, cross-ref key, and whether a use/type field lets you filter sports facilities.',
    hints:['data.gov.il fq=organization_type:local-authority q=היתרי בנייה','tel aviv opendata היתרי בנייה בקשות רישוי','opendata.tel-aviv.gov.il dataset building-permits','municipal CKAN permit package'] },

  { key:'auth-city-gis-permits', tier:'authority',
    label:'City GIS (ArcGIS/IView2/Complot GISNET/Systematics) exposing a permits or building layer',
    subject:'Which city GIS viewers expose a building-PERMIT layer or a buildings layer carrying permit/build-year/use attributes (not just planning)? Check Tel Aviv IView2, Jerusalem, Haifa, Rishon LeZion, Netanya, Petah Tikva, Ashdod. Trace SPA XHR (via r.jina.ai) to the backing FeatureServer. Per city: endpoint, auth-free?, ITM, permit fields present, sport-filterable?',
    hints:['gisn.tel-aviv.gov.il/arcgis/rest/services building permits היתרים layer','v5.gis-net.co.il Complot GISNET permits','city ArcGIS FeatureServer heterim','systematics permits layer'] },

  { key:'auth-datacity-platform', tier:'authority',
    label:'DataCity + other municipal open-data SaaS platforms — is a permit dataset standard? size coverage',
    subject:'Municipal open-data platforms replicate a standard dataset catalog across many cities. Enumerate which authorities run DataCity (datacity.org.il subdomains — kfar-saba, jerusalem, etc.) and peers, and whether "היתרי בנייה" is a STANDARD dataset in the catalog (so onboarding one city ≈ onboarding many). Capture platform, list of cities, whether permits are included, API pattern.',
    hints:['datacity.org.il subdomains list cities','kfar-saba.datacity.org.il dataset היתרי בנייה','jerusalem.datacity.org.il','municipal open data platform standard catalog Israel'] },

  { key:'auth-committee-decisions-pdfonly', tier:'authority',
    label:'Committee-decision portals + the PDF/email-only NO-FEED flag',
    subject:'Where a city has NO structured feed, permit info still surfaces as ועדה מקומית decision protocols. Are local/regional committee decisions (החלטות ועדה, פרוטוקולים) published in a scrapable structured way (mavat committee-decisions, בר-רשות, complot committee portals) or only PDF/notice-board? Identify a few authorities that are PDF/email-ONLY (no machine-readable permit feed) so we can flag the coverage floor. Record honestly which are non-digital.',
    hints:['mavat.iplan.gov.il החלטות ועדה מקומית','ועדה מקומית פרוטוקולים היתרים PDF','complot committee decisions portal','small municipality no open data permits'] },
];

const SCHEMA = {
  type:'object', additionalProperties:false, required:['coverage','findings'],
  properties:{
    coverage:{ type:'array', items:{ type:'object', additionalProperties:false, required:['key','type','raw','status'],
      properties:{ key:{type:'string'}, type:{enum:['url','query','site','area']}, raw:{type:'string'},
        status:{enum:['mined','partial','blocked','dead','pending']}, area:{type:'string'}, yield:{type:'string'},
        why:{type:'string'} } } },
    findings:{ type:'array', items:{ type:'object', additionalProperties:false, required:['entity','field','value','source_key'],
      properties:{ entity:{type:'string'}, field:{type:'string'}, value:{type:'string'}, source_key:{type:'string'},
        status:{enum:['verified','estimate']}, note:{type:'string'} } } },
    suggest:{ type:'array', items:{ type:'object', additionalProperties:false, required:['kind'],
      properties:{ kind:{type:'string'}, raw:{type:'string'}, why:{type:'string'} } } },
  },
};

function buildPrompt(t){
  const partPath = PARTS ? `${PARTS}/${t.key}.part` : null;
  const partBlock = partPath ? `

## INCREMENTAL CAPTURE — durability
Durability file: ${partPath}. As soon as you FINISH each source, append its records via Bash so an interruption never loses work:
  mkdir -p "${PARTS}"
  cat >> "${partPath}" <<'JSONL'
  {"_t":"coverage","key":"<canonical-key>","type":"url|query","status":"mined|partial|blocked|dead","area":"${t.key}","why":"<terse tag>"}
  {"_t":"finding","entity":"<source>","field":"access|auth|cost|data_provided|spatial|cross_ref_key|update_cadence|israel_coverage|reliability|tier|sports_filterable","value":"<...>","source_key":"<canonical-key>"}
  JSONL
One valid JSON object per line. Backup only — STILL return the full StructuredOutput at the end (authoritative).` : '';
  return `You are a DISCOVERY research agent for a data/BI team. Sole mission: find WHERE building-permit data can be obtained. You VERIFY sources and discover adjacent ones — you are NOT implementing anything.

## Context
${CTX}

## ${WON}

## Your assigned lane — TIER: ${t.tier.toUpperCase()}
${t.label}
Focus: ${t.subject}
Precise leads / hints to chase: ${(t.hints||[]).join(' · ')}

## What to return (StructuredOutput only)
For EACH concrete source/endpoint, emit findings[] rows (entity = source name) using these exact "field" strings:
- "tier" (national | authority) — REQUIRED, echo your lane's tier
- "provider" · "access" (base URL/endpoint) · "auth" (none|api-key|account-required|oauth + how) · "cost" · "data_provided" (fields exposed) · "spatial" (geo capability; "none" if not) · "cross_ref_key" (gush/helka | address | ITM | lat/lng | permit# | none) · "update_cadence" (declared Frequency OR observed lastEditDate/date_import/republish — be specific with dates) · "sports_filterable" (yes|no|partial — can you isolate sports facilities, and via which field?) · "israel_coverage" (national | list of authorities | single authority) · "reliability" (official/community/commercial; caveats/ToS)

Rules:
- PRIMARY sources; verify endpoints exist (fetch docs/JSON). For JS/SPA pages fetch via r.jina.ai/<url> and trace the XHR/network calls to the real REST endpoint.
- finding.status "verified" only when confirmed from the live endpoint/official docs; else "estimate".
- The two decision keys per source: update_cadence + cross_ref_key. A source with neither is low-value — say so in coverage.why.
- For the PER-AUTHORITY tier especially: an authority with permit info ONLY as PDF/email/notice-board (no machine-readable feed) is itself a finding — record it with sports_filterable=no and reliability noting "non-digital / no feed".
- coverage[]: ONE ROW PER SOURCE YOU TOUCH (canonical key = drop scheme/www/trailing slash; queries as "engine:collapsed text"), honest status, terse "why" whenever it did NOT become a finding (dup|404|off-topic|low-value|blocked). Never silently drop a touched source.
- Do NOT re-verify the 4 ALREADY ESTABLISHED items above — reference only.
- suggest[]: deeper leads for a next round (esp. a national permit tap, or a municipal platform that unlocks many cities at once).${partBlock}`;
}

async function agentWithRetry(prompt, opts){
  let r = null;
  for (let i=1; i<=RETRIES; i++){
    r = await agent(prompt, opts);
    if (r) return r;
    if (i < RETRIES) log(`retry ${opts.label} (${i}/${RETRIES} dropped)`);
  }
  return r;
}

phase('Permits');
const RUNSET = ONLY ? TARGETS.filter((t)=>ONLY.includes(t.key)) : TARGETS;
log(`permits hunt ${RUN}: ${RUNSET.length} agents (${RUNSET.filter(t=>t.tier==='national').length} national, ${RUNSET.filter(t=>t.tier==='authority').length} authority)`);
const results = await parallel(
  RUNSET.map((t)=>()=>
    agentWithRetry(buildPrompt(t), { label:`perm:${t.key}`, phase:'Permits', schema:SCHEMA,
      ...(MODEL?{model:MODEL}:{}), ...(EFFORT?{effort:EFFORT}:{}) }).then((r)=>({t,r}))
  )
);

const coverage=[], findings=[], suggest=[];
for (const item of results.filter(Boolean)){
  const {t,r}=item; if(!r) continue;
  for (const c of r.coverage||[]) coverage.push({...c, run:RUN, agent:t.key, tier:t.tier, targets:[t.key]});
  for (const f of r.findings||[]) findings.push({...f, run:RUN, agent:t.key, tier:t.tier});
  for (const s of r.suggest||[]) suggest.push({...s, run:RUN, agent:t.key, tier:t.tier});
}
log(`run ${RUN}: ${coverage.length} coverage, ${findings.length} findings, ${suggest.length} suggestions from ${RUNSET.length} agents`);
return { run:RUN, coverage, findings, suggest };
