// ============================================================
// app.js — data-driven dashboard engine
// Reads MOCK.* from data.js, populates filters, renders charts
// ============================================================
(function() {
'use strict';

// ── Lookup caches ──
const branchMap = {}; MOCK.dim_branchs.forEach(b => branchMap[b.branch_id] = b);
const authMap = {};   MOCK.dim_authority.forEach(a => authMap[a.authority_id] = a);
const BR = id => branchMap[id];
const AU = id => authMap[id];

// ── Tab switching ──
const tabs = document.querySelectorAll('.tab');
const pages = document.querySelectorAll('.page');
tabs.forEach(t => t.addEventListener('click', () => {
  const tgt = t.dataset.tab;
  tabs.forEach(x => x.classList.toggle('active', x === t));
  pages.forEach(p => p.classList.toggle('active', p.id === 'page-' + tgt));
  renderPage(tgt);
}));

// ── Chart.js defaults ──
Chart.defaults.font.family = "'Heebo', sans-serif";
Chart.defaults.font.size = 12;
Chart.defaults.color = '#1A1A1A';
Chart.defaults.borderColor = '#E5E1D8';

const TEAL = '#0D5F73', TEAL_L = '#5BB1C7', TEAL_P = '#B8DDE9';
const AMBER = '#B45309', AMBER_L = '#EBA75C', AMBER_P = '#F7DBB1';
const WOMEN = '#86198F', WOMEN_L = '#C57FCF', WOMEN_P = '#E8C8ED';
const ENT_C = ['#9F1239','#C2410C','#92400E','#A16207','#3F6212','#0F766E','#1D4ED8','#5B21B6','#86198F','#9D174D','#7C2D12','#1F2937'];

const fmtM = v => '₪' + v.toLocaleString('he-IL') + 'M';
const fmtN = v => v.toLocaleString('he-IL');

// ── Data labels plugin ──
Chart.register({
  id: 'dataLabels',
  afterDatasetsDraw(chart, args, opts) {
    if (opts && opts.display === false) return;
    const ctx = chart.ctx, ct = chart.config.type;
    const fmt = (opts && opts.formatter) || (v => typeof v === 'number' ? v.toLocaleString('he-IL') : String(v));
    ctx.save(); ctx.font = '600 10px Heebo, sans-serif'; ctx.fillStyle = '#1A1A1A';
    chart.data.datasets.forEach((ds, di) => {
      if (ds.dataLabels && ds.dataLabels.display === false) return;
      const dsFmt = (ds.dataLabels && ds.dataLabels.formatter) || fmt;
      const meta = chart.getDatasetMeta(di);
      if (meta.hidden) return;
      meta.data.forEach((el, idx) => {
        const raw = ds.data[idx]; if (raw == null) return;
        let val, txt;
        if (typeof raw === 'object') { val = raw.y; txt = raw.name || dsFmt(raw.y, idx); }
        else { val = raw; txt = dsFmt(val, idx); }
        if (ct === 'doughnut' || ct === 'pie') {
          const p = el.tooltipPosition(); ctx.fillStyle = '#FFF'; ctx.font = '700 12px Heebo, sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(val + '%', p.x, p.y);
          ctx.fillStyle = '#1A1A1A'; ctx.font = '600 10px Heebo, sans-serif'; return;
        }
        const isH = ct === 'bar' && chart.options.indexAxis === 'y';
        if (isH) { ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(txt, el.x + 4, el.y); }
        else if (ct === 'line') { ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(txt, el.x, el.y - 5); }
        else { ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(txt, el.x, el.y - 4); }
      });
    });
    ctx.restore();
  }
});

// ── Option factories ──
function hbarOpts(fmt) {
  return { responsive:true, maintainAspectRatio:false, indexAxis:'y',
    plugins:{ legend:{display:false}, tooltip:{rtl:true, callbacks:{label:c=>fmt(c.parsed.x)}}, dataLabels:{formatter:fmt} },
    scales:{ x:{ticks:{callback:fmt,font:{size:11},color:'#9A9A9A'},grid:{color:'#EFEBE3',drawBorder:false}},
             y:{position:'right',ticks:{font:{size:12},color:'#1A1A1A'},grid:{display:false,drawBorder:false}} } };
}
function pieOpts() {
  return { responsive:true, maintainAspectRatio:false, cutout:'52%',
    plugins:{ legend:{display:true,position:'bottom',rtl:true,labels:{font:{size:11},color:'#1A1A1A',boxWidth:10,boxHeight:10,padding:12}},
              tooltip:{rtl:true,callbacks:{label:c=>c.label+': '+c.parsed+'%'}} } };
}
function lineOpts(fmt,xT,showLbl) {
  return { responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{display:false}, tooltip:{rtl:true,callbacks:{label:c=>fmt(c.parsed.y)}}, dataLabels:{formatter:fmt,display:showLbl!==false} },
    scales:{ x:{title:{display:!!xT,text:xT,font:{size:11},color:'#9A9A9A'},ticks:{font:{size:11},color:'#6B6B6B'},grid:{display:false,drawBorder:false}},
             y:{ticks:{callback:fmt,font:{size:11},color:'#9A9A9A'},grid:{color:'#EFEBE3',drawBorder:false},beginAtZero:true} } };
}
function grpHbarOpts(fmt) {
  return { responsive:true, maintainAspectRatio:false, indexAxis:'y',
    plugins:{ legend:{display:true,position:'bottom',rtl:true,reverse:true,labels:{font:{size:12},color:'#1A1A1A',boxWidth:14,boxHeight:10,padding:14}},
              tooltip:{rtl:true,callbacks:{label:c=>c.dataset.label+': '+fmt(c.parsed.x)}}, dataLabels:{formatter:fmt} },
    scales:{ x:{ticks:{callback:fmt,font:{size:11},color:'#9A9A9A'},grid:{color:'#EFEBE3',drawBorder:false}},
             y:{position:'right',ticks:{font:{size:12},color:'#1A1A1A'},grid:{display:false,drawBorder:false}} } };
}
function grpVbarOpts(fmt,xT) {
  return { responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{display:true,position:'bottom',rtl:true,labels:{font:{size:12},color:'#1A1A1A',boxWidth:14,boxHeight:10,padding:14}},
              tooltip:{rtl:true,callbacks:{label:c=>c.dataset.label+': '+fmt(c.parsed.y)}}, dataLabels:{formatter:fmt} },
    scales:{ x:{title:{display:!!xT,text:xT,font:{size:11},color:'#9A9A9A'},ticks:{font:{size:11},color:'#1A1A1A'},grid:{display:false,drawBorder:false}},
             y:{ticks:{callback:fmt,font:{size:11},color:'#9A9A9A'},grid:{color:'#EFEBE3',drawBorder:false},beginAtZero:true} } };
}
function yoyTotOpts(fmt) {
  return { responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{display:false}, tooltip:{rtl:true,callbacks:{label:c=>fmt(c.parsed.y)}}, dataLabels:{formatter:fmt} },
    scales:{ x:{grid:{display:false},ticks:{font:{size:11,weight:'500'},color:'#6B6B6B'},border:{display:false}},
             y:{display:false,beginAtZero:true,grace:'20%'} }, layout:{padding:{top:22,bottom:4}} };
}
function threshOpts() {
  return { responsive:true, maintainAspectRatio:false, indexAxis:'y',
    plugins:{ legend:{display:true,position:'bottom',rtl:true,align:'start',labels:{font:{size:11},color:'#1A1A1A',boxWidth:10,boxHeight:10,padding:8}},
              tooltip:{rtl:true,filter:i=>i.parsed.x>0,callbacks:{label:c=>c.dataset.label+' — דורש השלמה'}}, dataLabels:{display:false} },
    scales:{ x:{stacked:true,beginAtZero:true,ticks:{stepSize:1,precision:0,font:{size:11},color:'#9A9A9A'},grid:{color:'#EFEBE3',drawBorder:false},
               title:{display:true,text:'מספר שטרם השלימו',font:{size:11},color:'#9A9A9A'}},
             y:{stacked:true,position:'right',ticks:{font:{size:13,weight:'500'},color:'#1A1A1A'},grid:{display:false,drawBorder:false}} } };
}
function dualLineOpts(fmt) {
  return { responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{display:true,position:'bottom',rtl:true,labels:{font:{size:12},color:'#1A1A1A',boxWidth:14,boxHeight:10,padding:14}},
              tooltip:{rtl:true,callbacks:{label:c=>c.dataset.label+': '+fmt(c.parsed.y)}}, dataLabels:{display:false} },
    scales:{ x:{title:{display:true,text:'גיל (שנים)',font:{size:11},color:'#9A9A9A'},ticks:{font:{size:11},color:'#6B6B6B'},grid:{display:false,drawBorder:false}},
             y:{ticks:{callback:fmt,font:{size:11},color:'#9A9A9A'},grid:{color:'#EFEBE3',drawBorder:false},beginAtZero:true} } };
}
function stackHbarOpts(fmt) {
  return { responsive:true, maintainAspectRatio:false, indexAxis:'y',
    plugins:{ legend:{display:true,position:'right',rtl:true,align:'center',
                labels:{font:{size:11},color:'#1A1A1A',boxWidth:12,boxHeight:12,padding:14}},
              tooltip:{rtl:true,callbacks:{label:c=>c.dataset.label+': '+fmt(c.parsed.x)}}, dataLabels:{display:false} },
    scales:{ x:{stacked:true,ticks:{callback:fmt,font:{size:11},color:'#9A9A9A'},grid:{color:'#EFEBE3',drawBorder:false}},
             y:{stacked:true,position:'right',ticks:{font:{size:12},color:'#1A1A1A'},grid:{display:false,drawBorder:false}} },
    layout:{ padding:{ right: 0 } } };
}

// ── Budget bands (מבחן תמיכה 2026, עמ' 8) ──
// Weights are the official % allocations from the regulation.
// ב'/ג' weight depends on branch type (olympic/non-olympic × team/individual).
// ד' (מועדפים 16.37%) is determined by the ministry per-branch; we include it
// only for branches whose sport_type is flagged as preferred.
const BUDGET_BANDS = [
  { key: "א׳ ענפי על",  color: '#0D5F73', base: 37.85 },
  { key: "ב׳ קבוצתי",  color: '#1D4ED8', base: null  },
  { key: "ג׳ אישי",    color: '#B45309', base: null  },
  { key: "ד׳ מועדפים", color: '#2F7D5B', base: null  },
  { key: "ה׳ מאמנים",  color: '#7C3AED', base:  6.19 },
];
function bandWeights(r) {
  const b = BR(r.branch_id);
  const olympic = b?.is_olympic_branch === 1;
  const team    = b?.personal_or_group === 'קבוצתי';
  const pref    = b?.sport_type === 'מועדפים'; // preferred flag if present
  const special = b?.sport_type === 'חשיבה' || b?.sport_type === 'פראלימפי' || b?.sport_type === 'צרכים מיוחדים';
  return {
    "א׳ ענפי על":  37.85,
    "ב׳ קבוצתי":  (team && !special) ? (olympic ? 9.35 : 2.07) : 0,
    "ג׳ אישי":    (!team && !special) ? (olympic ? 21.60 : 3.08) : 0,
    "ד׳ מועדפים": pref ? 16.37 : 0,
    "ה׳ מאמנים":  6.19,
  };
}
function recordBandBudgets(r) {
  const w = bandWeights(r);
  const tot = Object.values(w).reduce((s,v)=>s+v, 0);
  if (!tot) return Object.fromEntries(BUDGET_BANDS.map(b=>[b.key,0]));
  const bud = r.total_budget || 0;
  return Object.fromEntries(Object.entries(w).map(([k,v])=>[k, (v/tot)*bud]));
}
function aggBandBudgets(records) {
  const res = Object.fromEntries(BUDGET_BANDS.map(b=>[b.key, 0]));
  records.forEach(r => {
    const bb = recordBandBudgets(r);
    BUDGET_BANDS.forEach(b => res[b.key] += (bb[b.key]||0));
  });
  return res;
}

// ── Chart instance store ──
const CI = {};
function mc(id, cfg) { if (CI[id]) CI[id].destroy(); const el = document.getElementById(id); if (el) CI[id] = new Chart(el, cfg); }

// ── Data helpers ──
function grpSum(arr, k, v) {
  const m = {}; arr.forEach(r => { const key = r[k]||'לא ידוע'; m[key] = (m[key]||0) + (r[v]||0); });
  return Object.entries(m).sort((a,b) => b[1]-a[1]);
}
function grpCnt(arr, k) {
  const m = {}; arr.forEach(r => { const key = r[k]||'לא ידוע'; m[key] = (m[key]||0) + 1; });
  return Object.entries(m).sort((a,b) => b[1]-a[1]);
}

// ── Filter DOM helpers ──
function pg(id) { return document.getElementById('page-' + id); }
function sel(pageEl, label) {
  for (const f of pageEl.querySelectorAll('.filter')) {
    const l = f.querySelector('label'); if (l && l.textContent.trim() === label) return f.querySelector('select');
  } return null;
}
function sv(pageEl, label) { const s = sel(pageEl, label); const v = s ? s.value : ''; return (!v || v === 'הכל') ? '' : v; }
function ageR(pageEl) {
  const ins = pageEl.querySelectorAll('.age-num');
  return ins.length === 2 ? [parseInt(ins[0].value)||0, parseInt(ins[1].value)||120] : [0,120];
}
function fillSel(s, opts) {
  if (!s) return; const cur = s.value;
  s.innerHTML = '<option value="">הכל</option>';
  opts.forEach(o => { const op = document.createElement('option'); op.value = o; op.textContent = o; s.appendChild(op); });
  if (cur && opts.includes(cur)) s.value = cur;
}
function setKPI(pageEl, vals) {
  const els = pageEl.querySelectorAll('.kpi-value');
  vals.forEach((v,i) => { if (els[i]) els[i].textContent = v; });
}

// ── Matching helpers ──
function mOlympic(bid, fv) {
  if (!fv) return true; const b = BR(bid); if (!b) return true;
  if (fv === 'אולימפי') return b.is_olympic_branch === 1;
  if (fv === 'פרה-אולימפי') return b.sport_type === 'פראלימפי' || b.sport_type === 'צרכים מיוחדים';
  if (fv === 'לא אולימפי') return b.is_olympic_branch === 0 && b.sport_type !== 'פראלימפי' && b.sport_type !== 'צרכים מיוחדים';
  return true;
}
function mSport(bid, fv) {
  if (!fv) return true; const b = BR(bid); return b ? b.personal_or_group === fv : true;
}

// ── Filter SR ──
function fSR(reqs, p, assocLabel) {
  const a = sv(p, assocLabel||'איגוד'), br = sv(p,'ענף'), ol = sv(p,'סיווג אולימפי'),
        st = sv(p,'סוג ענף'), soc = sv(p,'אגודה'), tm = sv(p,'קבוצה'), comp = sv(p,'תחרויות');
  return reqs.filter(r => {
    if (a && r.association_name !== a) return false;
    if (br && r.branch_name !== br) return false;
    if (!mOlympic(r.branch_id, ol)) return false;
    if (!mSport(r.branch_id, st)) return false;
    if (soc && r.society_name !== soc) return false;
    if (tm && r.team_name !== tm) return false;
    if (comp === 'אליפות אירופה' && r.request_type !== 'אליפות אירופה') return false;
    if (comp === 'שום תחרות' && r.request_type === 'אליפות אירופה') return false;
    return true;
  });
}

// ── Filter Athletes ──
function fATH(ath, p, assocLabel) {
  const a = sv(p, assocLabel||'איגוד'), br = sv(p,'ענף'), ol = sv(p,'סיווג אולימפי'),
        st = sv(p,'סוג ענף'), gn = sv(p,'מגדר'), soc = sv(p,'אגודה'), tm = sv(p,'קבוצה');
  const [aMin, aMax] = ageR(p);
  return ath.filter(r => {
    if (a && r.association_name !== a) return false;
    if (br && r.branch_name !== br) return false;
    if (!mOlympic(r.branch_id, ol)) return false;
    if (!mSport(r.branch_id, st)) return false;
    if (gn === 'נשים' && r.athlete_gender !== 'נקבה') return false;
    if (gn === 'גברים' && r.athlete_gender !== 'זכר') return false;
    if (soc && r.society_name !== soc) return false;
    if (tm && r.team_name !== tm) return false;
    if (r.age < aMin || r.age > aMax) return false;
    return true;
  });
}

// ── Age distribution helper ──
function ageDist(athletes, gender) {
  const counts = {};
  athletes.filter(a => !gender || a.athlete_gender === gender)
    .forEach(a => { const age = a.age; counts[age] = (counts[age]||0) + 1; });
  const labels = []; const data = [];
  for (let i = 6; i <= 50; i++) { labels.push(String(i)); data.push(counts[i]||0); }
  return { labels, data };
}

// ── Authority-based grouping ──
function byCluster(athletes, field, gender) {
  const m = {};
  athletes.filter(a => !gender || a.athlete_gender === gender).forEach(a => {
    const auth = AU(a.authority_id); if (!auth) return;
    const k = auth[field]; if (k == null) return;
    m[k] = (m[k]||0) + 1;
  });
  return m;
}
function byClusterScore(athletes, field, gender) {
  const m = {};
  athletes.filter(a => !gender || a.athlete_gender === gender).forEach(a => {
    const auth = AU(a.authority_id); if (!auth) return;
    const k = auth[field]; if (k == null) return;
    m[k] = (m[k]||0) + (a.athlete_final_score||0);
  });
  return m;
}
function srByCluster(reqs, field, valField) {
  const m = {};
  reqs.forEach(r => {
    const auth = AU(r.authority_id); if (!auth) return;
    const k = auth[field]; if (k == null) return;
    m[k] = (m[k]||0) + (r[valField]||0);
  });
  return m;
}


// ============================================================
// RENDER: Budget / Federations (BF)
// ============================================================
function renderBF() {
  const p = pg('bf');
  const all = MOCK.fact_support_request_spo.filter(r => r.request_type_filter === 'איגוד');
  const f = fSR(all, p, 'איגוד');
  const r26 = f.filter(r => r.support_request_year === 2026);
  const r25 = f.filter(r => r.support_request_year === 2025);

  const tot = r26.reduce((s,r) => s+(r.total_budget||0), 0);
  const ids = new Set(r26.map(r => r.association_id));
  const avg = ids.size ? tot/ids.size : 0;
  const oIds = new Set(r26.filter(r => BR(r.branch_id)?.is_olympic_branch===1).map(r=>r.association_id));
  setKPI(p, ['₪'+(tot/1e6).toFixed(1)+'M', fmtN(ids.size), '₪'+(avg/1e6).toFixed(2)+'M', fmtN(oIds.size)]);

  // by federation — stacked by budget band (רצועות ראשיות)
  const byA = grpSum(r26, 'association_name', 'total_budget');
  const t10 = byA.slice(0,10);
  const fedBB = {};
  t10.forEach(([nm]) => { fedBB[nm] = aggBandBudgets(r26.filter(r=>r.association_name===nm)); });
  const activeBands = BUDGET_BANDS.filter(b => t10.some(([nm])=>(fedBB[nm][b.key]||0)>0));
  mc('bf_byFederation', { type:'bar', data:{ labels:t10.map(e=>e[0]),
    datasets: activeBands.map(b=>({
      label: b.key,
      data: t10.map(([nm])=>+((fedBB[nm][b.key]||0)/1e6).toFixed(2)),
      backgroundColor: b.color, borderRadius: 2, barThickness: 22,
    }))}, options:stackHbarOpts(fmtM) });

  // olympic doughnut
  const oB = r26.filter(r => BR(r.branch_id)?.is_olympic_branch===1).reduce((s,r)=>s+(r.total_budget||0),0);
  const oP = tot ? Math.round(oB/tot*100) : 0;
  mc('bf_olympic', { type:'doughnut', data:{ labels:['אולימפי','לא אולימפי'],
    datasets:[{data:[oP,100-oP], backgroundColor:[TEAL,TEAL_L], borderWidth:2, borderColor:'#FFF'}]}, options:pieOpts() });

  // branch type doughnut
  const tB = r26.filter(r => BR(r.branch_id)?.personal_or_group==='קבוצתי').reduce((s,r)=>s+(r.total_budget||0),0);
  const tP = tot ? Math.round(tB/tot*100) : 0;
  mc('bf_branchType', { type:'doughnut', data:{ labels:['קבוצתי','אישי'],
    datasets:[{data:[tP,100-tP], backgroundColor:[TEAL,TEAL_L], borderWidth:2, borderColor:'#FFF'}]}, options:pieOpts() });

  // תקציב לפי הישגיות
  const achBudget = {}, achScore = {};
  r26.forEach(r => {
    const nm = r.association_name;
    achBudget[nm] = (achBudget[nm]||0) + (r.total_budget||0);
    achScore[nm] = (achScore[nm]||0) + (r.male_achievement_score||0) + (r.female_achievement_score||0);
  });
  const achSorted = Object.entries(achScore).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const achNames = achSorted.map(e=>e[0]);
  mc('bf_byAchievement', { type:'bar', data:{ labels:achNames,
    datasets:[{data:achNames.map(n=>+((achBudget[n]||0)/1e6).toFixed(1)),
      backgroundColor:AMBER, borderRadius:2, barThickness:16,
      dataLabels:{formatter:(v,idx)=>fmtM(v)+' | '+achScore[achNames[idx]].toFixed(0)+' נק\'  '}}]},
    options:hbarOpts(v=>fmtM(v)) });

  // YoY comparison
  const m26 = Object.fromEntries(grpSum(r26,'association_name','total_budget'));
  const m25 = Object.fromEntries(grpSum(r25,'association_name','total_budget'));
  const names = byA.slice(0,10).map(e=>e[0]);
  mc('bf_yoyComparison', { type:'bar', data:{ labels:names,
    datasets:[
      {label:'2026', data:names.map(n=>+((m26[n]||0)/1e6).toFixed(1)), backgroundColor:TEAL, borderRadius:2},
      {label:'2025', data:names.map(n=>+((m25[n]||0)/1e6).toFixed(1)), backgroundColor:TEAL_L, borderRadius:2}
    ]}, options:grpHbarOpts(fmtM) });

  // YoY total
  const t25 = r25.reduce((s,r)=>s+(r.total_budget||0),0);
  mc('bf_yoyTotal', { type:'bar', data:{ labels:['2025','2026'],
    datasets:[{data:[+(t25/1e6).toFixed(1),+(tot/1e6).toFixed(1)], backgroundColor:[TEAL_L,TEAL], borderRadius:3, barThickness:32}]},
    options:yoyTotOpts(fmtM) });
}


// ============================================================
// RENDER: Budget / Associations (BA)
// ============================================================
function renderBA() {
  const p = pg('ba');
  const all = MOCK.fact_support_request_spo.filter(r => r.request_type_filter === 'אגודה');
  const f = fSR(all, p, 'איגוד');  // BA page has no 'איגוד' filter; it has 'אגודה'
  const r26 = f.filter(r => r.support_request_year === 2026);
  const r25 = f.filter(r => r.support_request_year === 2025);

  const tot = r26.reduce((s,r)=>s+(r.total_budget||0),0);
  const socIds = new Set(r26.filter(r=>r.society_id).map(r=>r.society_id));
  const avg = socIds.size ? tot/socIds.size : 0;
  const tmCodes = new Set(r26.filter(r=>r.team_code).map(r=>r.team_code));
  setKPI(p, ['₪'+(tot/1e6).toFixed(1)+'M', fmtN(socIds.size), '₪'+(avg/1e6).toFixed(2)+'M', fmtN(tmCodes.size)]);

  // by society — stacked by budget band (רצועות ראשיות)
  const bySoc = grpSum(r26, 'society_name', 'total_budget');
  const t10 = bySoc.slice(0,10);
  const assocBB = {};
  t10.forEach(([nm]) => { assocBB[nm] = aggBandBudgets(r26.filter(r=>r.society_name===nm)); });
  const assocActiveBands = BUDGET_BANDS.filter(b => t10.some(([nm])=>(assocBB[nm][b.key]||0)>0));
  mc('ba_byAssoc', { type:'bar', data:{ labels:t10.map(e=>e[0]),
    datasets: assocActiveBands.map(b=>({
      label: b.key,
      data: t10.map(([nm])=>+((assocBB[nm][b.key]||0)/1e6).toFixed(2)),
      backgroundColor: b.color, borderRadius: 2, barThickness: 22,
    }))}, options:stackHbarOpts(fmtM) });

  // by city (authority)
  const byCity = grpSum(r26, 'authority_name', 'total_budget');
  const cT10 = byCity.filter(e=>e[0]!=='לא ידוע').slice(0,10);
  mc('ba_byCity', { type:'bar', data:{ labels:cT10.map(e=>e[0]),
    datasets:[{data:cT10.map(e=>+(e[1]/1e6).toFixed(1)), backgroundColor:TEAL, borderRadius:2, barThickness:18}]}, options:hbarOpts(fmtM) });

  // by peripherality
  const periMap = srByCluster(r26, 'peripherality_cluster', 'total_budget');
  const periLabels = ['1 - פריפריאלי','2','3','4','5 - מרכז'];
  mc('ba_byPeriphery', { type:'bar', data:{ labels:periLabels,
    datasets:[{data:[1,2,3,4,5].map(k=>+((periMap[k]||0)/1e6).toFixed(1)), backgroundColor:TEAL, borderRadius:2, barThickness:22}]}, options:hbarOpts(fmtM) });

  // by socioeconomic
  const socioMap = srByCluster(r26, 'socioeconomic_cluster', 'total_budget');
  mc('ba_bySocio', { type:'line', data:{ labels:['1','2','3','4','5','6','7','8','9','10'],
    datasets:[{data:[1,2,3,4,5,6,7,8,9,10].map(k=>+((socioMap[k]||0)/1e6).toFixed(1)),
      borderColor:TEAL, backgroundColor:'rgba(13,95,115,.1)', fill:true, tension:.35, pointRadius:3,
      pointBackgroundColor:TEAL, pointBorderColor:'#FFF', pointBorderWidth:1.5, borderWidth:2}]},
    options:lineOpts(fmtM,'אשכול סוציו-אקונומי') });

  // by team
  const byTm = grpSum(r26.filter(r=>r.team_name), 'team_name', 'total_budget');
  const tmT10 = byTm.slice(0,10);
  mc('ba_byTeam', { type:'bar', data:{ labels:tmT10.map(e=>e[0]),
    datasets:[{data:tmT10.map(e=>+(e[1]/1e6).toFixed(1)), backgroundColor:TEAL, borderRadius:2, barThickness:18}]}, options:hbarOpts(fmtM) });

  // תקציב לפי הישגיות (BA)
  const baAchBudget = {}, baAchScore = {};
  r26.forEach(r => {
    const nm = r.society_name || r.association_name;
    baAchBudget[nm] = (baAchBudget[nm]||0) + (r.total_budget||0);
    baAchScore[nm] = (baAchScore[nm]||0) + (r.male_achievement_score||0) + (r.female_achievement_score||0);
  });
  const baAchSorted = Object.entries(baAchScore).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const baAchNames = baAchSorted.map(e=>e[0]);
  mc('ba_byAchievement', { type:'bar', data:{ labels:baAchNames,
    datasets:[{data:baAchNames.map(n=>+((baAchBudget[n]||0)/1e6).toFixed(1)),
      backgroundColor:AMBER, borderRadius:2, barThickness:18,
      dataLabels:{formatter:(v,idx)=>fmtM(v)+' | '+baAchScore[baAchNames[idx]].toFixed(0)+' נק\'  '}}]},
    options:hbarOpts(v=>fmtM(v)) });

  // YoY
  const m26 = Object.fromEntries(grpSum(r26,'society_name','total_budget'));
  const m25 = Object.fromEntries(grpSum(r25,'society_name','total_budget'));
  const names = bySoc.slice(0,10).map(e=>e[0]);
  mc('ba_yoyComparison', { type:'bar', data:{ labels:names,
    datasets:[
      {label:'2026', data:names.map(n=>+((m26[n]||0)/1e6).toFixed(1)), backgroundColor:TEAL, borderRadius:2},
      {label:'2025', data:names.map(n=>+((m25[n]||0)/1e6).toFixed(1)), backgroundColor:TEAL_L, borderRadius:2}
    ]}, options:grpHbarOpts(fmtM) });
  const t25 = r25.reduce((s,r)=>s+(r.total_budget||0),0);
  mc('ba_yoyTotal', { type:'bar', data:{ labels:['2025','2026'],
    datasets:[{data:[+(t25/1e6).toFixed(1),+(tot/1e6).toFixed(1)], backgroundColor:[TEAL_L,TEAL], borderRadius:3, barThickness:32}]},
    options:yoyTotOpts(fmtM) });
}


// ============================================================
// RENDER: Athletes / Federations (AF)
// ============================================================
function renderAF() {
  const p = pg('af');
  const ath = fATH(MOCK.fact_athlete, p, 'איגוד');
  const ath26 = ath.filter(a => a.support_request_year === 2026);
  const ath25 = ath.filter(a => a.support_request_year === 2025);

  const total = ath26.length;
  const fedIds = new Set(ath26.map(a=>a.association_id));
  const avg = fedIds.size ? Math.round(total/fedIds.size) : 0;
  const femPct = total ? ((ath26.filter(a=>a.athlete_gender==='נקבה').length/total)*100).toFixed(1)+'%' : '0%';
  setKPI(p, [fmtN(total), fmtN(fedIds.size), fmtN(avg), femPct]);

  // by federation (stacked by gender)
  const byFed = grpCnt(ath26, 'association_name');
  const topFeds = byFed.slice(0,10).map(e=>e[0]);
  const maleByFed = topFeds.map(n => ath26.filter(a=>a.association_name===n&&a.athlete_gender==='זכר').length);
  const femByFed = topFeds.map(n => ath26.filter(a=>a.association_name===n&&a.athlete_gender==='נקבה').length);
  mc('af_byFederation', { type:'bar', data:{ labels:topFeds,
    datasets:[
      {label:'גברים', data:maleByFed, backgroundColor:AMBER, borderRadius:2, barThickness:18},
      {label:'נשים', data:femByFed, backgroundColor:AMBER_L, borderRadius:2, barThickness:18}
    ]}, options:stackHbarOpts(fmtN) });

  // olympic doughnut
  const oC = ath26.filter(a => BR(a.branch_id)?.is_olympic_branch===1).length;
  const oP = total ? Math.round(oC/total*100) : 0;
  mc('af_olympic', { type:'doughnut', data:{ labels:['אולימפי','לא אולימפי'],
    datasets:[{data:[oP,100-oP], backgroundColor:[AMBER,AMBER_L], borderWidth:2, borderColor:'#FFF'}]}, options:pieOpts() });

  // branch type doughnut
  const tC = ath26.filter(a => BR(a.branch_id)?.personal_or_group==='קבוצתי').length;
  const tP = total ? Math.round(tC/total*100) : 0;
  mc('af_branchType', { type:'doughnut', data:{ labels:['קבוצתי','אישי'],
    datasets:[{data:[tP,100-tP], backgroundColor:[AMBER,AMBER_L], borderWidth:2, borderColor:'#FFF'}]}, options:pieOpts() });

  // age distribution (line by individual age)
  const mAge = ageDist(ath26, 'זכר');
  const fAge = ageDist(ath26, 'נקבה');
  mc('af_byAge', { type:'line', data:{ labels:mAge.labels,
    datasets:[
      {label:'גברים', data:mAge.data, borderColor:AMBER, fill:false, tension:.3, pointRadius:0, pointHoverRadius:4, borderWidth:2},
      {label:'נשים', data:fAge.data, borderColor:WOMEN, fill:false, tension:.3, pointRadius:0, pointHoverRadius:4, borderWidth:2}
    ]}, options:dualLineOpts(fmtN) });

  // age group breakdown — men & women separately
  const AGE_GROUPS = ['ילדים','נוער','בוגרים','ותיקים'];
  const AGE_COLORS_M = ['#BAE6FD','#38BDF8','#0284C7','#0C4A6E'];
  const AGE_COLORS_W = ['#F9A8D4','#F472B6','#BE185D','#831843'];
  function ageGroupCounts(athletes, gender) {
    const m = {}; AGE_GROUPS.forEach(g => m[g] = 0);
    athletes.filter(a => a.athlete_gender === gender)
      .forEach(a => { if (m[a.athlete_age_category] !== undefined) m[a.athlete_age_category]++; });
    return AGE_GROUPS.map(g => m[g]);
  }
  const agGroupOptsM = { responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{display:false}, tooltip:{rtl:true, callbacks:{label:c=>fmtN(c.parsed.y)}},
              dataLabels:{formatter:fmtN} },
    scales:{ x:{ticks:{font:{size:12},color:'#1A1A1A'},grid:{display:false,drawBorder:false}},
             y:{ticks:{callback:fmtN,font:{size:11},color:'#9A9A9A'},grid:{color:'#EFEBE3',drawBorder:false},beginAtZero:true} } };
  const agGroupOptsW = { ...agGroupOptsM };
  mc('af_ageGroupM', { type:'bar', data:{ labels:AGE_GROUPS,
    datasets:[{data:ageGroupCounts(ath26,'זכר'), backgroundColor:AGE_COLORS_M, borderRadius:4, barThickness:38}]},
    options:agGroupOptsM });
  mc('af_ageGroupW', { type:'bar', data:{ labels:AGE_GROUPS,
    datasets:[{data:ageGroupCounts(ath26,'נקבה'), backgroundColor:AGE_COLORS_W, borderRadius:4, barThickness:38}]},
    options:agGroupOptsW });

  // YoY
  const byFed26 = Object.fromEntries(grpCnt(ath26,'association_name'));
  const byFed25 = Object.fromEntries(grpCnt(ath25,'association_name'));
  const names = byFed.slice(0,10).map(e=>e[0]);
  mc('af_yoyComparison', { type:'bar', data:{ labels:names,
    datasets:[
      {label:'2026', data:names.map(n=>byFed26[n]||0), backgroundColor:AMBER, borderRadius:2},
      {label:'2025', data:names.map(n=>byFed25[n]||0), backgroundColor:AMBER_L, borderRadius:2}
    ]}, options:grpHbarOpts(fmtN) });
  mc('af_yoyTotal', { type:'bar', data:{ labels:['2025','2026'],
    datasets:[{data:[ath25.length, ath26.length], backgroundColor:[AMBER_L,AMBER], borderRadius:3, barThickness:32}]},
    options:yoyTotOpts(fmtN) });
}


// ============================================================
// RENDER: Athletes / Associations (AA)
// ============================================================
function renderAA() {
  const p = pg('aa');
  const ath = fATH(MOCK.fact_athlete, p);
  const a26 = ath.filter(a=>a.support_request_year===2026);
  const a25 = ath.filter(a=>a.support_request_year===2025);

  const total = a26.length;
  const socIds = new Set(a26.filter(a=>a.society_id).map(a=>a.society_id));
  const avg = socIds.size ? Math.round(total/socIds.size) : 0;
  const tmCodes = new Set(a26.filter(a=>a.team_code).map(a=>a.team_code));
  setKPI(p, [fmtN(total), fmtN(socIds.size), fmtN(avg), fmtN(tmCodes.size)]);

  // by society (stacked by gender)
  const bySoc = grpCnt(a26, 'society_name');
  const topSoc = bySoc.slice(0,10).map(e=>e[0]);
  const maleBySoc = topSoc.map(n => a26.filter(a=>a.society_name===n&&a.athlete_gender==='זכר').length);
  const femBySoc = topSoc.map(n => a26.filter(a=>a.society_name===n&&a.athlete_gender==='נקבה').length);
  mc('aa_byAssoc', { type:'bar', data:{ labels:topSoc,
    datasets:[
      {label:'גברים', data:maleBySoc, backgroundColor:AMBER, borderRadius:2, barThickness:18},
      {label:'נשים', data:femBySoc, backgroundColor:AMBER_L, borderRadius:2, barThickness:18}
    ]}, options:stackHbarOpts(fmtN) });

  // by city
  const byCity = grpCnt(a26, 'authority_name');
  const cT10 = byCity.filter(e=>e[0]!=='לא ידוע').slice(0,10);
  mc('aa_byCity', { type:'bar', data:{ labels:cT10.map(e=>e[0]),
    datasets:[{data:cT10.map(e=>e[1]), backgroundColor:AMBER, borderRadius:2, barThickness:18}]}, options:hbarOpts(fmtN) });

  // by peripherality
  const periM = byCluster(a26, 'peripherality_cluster');
  mc('aa_byPeriphery', { type:'bar', data:{ labels:['1 - פריפריאלי','2','3','4','5 - מרכז'],
    datasets:[{data:[1,2,3,4,5].map(k=>periM[k]||0), backgroundColor:AMBER, borderRadius:2, barThickness:22}]}, options:hbarOpts(fmtN) });

  // by socioeconomic
  const socM = byCluster(a26, 'socioeconomic_cluster');
  mc('aa_bySocio', { type:'line', data:{ labels:['1','2','3','4','5','6','7','8','9','10'],
    datasets:[{data:[1,2,3,4,5,6,7,8,9,10].map(k=>socM[k]||0),
      borderColor:AMBER, backgroundColor:'rgba(180,83,9,.1)', fill:true, tension:.35, pointRadius:3,
      pointBackgroundColor:AMBER, pointBorderColor:'#FFF', pointBorderWidth:1.5, borderWidth:2}]},
    options:lineOpts(fmtN,'אשכול סוציו-אקונומי') });

  // by team
  const byTm = grpCnt(a26.filter(a=>a.team_name), 'team_name');
  mc('aa_byTeam', { type:'bar', data:{ labels:byTm.slice(0,10).map(e=>e[0]),
    datasets:[{data:byTm.slice(0,10).map(e=>e[1]), backgroundColor:AMBER, borderRadius:2, barThickness:16}]}, options:hbarOpts(fmtN) });

  // age distribution (line by individual age)
  const mAge = ageDist(a26,'זכר'), fAge = ageDist(a26,'נקבה');
  mc('aa_byAge', { type:'line', data:{ labels:mAge.labels,
    datasets:[
      {label:'גברים', data:mAge.data, borderColor:AMBER, fill:false, tension:.3, pointRadius:0, pointHoverRadius:4, borderWidth:2},
      {label:'נשים', data:fAge.data, borderColor:WOMEN, fill:false, tension:.3, pointRadius:0, pointHoverRadius:4, borderWidth:2}
    ]}, options:dualLineOpts(fmtN) });

  // age group breakdown — men & women separately
  const AA_GROUPS = ['ילדים','נוער','בוגרים','ותיקים'];
  const AA_COLORS_M = ['#BAE6FD','#38BDF8','#0284C7','#0C4A6E'];
  const AA_COLORS_W = ['#F9A8D4','#F472B6','#BE185D','#831843'];
  function aaAgeGroupCounts(athletes, gender) {
    const m = {}; AA_GROUPS.forEach(g => m[g] = 0);
    athletes.filter(a => a.athlete_gender === gender)
      .forEach(a => { if (m[a.athlete_age_category] !== undefined) m[a.athlete_age_category]++; });
    return AA_GROUPS.map(g => m[g]);
  }
  const aaAgOpts = { responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{display:false}, tooltip:{rtl:true, callbacks:{label:c=>fmtN(c.parsed.y)}},
              dataLabels:{formatter:fmtN} },
    scales:{ x:{ticks:{font:{size:12},color:'#1A1A1A'},grid:{display:false,drawBorder:false}},
             y:{ticks:{callback:fmtN,font:{size:11},color:'#9A9A9A'},grid:{color:'#EFEBE3',drawBorder:false},beginAtZero:true} } };
  mc('aa_ageGroupM', { type:'bar', data:{ labels:AA_GROUPS,
    datasets:[{data:aaAgeGroupCounts(a26,'זכר'), backgroundColor:AA_COLORS_M, borderRadius:4, barThickness:38}]},
    options:aaAgOpts });
  mc('aa_ageGroupW', { type:'bar', data:{ labels:AA_GROUPS,
    datasets:[{data:aaAgeGroupCounts(a26,'נקבה'), backgroundColor:AA_COLORS_W, borderRadius:4, barThickness:38}]},
    options:aaAgOpts });

  // YoY
  const m26 = Object.fromEntries(grpCnt(a26,'society_name'));
  const m25 = Object.fromEntries(grpCnt(a25,'society_name'));
  const names = bySoc.slice(0,10).map(e=>e[0]);
  mc('aa_yoyComparison', { type:'bar', data:{ labels:names,
    datasets:[
      {label:'2026', data:names.map(n=>m26[n]||0), backgroundColor:AMBER, borderRadius:2},
      {label:'2025', data:names.map(n=>m25[n]||0), backgroundColor:AMBER_L, borderRadius:2}
    ]}, options:grpHbarOpts(fmtN) });
  mc('aa_yoyTotal', { type:'bar', data:{ labels:['2025','2026'],
    datasets:[{data:[a25.length, a26.length], backgroundColor:[AMBER_L,AMBER], borderRadius:3, barThickness:32}]},
    options:yoyTotOpts(fmtN) });
}


// ============================================================
// RENDER: Women's Sport (WG)
// ============================================================
function renderWG() {
  const p = pg('wg');
  const allSR = MOCK.fact_support_request_spo;
  const fsr = fSR(allSR, p, 'איגוד');
  const sr26 = fsr.filter(r=>r.support_request_year===2026);
  const sr25 = fsr.filter(r=>r.support_request_year===2025);

  const ath = fATH(MOCK.fact_athlete, p, 'איגוד');
  const a26 = ath.filter(a=>a.support_request_year===2026);

  // KPIs
  const femScore = sr26.reduce((s,r)=>s+(r.female_score||0),0);
  const wpScore  = sr26.reduce((s,r)=>s+(r.women_promotion_score||0),0);
  const femAch   = sr26.reduce((s,r)=>s+(r.female_achievement_score||0),0);
  const coaches  = sr26.reduce((s,r)=>s+(r.female_coaches_cnt||0),0);
  setKPI(p, [fmtN(Math.round(femScore)), fmtN(Math.round(wpScore)), fmtN(Math.round(femAch)), fmtN(Math.round(coaches))]);

  // wg_byFed — ניקוד נשים לפי איגוד (השוואה לפי פילטר)
  const byFed = grpSum(sr26, 'association_name', 'female_score');
  mc('wg_byFed', { type:'bar', data:{ labels:byFed.slice(0,10).map(e=>e[0]),
    datasets:[{label:'ניקוד נשים', data:byFed.slice(0,10).map(e=>Math.round(e[1])), backgroundColor:WOMEN, borderRadius:2, barThickness:20}]},
    options:hbarOpts(fmtN) });

  // wg_byBranchType — פירוק ניקוד קידום לפי סוג ענף
  const teamWP = sr26.filter(r=>BR(r.branch_id)?.personal_or_group==='קבוצתי').reduce((s,r)=>s+(r.women_promotion_score||0),0);
  const teamPct = (wpScore>0) ? Math.round(teamWP/wpScore*100) : 50;
  mc('wg_byBranchType', { type:'doughnut', data:{ labels:['קבוצתי','אישי'],
    datasets:[{data:[teamPct, 100-teamPct], backgroundColor:[WOMEN, WOMEN_L], borderWidth:2, borderColor:'#FFF'}]},
    options:pieOpts() });

  // wg_byOlympic — פירוק ניקוד נשים לפי סיווג אולימפי
  const olyScore = sr26.filter(r=>BR(r.branch_id)?.is_olympic_branch===1).reduce((s,r)=>s+(r.female_score||0),0);
  const olyPct = (femScore>0) ? Math.round(olyScore/femScore*100) : 50;
  mc('wg_byOlympic', { type:'doughnut', data:{ labels:['אולימפי','לא אולימפי'],
    datasets:[{data:[olyPct, 100-olyPct], backgroundColor:[WOMEN, WOMEN_P], borderWidth:2, borderColor:'#FFF'}]},
    options:pieOpts() });

  // wg_achChange — שינוי % בניקוד הישגיות לפי איגוד
  const achByFed25 = {}, achByFed26 = {};
  sr25.forEach(r=>{ achByFed25[r.association_name]=(achByFed25[r.association_name]||0)+(r.female_achievement_score||0); });
  sr26.forEach(r=>{ achByFed26[r.association_name]=(achByFed26[r.association_name]||0)+(r.female_achievement_score||0); });
  const allFeds = [...new Set([...Object.keys(achByFed25), ...Object.keys(achByFed26)])];
  const changeArr = allFeds.map(nm => {
    const v25=achByFed25[nm]||0, v26=achByFed26[nm]||0;
    return [nm, v25 ? +((v26-v25)/v25*100).toFixed(1) : 0];
  }).filter(([,v])=>v!==0).sort((a,b)=>b[1]-a[1]).slice(0,14);
  mc('wg_achChange', { type:'bar', data:{ labels:changeArr.map(e=>e[0]),
    datasets:[{label:'שינוי %', data:changeArr.map(e=>e[1]),
      backgroundColor:changeArr.map(([,v])=>v>=0?WOMEN:WOMEN_L), borderRadius:2, barThickness:16,
      dataLabels:{formatter:v=>(v>0?'+':'')+v.toFixed(1)+'%'}}]},
    options:{ responsive:true, maintainAspectRatio:false, indexAxis:'y',
      plugins:{ legend:{display:false},
        tooltip:{rtl:true,callbacks:{label:c=>(c.parsed.x>0?'+':'')+c.parsed.x.toFixed(1)+'%'}},
        dataLabels:{formatter:v=>(v>0?'+':'')+v.toFixed(1)+'%'} },
      scales:{ x:{ticks:{callback:v=>(v>0?'+':'')+v+'%',font:{size:11},color:'#9A9A9A'},grid:{color:'#EFEBE3',drawBorder:false}},
               y:{position:'right',ticks:{font:{size:12},color:'#1A1A1A'},grid:{display:false,drawBorder:false}} } } });

  // wg_teamsByFed — כמות נבחרות נשים/גברים לפי איגוד
  const femTeamFed={}, malTeamFed={};
  sr26.forEach(r=>{
    if(r.female_cnt>0) femTeamFed[r.association_name]=(femTeamFed[r.association_name]||0)+1;
    if(r.male_cnt>0)   malTeamFed[r.association_name]=(malTeamFed[r.association_name]||0)+1;
  });
  const teamFedKeys = Object.keys(femTeamFed).sort((a,b)=>(femTeamFed[b]||0)-(femTeamFed[a]||0)).slice(0,10);
  mc('wg_teamsByFed', { type:'bar', data:{ labels:teamFedKeys,
    datasets:[
      {label:'נשים',  data:teamFedKeys.map(k=>femTeamFed[k]||0), backgroundColor:WOMEN, borderRadius:2, barThickness:10},
      {label:'גברים', data:teamFedKeys.map(k=>malTeamFed[k]||0), backgroundColor:TEAL,  borderRadius:2, barThickness:10}
    ]}, options:grpHbarOpts(fmtN) });

  // wg_groupsByAssoc — כמות קבוצות נשים/גברים לפי אגודה
  const femGrpAssoc={}, malGrpAssoc={};
  sr26.filter(r=>r.society_name).forEach(r=>{
    if(r.female_cnt>0) femGrpAssoc[r.society_name]=(femGrpAssoc[r.society_name]||0)+1;
    if(r.male_cnt>0)   malGrpAssoc[r.society_name]=(malGrpAssoc[r.society_name]||0)+1;
  });
  const grpAssocKeys = Object.keys(femGrpAssoc).sort((a,b)=>(femGrpAssoc[b]||0)-(femGrpAssoc[a]||0)).slice(0,10);
  mc('wg_groupsByAssoc', { type:'bar', data:{ labels:grpAssocKeys,
    datasets:[
      {label:'נשים',  data:grpAssocKeys.map(k=>femGrpAssoc[k]||0), backgroundColor:WOMEN, borderRadius:2, barThickness:10},
      {label:'גברים', data:grpAssocKeys.map(k=>malGrpAssoc[k]||0), backgroundColor:TEAL,  borderRadius:2, barThickness:10}
    ]}, options:grpHbarOpts(fmtN) });

  // wg_ageByGender — גרף גילאים גברים מול נשים
  const mAge=ageDist(a26,'זכר'), fAge=ageDist(a26,'נקבה');
  mc('wg_ageByGender', { type:'line', data:{ labels:mAge.labels,
    datasets:[
      {label:'גברים', data:mAge.data, borderColor:TEAL,  fill:false, tension:.3, pointRadius:0, pointHoverRadius:4, borderWidth:2},
      {label:'נשים',  data:fAge.data, borderColor:WOMEN, fill:false, tension:.3, pointRadius:0, pointHoverRadius:4, borderWidth:2}
    ]}, options:dualLineOpts(fmtN) });

  // wg_socioByGender — נתונים גיאוגרפיים — סוציו-אקונומי
  const mSocio=byCluster(a26,'socioeconomic_cluster','זכר');
  const fSocio=byCluster(a26,'socioeconomic_cluster','נקבה');
  mc('wg_socioByGender', { type:'bar', data:{ labels:['1','2','3','4','5','6','7','8','9','10'],
    datasets:[
      {label:'גברים', data:[1,2,3,4,5,6,7,8,9,10].map(k=>mSocio[k]||0), backgroundColor:TEAL,  borderRadius:2},
      {label:'נשים',  data:[1,2,3,4,5,6,7,8,9,10].map(k=>fSocio[k]||0), backgroundColor:WOMEN, borderRadius:2}
    ]}, options:grpVbarOpts(fmtN,'אשכול סוציו-אקונומי') });

  // wg_periByGender — נתונים גיאוגרפיים — פריפריאליות
  const mPeri=byCluster(a26,'peripherality_cluster','זכר');
  const fPeri=byCluster(a26,'peripherality_cluster','נקבה');
  mc('wg_periByGender', { type:'bar', data:{ labels:['1 — פריפריאלי','2','3','4','5 — מרכז'],
    datasets:[
      {label:'גברים', data:[1,2,3,4,5].map(k=>mPeri[k]||0), backgroundColor:TEAL,  borderRadius:2},
      {label:'נשים',  data:[1,2,3,4,5].map(k=>fPeri[k]||0), backgroundColor:WOMEN, borderRadius:2}
    ]}, options:grpVbarOpts(fmtN,'אשכול פריפריאליות') });

  // wg_mgmtByFed — נשים בהנהלה לפי איגוד
  const mgmtByFed=grpSum(sr26,'association_name','female_management_cnt');
  mc('wg_mgmtByFed', { type:'bar', data:{ labels:mgmtByFed.slice(0,10).map(e=>e[0]),
    datasets:[{label:'נשים בהנהלה', data:mgmtByFed.slice(0,10).map(e=>Math.round(e[1])), backgroundColor:WOMEN, borderRadius:2, barThickness:20}]},
    options:hbarOpts(fmtN) });

  // wg_coachesByFed — מאמנות לפי איגוד
  const coByFed=grpSum(sr26,'association_name','female_coaches_cnt');
  mc('wg_coachesByFed', { type:'bar', data:{ labels:coByFed.slice(0,10).map(e=>e[0]),
    datasets:[{label:'מאמנות', data:coByFed.slice(0,10).map(e=>Math.round(e[1])), backgroundColor:WOMEN_L, borderRadius:2, barThickness:20}]},
    options:hbarOpts(fmtN) });

  // wg_groupsPerLeague — מספר קבוצות לליגה (קבוצתי בלבד)
  const teamSR=sr26.filter(r=>BR(r.branch_id)?.personal_or_group==='קבוצתי');
  const lgCnt={};
  teamSR.filter(r=>r.league_name).forEach(r=>{ lgCnt[r.league_name]=(lgCnt[r.league_name]||0)+1; });
  const lgArr=Object.entries(lgCnt).sort((a,b)=>b[1]-a[1]);
  mc('wg_groupsPerLeague', { type:'bar', data:{ labels:lgArr.map(e=>e[0]),
    datasets:[{label:'קבוצות', data:lgArr.map(e=>e[1]), backgroundColor:WOMEN, borderRadius:3}]},
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false}, tooltip:{rtl:true,callbacks:{label:c=>fmtN(c.parsed.y)}}, dataLabels:{formatter:fmtN} },
      scales:{ x:{ticks:{font:{size:11},color:'#1A1A1A'},grid:{display:false,drawBorder:false}},
               y:{ticks:{callback:fmtN,font:{size:11},color:'#9A9A9A'},grid:{color:'#EFEBE3',drawBorder:false},beginAtZero:true} } } });

  // wg_leaguesPerFed — מספר ליגות באיגוד (קבוצתי)
  const fedLeagues={};
  teamSR.filter(r=>r.league_name).forEach(r=>{
    if(!fedLeagues[r.association_name]) fedLeagues[r.association_name]=new Set();
    fedLeagues[r.association_name].add(r.league_name);
  });
  const fedLgArr=Object.entries(fedLeagues).map(([k,v])=>[k,v.size]).sort((a,b)=>b[1]-a[1]).slice(0,10);
  mc('wg_leaguesPerFed', { type:'bar', data:{ labels:fedLgArr.map(e=>e[0]),
    datasets:[{label:'ליגות', data:fedLgArr.map(e=>e[1]), backgroundColor:TEAL_L, borderRadius:2, barThickness:20}]},
    options:hbarOpts(fmtN) });

  // wg_scoreByCity — ניקוד נשים לפי רשות מקומית
  const byCity=grpSum(sr26.filter(r=>r.authority_name),'authority_name','female_score');
  mc('wg_scoreByCity', { type:'bar', data:{ labels:byCity.slice(0,10).map(e=>e[0]),
    datasets:[{label:'ניקוד נשים', data:byCity.slice(0,10).map(e=>Math.round(e[1])), backgroundColor:WOMEN, borderRadius:2, barThickness:18}]},
    options:hbarOpts(fmtN) });

  // wg_scoreByCluster — ניקוד הישגיות לפי אשכול סוציו-אקונומי
  const achBySocio=srByCluster(sr26,'socioeconomic_cluster','female_achievement_score');
  mc('wg_scoreByCluster', { type:'bar', data:{ labels:['1','2','3','4','5','6','7','8','9','10'],
    datasets:[{label:'ניקוד הישגיות', data:[1,2,3,4,5,6,7,8,9,10].map(k=>Math.round(achBySocio[k]||0)), backgroundColor:WOMEN, borderRadius:3}]},
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false}, tooltip:{rtl:true,callbacks:{label:c=>fmtN(c.parsed.y)}}, dataLabels:{formatter:fmtN} },
      scales:{ x:{ticks:{font:{size:11},color:'#1A1A1A'},grid:{display:false,drawBorder:false}},
               y:{ticks:{callback:fmtN,font:{size:11},color:'#9A9A9A'},grid:{color:'#EFEBE3',drawBorder:false},beginAtZero:true} } } });

  // wg_scoreByPeri — ניקוד קידום נשים לפי פריפריאליות
  const wpByPeri=srByCluster(sr26,'peripherality_cluster','women_promotion_score');
  mc('wg_scoreByPeri', { type:'bar', data:{ labels:['1','2','3','4','5'],
    datasets:[{label:'ניקוד קידום', data:[1,2,3,4,5].map(k=>Math.round(wpByPeri[k]||0)), backgroundColor:WOMEN_L, borderRadius:3}]},
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false}, tooltip:{rtl:true,callbacks:{label:c=>fmtN(c.parsed.y)}}, dataLabels:{formatter:fmtN} },
      scales:{ x:{ticks:{font:{size:11},color:'#1A1A1A'},grid:{display:false,drawBorder:false}},
               y:{ticks:{callback:fmtN,font:{size:11},color:'#9A9A9A'},grid:{color:'#EFEBE3',drawBorder:false},beginAtZero:true} } } });
}


// ============================================================
// FILTER POPULATION + WIRING
// ============================================================
function populateFilters() {
  const assocNames = MOCK.dim_association.map(a=>a.association_name).sort();
  const branchNames = [...new Set(MOCK.dim_branchs.map(b=>b.branch_name))].sort();
  const societyNames = MOCK.dim_society.map(s=>s.society_name).sort();
  const teamNames = MOCK.dim_teams.map(t=>t.team_name).sort();

  // BF
  let p = pg('bf');
  fillSel(sel(p,'איגוד'), assocNames);
  fillSel(sel(p,'ענף'), branchNames);

  // BA
  p = pg('ba');
  fillSel(sel(p,'אגודה'), societyNames);
  fillSel(sel(p,'קבוצה'), teamNames);
  fillSel(sel(p,'ענף'), branchNames);

  // AF
  p = pg('af');
  fillSel(sel(p,'איגוד'), assocNames);
  fillSel(sel(p,'ענף'), branchNames);

  // AA
  p = pg('aa');
  fillSel(sel(p,'אגודה'), societyNames);
  fillSel(sel(p,'קבוצה'), teamNames);
  fillSel(sel(p,'ענף'), branchNames);

  // WG
  p = pg('wg');
  fillSel(sel(p,'איגוד'), assocNames);
  fillSel(sel(p,'ענף'), branchNames);
}

function wireFilters() {
  ['bf','ba','af','aa','wg'].forEach(pageId => {
    const p = pg(pageId);
    p.querySelectorAll('.filter select').forEach(s => {
      s.addEventListener('change', () => renderPage(pageId));
    });
    p.querySelectorAll('.age-num').forEach(inp => {
      inp.addEventListener('change', () => renderPage(pageId));
    });
    const resetBtn = p.querySelector('.filter-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        p.querySelectorAll('.filter select').forEach(s => s.value = '');
        p.querySelectorAll('.age-num').forEach((inp, i) => inp.value = i === 0 ? '6' : '50');
        renderPage(pageId);
      });
    }
  });
}

// ============================================================
// PAGE ROUTER
// ============================================================
const renderers = { bf:renderBF, ba:renderBA, af:renderAF, aa:renderAA, wg:renderWG };
function renderPage(id) { if (renderers[id]) renderers[id](); }

// ============================================================
// INIT
// ============================================================
populateFilters();
wireFilters();
renderBF(); // eager render first page

})();
