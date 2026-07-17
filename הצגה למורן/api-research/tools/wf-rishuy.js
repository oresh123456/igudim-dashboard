// RISHUY-ZAMIN swarm — sole purpose: crack רישוי זמין (national building-permit system, מנהל התכנון / תיקון 101).
// Last round proved it has no obvious open API and is the would-be JACKPOT (one national tap obsoletes per-authority scraping).
// This run hunts three ways in: BACK DOORS (undocumented XHR/JSON/GIS/mobile endpoints), CITED SITES (civic-tech/GitHub/
// academic/journalism that already reference or scraped it), CONNECTED TOOLS (integrator, architect/BIM software, municipal
// back-office integrations with a documented API/SDK/webservice). Same neutral schema / durability / retry as wf-permits.js.
//
// Run: Workflow({ scriptPath: "api-research/tools/wf-rishuy.js", args: { run:"2026-07-17rz", model:"sonnet", effort:"medium", partsDir:"<abs>/agents" } })

export const meta = {
  name: 'rishuy-zamin-crack',
  description: 'Crack רישוי זמין national permit system — back doors, cited sites, connected tools that use its data',
  phases: [{ title: 'Rishuy', detail: 'reverse-engineer + citation + integration hunt on רישוי זמין' }],
};

let A = args; if (typeof A === 'string') { try { A = JSON.parse(A); } catch { A = {}; } } A = A || {};
const RUN = A.run || 'rishuy';
const MODEL = A.model || undefined;
const EFFORT = A.effort || 'medium';
const ONLY = Array.isArray(A.only) ? A.only : null;
const PARTS = A.partsDir || null;
const RETRIES = A.retries || 2;

const CTX = `Client = strategic dashboard for the Israeli Ministry of Culture & Sport. Single objective of THIS hunt: find any way to obtain data out of רישוי זמין — Israel's national online building-permit system run by מנהל התכנון (Planning Administration) under Amendment 101 (תיקון 101) to the Planning & Building Law. EVERY building permit in Israel is submitted/processed through it, so if any data escapes it (an API, a status-lookup endpoint, a GIS layer, a mobile-app backend, a bulk/authority interface, or a third party that already harvested it) that is the single highest-value national source for tracking whether a (sports) facility was permitted/built. We are NOT implementing — we locate and verify access paths.`;

const WON = `ALREADY ESTABLISHED (do NOT repeat — build past these):
1. רישוי זמין is transactional/account-required on the applicant side; its gov.il landing page (gov.il/.../construction_licensing_information_exchange) 403'd to automated fetch; NO open dataset found on data.gov.il (0 hits across ~15 terms + 5 orgs).
2. Guessed domains bnhp.gov.il / rishuy.gov.il / rishuy.iplan.gov.il all FAIL DNS — do not re-guess these exact strings; FIND the real host instead.
3. ags.iplan.gov.il ArcGIS server has only PlanningPublic + Utilities folders (planning/תב"ע, NOT permits). apps.iplan.gov.il = consultant-registry SPA only.
4. mavat.iplan.gov.il (מבא"ת) SV3 = committee-meeting/plan search, national+no-auth but PDF-locked, planning not permits.
5. Per-authority permit feeds already found (TLV IView2 layer 772; Complot & Bartech-net vendor portals) — this run is ONLY about the NATIONAL רישוי זמין system, not those.`;

const TARGETS = [
  { key:'rz-backdoor-xhr', lane:'back-door',
    label:'Reverse-engineer the live רישוי זמין web app — real host, XHR/JSON/REST/GIS endpoints, public status-lookup',
    subject:'Find the ACTUAL application host(s) for רישוי זמין (not the gov.il landing page). Fetch the app via r.jina.ai/<url> and trace network/XHR calls to real backend endpoints (REST/JSON/GraphQL/ArcGIS). Look specifically for: a public "בירור סטטוס בקשה"/application-status lookup, the "מידע להיתר"/"מתן מידע" pre-permit info service (often public, returns parcel planning+permit data), any /api /rest /services /gateway path, tile/GIS layers the map uses. Capture exact endpoint URLs, method, params, auth, and a sample response shape. Distinguish public-readable vs login-gated.',
    hints:['רישוי זמין מערכת התחברות אזור אישי app host','מידע להיתר מתן מידע מקוון מנהל התכנון','בירור סטטוס בקשה להיתר online','r.jina.ai fetch app + view-source for api base URL','gov.il construction_licensing_information_exchange XHR'] },

  { key:'rz-connected-tools', lane:'connected-tool',
    label:'Who BUILT it + which engineering/architect tools integrate with it via a documented API/SDK/webservice',
    subject:'Identify the system integrator/operator of רישוי זמין (government tender winner / IT vendor) and any PUBLISHED integration surface. Municipal engineering back-offices (Complot, Bartech-net, Taldor, Bynet, Malam) and architect CAD/BIM submission tools must exchange data with it — find integration guides, webservice/API specs, SOAP/REST WSDL, "ממשק" documentation, developer onboarding, SDK. A documented B2B/G2G interface is a legitimate access path. Capture vendor names, interface docs URLs, auth model, what data crosses.',
    hints:['רישוי זמין ספק מפעיל מכרז זוכה אינטגרטור','ממשק רישוי זמין webservice API מערכות הנדסה','Complot Bartech Taldor Bynet integration רישוי זמין','מדריך ממשקים מנהל התכנון רישוי','architect submission BIM plugin רישוי זמין API'] },

  { key:'rz-cited-civic-github', lane:'cited-site',
    label:'Civic-tech / GitHub / academic / journalism that already reference or scraped רישוי זמין / permit data',
    subject:'Highest-value if someone already did the work. Search GitHub (code/repos hitting a רישוי זמין or iplan permit endpoint), הסדנא לידע ציבורי / Hasadna / obudget/BudgetKey (they built gov data pipelines — do they ingest permits?), academic papers, data-journalism (TheMarker/Calcalist/Shomrim/Local-Call datasets on building permits), civic datasets, and developer forums/blogs describing the endpoints. Capture repo/paper/article URL, exactly which endpoint or dataset they used, and whether it is reusable.',
    hints:['github רישוי זמין OR iplan OR bakashot heter permit scraper','hasadna.org.il datagov permits obudget building','site:github.com iplan.gov.il OR mavat api','דאטה היתרי בנייה עיתונות נתונים פרויקט','academic paper Israel building permits open data endpoint'] },

  { key:'rz-govtech-foia-bulk', lane:'connected-tool',
    label:'Gov procurement / רשות התקשוב specs / data-sharing + a bulk-or-authority interface to permit data',
    subject:'Government-side paper trail that documents a data interface: רשות התקשוב הממשלתי (Digital Israel / ממשל זמין) API catalog, gov.il developer hub, מכרזים/RFP technical appendices describing רישוי זמין data model & interfaces, data-sharing decisions (החלטת ממשלה / חוק שיתוף מידע) that expose permit data to other bodies, and whether a local authority or a ministry can request a bulk/API feed. Also check if permit outcomes flow into a public dashboard (לוח בקרה / דוחות ציבוריים) or into CBS/data.gov.il via a back channel. Record acquisition route + what data it yields, even if it is FOI/agreement not a live API.',
    hints:['רשות התקשוב API קטלוג ממשקים ממשלתיים building permit','gov.il מכרז רישוי זמין מפרט טכני נספח ממשקים','חוק שיתוף מידע רשויות מנהל התכנון היתרים','דוחות רישוי זמין לוח בקרה סטטיסטיקה היתרים ציבורי','digital.gov.il data sharing permits authority feed'] },
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
  {"_t":"finding","entity":"<source>","field":"access|auth|cost|data_provided|spatial|cross_ref_key|update_cadence|access_path|reliability|lane","value":"<...>","source_key":"<canonical-key>"}
  JSONL
One valid JSON object per line. Backup only — STILL return the full StructuredOutput at the end (authoritative).` : '';
  return `You are a DISCOVERY / reverse-engineering research agent for a data/BI team. Sole mission: find a way to GET DATA out of רישוי זמין. You locate and verify access paths — you are NOT implementing, and you do NOT attempt authentication bypass, credential guessing, or anything that isn't reading public/semipublic surfaces and documentation.

## Context
${CTX}

## ${WON}

## Your assigned lane — ${t.lane.toUpperCase()}
${t.label}
Focus: ${t.subject}
Precise leads / hints to chase: ${(t.hints||[]).join(' · ')}

## What to return (StructuredOutput only)
For EACH concrete endpoint / repo / doc / tool / route, emit findings[] rows (entity = the thing found) using these exact "field" strings:
- "lane" (back-door | cited-site | connected-tool) — REQUIRED, echo your lane
- "provider" · "access" (exact URL/endpoint/repo/doc) · "auth" (none|account-required|api-key|oauth|FOI-only + how) · "cost" · "data_provided" (what fields/records it yields) · "spatial" (geo capability; "none") · "cross_ref_key" (gush/helka|address|ITM|lat/lng|permit#|none) · "update_cadence" (live|declared Frequency|unknown) · "sports_filterable" (yes|no|partial + via which field) · "access_path" (how one actually gets the data: live-GET | login | vendor-integration | FOI/agreement | scrape) · "israel_coverage" (national|subset) · "reliability" (official|community|commercial + ToS/caveats)

Rules:
- Find the REAL host/endpoint — do not re-report the 3 dead DNS guesses. For JS/SPA apps fetch via r.jina.ai/<url> and read the bundle/network for the API base URL.
- finding.status "verified" only when you actually reached the endpoint/repo/doc; else "estimate".
- A DOCUMENTED but access-gated interface (vendor webservice, FOI, data-sharing agreement) is a valid finding — record it with the honest access_path, don't discard it.
- Stay lawful: only public/semipublic reading + published docs. No auth bypass, no scraping behind logins, no credential work. If a path requires an account/agreement, note it as such rather than attempting entry.
- coverage[]: ONE ROW PER SOURCE YOU TOUCH (canonical key = drop scheme/www/trailing slash; queries as "engine:collapsed text"), honest status, terse "why" whenever it did NOT become a finding.
- suggest[]: the single most promising deeper thread for a next round.${partBlock}`;
}

async function agentWithRetry(prompt, opts){
  let r = null;
  for (let i=1; i<=RETRIES; i++){ r = await agent(prompt, opts); if (r) return r; if (i<RETRIES) log(`retry ${opts.label} (${i}/${RETRIES})`); }
  return r;
}

phase('Rishuy');
const RUNSET = ONLY ? TARGETS.filter((t)=>ONLY.includes(t.key)) : TARGETS;
log(`rishuy-zamin crack ${RUN}: ${RUNSET.length} agents (${RUNSET.map(t=>t.lane).join(', ')})`);
const results = await parallel(
  RUNSET.map((t)=>()=>
    agentWithRetry(buildPrompt(t), { label:`rz:${t.key}`, phase:'Rishuy', schema:SCHEMA,
      ...(MODEL?{model:MODEL}:{}), ...(EFFORT?{effort:EFFORT}:{}) }).then((r)=>({t,r}))
  )
);

const coverage=[], findings=[], suggest=[];
for (const item of results.filter(Boolean)){
  const {t,r}=item; if(!r) continue;
  for (const c of r.coverage||[]) coverage.push({...c, run:RUN, agent:t.key, lane:t.lane, targets:[t.key]});
  for (const f of r.findings||[]) findings.push({...f, run:RUN, agent:t.key, lane:t.lane});
  for (const s of r.suggest||[]) suggest.push({...s, run:RUN, agent:t.key, lane:t.lane});
}
log(`run ${RUN}: ${coverage.length} coverage, ${findings.length} findings, ${suggest.length} suggestions from ${RUNSET.length} agents`);
return { run:RUN, coverage, findings, suggest };
