// FRONTIER swarm — round 2 of the sports-facility spatial hunt (extends run 2026-07-16a).
// Each agent chases ONE cluster of the 63 `suggest` leads returned last round: precise URLs to
// field-verify + adjacent discovery. Disjoint by lane. Same neutral schema / durability / retry as
// wf-discover.js. Saved (not inline) so the frontier survives across sessions — see api-research TODO.
//
// Run: Workflow({ scriptPath: "api-research/tools/wf-frontier.js", args: { run:"2026-07-17a", model:"sonnet", effort:"medium", partsDir:"<abs>/agents" } })
// Returns { run, coverage[], findings[], suggest[] } to merge with Import-Run.

export const meta = {
  name: 'facilities-frontier-swarm',
  description: 'Round-2 frontier: field-verify 63 leads from run 2026-07-16a (spatial sports-facility sources)',
  phases: [{ title: 'Frontier', detail: 'one agent per lead-cluster' }],
};

let A = args; if (typeof A === 'string') { try { A = JSON.parse(A); } catch { A = {}; } } A = A || {};
const RUN = A.run || 'r2';
const MODEL = A.model || undefined;
const EFFORT = A.effort || 'medium';
const ONLY = Array.isArray(A.only) ? A.only : null;
const PARTS = A.partsDir || null;
const RETRIES = A.retries || 2;

const CTX = `Dashboard = strategic management dashboard for the Israeli Ministry of Culture & Sport (מינהל הספורט). Target AWS QuickSight, Hebrew/RTL. A prime goal this hunt: SPATIAL sports-facility data that (a) updates on a real cadence via API, and (b) cross-references on known keys — local authority · עמותה/ח"פ · ITM (EPSG:2039) coords · lat/lng · place_id · gush/helka. The spine source is data.gov.il "פילר 408" (מתקני ספורט, last refreshed 2021) — we are closing its freshness gap.`;

// Already-won last round — DO NOT re-scout these; only reference/extend them.
const WON = `ALREADY VERIFIED last round (do NOT re-verify, only extend/diff if your lane touches them):
1. Efshari Bari FeatureServer Health_Sport_Facility_V (services5.arcgis.com/dlrDjz89gx9qyfev, 8,494 rows, ITM, no auth) — national live master.
2. Beer Sheva CKAN (data.gov.il resource ac12e904-be38-4011-9306-bc4820eb7f41, Frequency=Year/Automat).
3. Tel Aviv IView2 (gisn.tel-aviv.gov.il/arcgis/rest/services/IView2/MapServer, layers 936/938/939/943/834, date_import per row).
4. Haifa opendata.haifa.muni.il CKAN (public_gardens, near-daily).
5. BudgetKey supports_transactions_data SQL (next.obudget.org/api/query).`;

const TARGETS = [
  { key:'telaviv-iview2-deep', label:'Tel Aviv IView2/IView2WM — field+cadence sampling of the remaining sport layers',
    subject:'Sample-query (?f=json + a few features) the not-yet-pulled sport layers to confirm fields, ITM coords, address, operator, and per-record date_import cadence. Compare IView2 (native ITM) vs IView2WM (Web-Mercator mirror). Emit access URL, data_provided, spatial, reliability(cadence) per layer.',
    hints:['gisn.tel-aviv.gov.il/arcgis/rest/services/IView2/MapServer/466 מתקני ספורט בגינות','/MapServer/420','/MapServer/696 גני שעשועים','WM/IView2WM/MapServer/936 938 939 943','?f=json outFields=* returnGeometry date_import'] },

  { key:'city-gis-replication', label:'Replicate the city-GIS pattern to more municipalities (Complot GISNET, Systematics, IView2 clones)',
    subject:'Find live public sport-facility GIS for Rishon LeZion, Netanya, Ashkelon, Nof HaGalil, and other cities using the same commercial templates. Complot GISNET V5 (v5.gis-net.co.il/v5/<city>), Systematics nearby app, IView2 product naming. Trace the network XHR to the backing FeatureServer/REST endpoint (fetch SPA via r.jina.ai). Verify auth-free + ITM + sport layer exists.',
    hints:['v5.gis-net.co.il/v5 ראשון לציון נתניה אשקלון layers=248','systematics.maps.arcgis.com apps nearby','nofhagalil.maps.arcgis.com webappviewer','ashkelon.muni.il gis.aspx'] },

  { key:'jlm-haifa-spa-trace', label:'Jerusalem + Haifa — devtools/network trace of the JS GIS viewers to reach their FeatureServers',
    subject:'Both cities have public GIS web-apps that 403 static fetches but load layers via XHR. Trace to the underlying ArcGIS REST FeatureServer for public-institution / sport / public-garden layers. Also diff human-facing muni sport pages vs their CKAN snapshots (staleness check). Fetch SPAs via r.jina.ai.',
    hints:['gisviewer.jerusalem.muni.il/arcgis/rest/services','jergisng.jerusalem.muni.il baseWab config','gis.haifa.muni.il/HaifaProjectsPublic experience.arcgis','jerusalem.muni.il sportinpublicplaces'] },

  { key:'ckan-municipal-sweep', label:'data.gov.il + odata.org.il — systematic CKAN sweep for municipal sport/park datasets with real cadence',
    subject:'package_search filtered by organization_type=local-authority and keywords ספורט/גן/מתקן. Enumerate Beer Sheva org full package list (~44). Check odata.org.il national aggregator mirroring municipal CKANs. Capture each dataset resource_id, format(GeoJSON/CSV/ITM/WGS84), and declared Frequency/Update metadata. Also interior_affairs beach/lifeguard dataset (sport-adjacent geo).',
    hints:['data.gov.il api/3/action/package_search fq=organization_type:local-authority q=ספורט','organization beer-sheva package_show','odata.org.il dataset?q=ספורט','data.gov.il מבני ציבור municipality Frequency'] },

  { key:'govmap-layers-token', label:'GovMap — enumerate sport/school/fitness layers and the API-token access path',
    subject:'Confirm provider/fields/cadence for GovMap layers beyond the known 400/408: lay=215697 (מתקני כושר), lay=17 & lay=30 (schools), 210697 (מבני ציבור), 213418 (גנים ציבוריים). Document the developer-token registration process (domain-bound) and any WFS/REST access. Read api.govmap.gov.il docs incl. Appendix B enum page.',
    hints:['govmap.gov.il/?lay=215697 מתקני כושר','govmap lay=17 lay=30 בתי ספר','api.govmap.gov.il/docs/intro/attache-b enum','govmap developer token domain-bound'] },

  { key:'efshari-moe-schools', label:'Efshari Bari full schema + MoE school-facility layers (school gyms = public sport)',
    subject:'Pull the Efshari Bari FeatureServer full field list + a sample page (do NOT re-establish it exists — get its complete schema/attributes for the diff-vs-408 plan). Then MoE institution geodata: gis.education.gov.il GFI_MAP, cdn.arcgis item 37a604bf..., MoE circular sb6bk5 referencing school sport-hall standards, resource SEMEL_מוסד → cross-ref 408 "serves-school" flag.',
    hints:['services5.arcgis.com/dlrDjz89gx9qyfev Health_Sport_Facility_V/0?f=json fields','gis.education.gov.il/gfi/GFI_MAP.aspx','cdn.arcgis.com item.html id=37a604bf41164dd9babce94746457a8d','data.gov.il resource SEMEL מוסדות חינוך'] },

  { key:'toto-pais-foi', label:'Toto / Mifal HaPayis facility list via FOI + State Comptroller (non-API paths)',
    subject:'The public winner.co.il/pais pages are WAF-blocked/stale and there is no public feed. Map the realistic acquisition paths: pais.co.il Freedom-of-Information page + Freeinfo2024.pdf, Mitkanim@most.gov.il ministry facilities-division FOI request, State Comptroller reports with facility tables, GuideStar Pais org financials. Record each as a lead with access route + what data it would yield (NOT a live API).',
    hints:['pais.co.il/info/Freedom-of-Information.aspx','pais.co.il/download/documents/Freeinfo2024.pdf','Mitkanim@most.gov.il FOI מתקני ספורט','מבקר המדינה טוטו מתקנים דוח','guidestar.org.il organization 520018714 finances'] },

  { key:'gov-national-program', label:'gov.il National Sports-Facilities Program — tenders, allocations, national map',
    subject:'The ministry 2025 National Facilities Program (₪350M+, tenders for football fields/halls). Find structured allocation data (per-locality grants), the sport-maps national-view page (JS-rendered, fetch via r.jina.ai), and the mapping_sports_facilities linked resources. Distinguish live/updating vs one-off PDF/Excel.',
    hints:['gov.il/he/Departments/General/sports_facility_program קולות קוראים','gov.il/he/pages/sport-maps','gov.il mapping_sports_facilities לצפייה בפריסה הארצית','תכנית לאומית מתקני ספורט הקצאות רשות'] },

  { key:'budgetkey-sql-deep', label:'BudgetKey / obudget — general SQL warehouse for funding→facility→authority joins',
    subject:'Document the general SQL endpoint (next.obudget.org/api/query and /api/tables) over the whole warehouse: supports_transactions_data, contract_spending, budget_items, entities_geo. Confirm columns that join funding to a recipient authority/עמותה and to geography. Note the geocode_entities processor (present, unscheduled since 2019) and the pipelines dashboard.',
    hints:['next.obudget.org/api/query?query=SELECT','next.obudget.org/api/tables','budgetkey entities_geo recipient_entity_id','pipelines.obudget.org geocode_entities'] },

  { key:'iplan-cadastre-planning', label:'IPLAN / MOIN — national land-use & cadastre polygons (sport-designated land, gush/helka cadence)',
    subject:'Verify the national planning FeatureServers: ags.iplan.gov.il/arcgisiplan/rest/services/PlanningPublic/Xplan_203* (local-plan land-use polygons, ITM), the ags.moin.gov.il mirror, per-district TMM compilation layers (merkaz/darom/haifa/tzafon), mavat.iplan.gov.il plan-search, and israel_mapping_center parcels (Freq=Month). Which expose sport/open-space land-use designation joinable by gush/helka?',
    hints:['ags.iplan.gov.il/arcgisiplan/rest/services/PlanningPublic Xplan_203','ags.moin.gov.il/arcgis/rest/services/PlanningPublic','compilation_tmm_merkaz darom haifa tzafon','mavat.iplan.gov.il','data.gov.il israel_mapping_center shape חלקות Month'] },

  { key:'arcgis-owner-resolution', label:'ArcGIS Online — resolve anonymous owner handles + generalize the sharing/rest/search discovery',
    subject:'Two of last round\'s richest live schemas came from owner handles meged-w (מתקני_ספורט, cost/contractor/repair-status) and bathenha (full audit-trail). Resolve which local authority each is (item metadata, service description, thumbnails). Then generalize the verified unauthenticated discovery method: arcgis.com/sharing/rest/search q="פארק"/"גני ציבור"/"מרחב ציבורי"/"מתקני ספורט" to surface more municipal FeatureServers.',
    hints:['arcgis.com/sharing/rest/community/users/meged-w','services3.arcgis.com/XBDMqmX1PKcVQCKG bathenha','arcgis.com/sharing/rest/search q=מתקני ספורט f=json','ArcGIS Online item owner org resolution'] },

  { key:'federations-venues', label:'Sport federations & pro-club venue directories — named venues to geocode',
    subject:'Structured/semi-structured venue lists to cross-ref: olympicsil.co.il federation directory (~40 ענפים), football.org.il / portal.football.org.il, he.wikipedia.org אצטדיוני_כדורגל_בישראל (capacity/city/team table), commercial api-sports.io/api-football venues endpoint (coverage+cost for Israel), football-state.com club pages. For each: what venue fields, Israel coverage, cost, how to join to office club records (by club name/ח"פ).',
    hints:['olympicsil.co.il ענפי ספורט federations directory','he.wikipedia.org/wiki/אצטדיוני_כדורגל_בישראל','v3.football.api-sports.io venues Israel pricing','portal.football.org.il'] },

  { key:'osm-overpass-cadence', label:'OSM — self-hosted/scheduled Overpass + true sport-in-park spatial containment',
    subject:'Confirm the path to a controlled, scheduled (daily via Geofabrik Israel extract) Overpass for leisure=pitch/sports_centre/stadium/swimming_pool with sport=* — removing the 2-slot public rate limit. Run/spec a real spatial-containment query (sport features inside leisure=park polygons) to measure sport-in-park tag completeness vs 408. Retry osm.org.il (DNS-failed last round).',
    hints:['Geofabrik israel-latest.osm.pbf daily','self-hosted Overpass API docker israel bbox','overpass leisure=pitch is_in park polygon containment','osm.org.il Israel community'] },
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
  {"_t":"finding","entity":"<source>","field":"access|auth|cost|data_provided|spatial|enrichment_idea|dashboard_use|israel_coverage|reliability|update_cadence|cross_ref_key","value":"<...>","source_key":"<canonical-key>"}
  JSONL
One valid JSON object per line. Backup only — STILL return the full StructuredOutput at the end (authoritative).` : '';
  return `You are a DISCOVERY research agent for a data/BI team, round 2 of a spatial sports-facility hunt. You VERIFY specific leads and discover adjacent sources — you are NOT implementing anything.

## Dashboard context
${CTX}

## ${WON}

## Your assigned lane
${t.label}
Focus: ${t.subject}
Precise leads / hints to chase: ${(t.hints||[]).join(' · ')}

## What to return (StructuredOutput only)
For EACH concrete source/endpoint/idea, emit findings[] rows (entity = source name) using these exact "field" strings:
- "provider" · "access" (base URL/endpoint) · "auth" (none|api-key|account-required|oauth + how) · "cost" · "data_provided" (fields exposed) · "spatial" (geo capability; "none" if not) · "cross_ref_key" (which join key it exposes: local-authority | עמותה/ח"פ | ITM | lat/lng | place_id | gush/helka | none) · "update_cadence" (declared Frequency OR observed lastEditDate/date_import/republish; be specific with dates) · "enrichment_idea" (concrete join to office records) · "dashboard_use" (which tab/visual) · "israel_coverage" · "reliability" (official/community/commercial; caveats/ToS)

Rules:
- PRIMARY sources; verify endpoints exist (fetch docs/JSON). For JS/SPA pages fetch via r.jina.ai/<url> and trace the XHR/network calls to the real REST endpoint.
- finding.status "verified" only when confirmed from the live endpoint/official docs; else "estimate".
- Prioritize the two decision keys per source: update_cadence + cross_ref_key. A source with neither is low-value — say so in coverage.why.
- coverage[]: ONE ROW PER SOURCE YOU TOUCH (canonical key = drop scheme/www/trailing slash; queries as "engine:collapsed text"), honest status, terse "why" whenever it did NOT become a finding (dup|404|off-topic|low-value|blocked). Never silently drop a touched source.
- Do NOT spend effort re-verifying the 5 ALREADY VERIFIED winners above — reference them only.
- suggest[]: deeper leads for a next round (esp. new cadence/cross-ref sources or an adjacent lane).${partBlock}`;
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

phase('Frontier');
const RUNSET = ONLY ? TARGETS.filter((t)=>ONLY.includes(t.key)) : TARGETS;
const results = await parallel(
  RUNSET.map((t)=>()=>
    agentWithRetry(buildPrompt(t), { label:`front:${t.key}`, phase:'Frontier', schema:SCHEMA,
      ...(MODEL?{model:MODEL}:{}), ...(EFFORT?{effort:EFFORT}:{}) }).then((r)=>({t,r}))
  )
);

const coverage=[], findings=[], suggest=[];
for (const item of results.filter(Boolean)){
  const {t,r}=item; if(!r) continue;
  for (const c of r.coverage||[]) coverage.push({...c, run:RUN, agent:t.key, targets:[t.key]});
  for (const f of r.findings||[]) findings.push({...f, run:RUN, agent:t.key});
  for (const s of r.suggest||[]) suggest.push({...s, run:RUN, agent:t.key});
}
log(`run ${RUN}: ${coverage.length} coverage, ${findings.length} findings, ${suggest.length} suggestions from ${RUNSET.length} agents`);
return { run:RUN, coverage, findings, suggest };
