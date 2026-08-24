# -*- coding: utf-8 -*-
"""החלת עקרונות העיצוב של משרד התרבות והספורט על מוקאפ-אסטרטגי-מורן-v2.html"""
import io, os, re
base = os.path.dirname(os.path.abspath(__file__))
p = os.path.join(base, "הצגה למורן", "מוקאפ-אסטרטגי-מורן-v2.html")
s = io.open(p, encoding="utf-8").read()
n0 = len(s)
LOGO = open(os.path.join(base, "_logo_b64.txt")).read().strip()

# ================= 1. :root — הפלטה המחייבת =================
old_root = s[s.index("  :root {"): s.index("  html { font-size: 15px; }")]
new_root = """  :root {
    /* ═══ פלטת משרד התרבות והספורט — מקור: עקרונות עיצוב.docx ═══ */
    /* ראשיים */
    --navy:   #1F3F6D;   /* מותג ראשי · כותרות · KPI · גרפים מרכזיים · גברים */
    --green:  #248A3D;   /* ערכים חיוביים · עמידה ביעדים */
    --red:    #DA3439;   /* התראות · חריגות */
    /* מידע וקטגוריות */
    --sky:    #2D9CDB;   /* נשים · קטגוריות */
    --purple: #6B4FA0;
    --orange: #E07B39;
    --slate:  #7A8FA6;
    --gold:   #F8C33E;
    /* ממשק */
    --bg:        #F2F4F7;
    --surface:   #FFFFFF;
    --border:    #E5E9F0;
    --ink:       #1A1A2E;
    --ink-muted: #6B7280;

    /* ── נגזרים לשימוש פנימי (נשענים על הפלטה בלבד) ── */
    --surface-soft: #F7F9FC;
    --ink-faint: #9AA3B2;
    --line: var(--border); --line-soft: #EEF1F6;
    --accent: var(--navy);              /* כרום אחיד — נייבי בכל המסכים */

    /* ── צבעי סדרות לגרפים ──
       שמות הלשוניות נשמרו כדי לא לשבור את קוד ה-JS, אך כל ערך הוא צבע מהפלטה.
       ההקצאה נבחרה כך שבכל גרף שמשתמש בכמה מהם — הצבעים נשארים נבדלים. */
    --budget:  var(--navy);    --budget-soft:  #E4EAF3;
    --engine:  var(--navy);    --engine-soft:  #E4EAF3;
    --muni:    var(--sky);     --muni-soft:    #E3F1FB;
    --incl:    var(--gold);    --incl-soft:    #FDF3D9;
    --perf:    var(--orange);  --perf-soft:    #FBEEE3;
    --impact:  var(--purple);  --impact-soft:  #EDE7F5;
    --catalog: var(--purple);  --catalog-soft: #EDE7F5;
    --levers:  var(--purple);  --levers-soft:  #EDE7F5;
    --org:     var(--slate);   --org-soft:     #EAEEF2;
    --sla:     var(--slate);   --sla-soft:     #EAEEF2;
    --links:   var(--slate);   --links-soft:   #EAEEF2;
    --geo:     var(--green);   --geo-soft:     #E3F1E8;
    --resil:   var(--red);     --resil-soft:   #FAE6E7;

    /* דירוגי הישגים — כבר תואמי פלטה */
    --band-podium: var(--green); --band-final: var(--gold);
    --band-16: var(--orange);    --band-rest: var(--slate);
    /* סמנטי + מגדר */
    --success: var(--green); --danger: var(--red);
    --men: var(--navy); --women: var(--sky);
    --radius: 6px; --radius-lg: 10px;
  }
"""
s = s.replace(old_root, new_root)

# ================= 2. פונט =================
s = s.replace(
  '<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700&display=swap" rel="stylesheet">',
  '<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">')
assert s.count("font-family: 'Heebo', system-ui, sans-serif;") == 1
s = s.replace("font-family: 'Heebo', system-ui, sans-serif;",
              'font-family: "Amazon Ember", "Heebo", system-ui, sans-serif;')
s = s.replace("Chart.defaults.font.family = \"'Heebo', system-ui, sans-serif\";",
              'Chart.defaults.font.family = \'"Amazon Ember", "Heebo", system-ui, sans-serif\';')

# ================= 3. כרום נייבי — ביטול הדגשים לפי לשונית =================
s = re.sub(r'style="--accent:var\(--[a-z]+\);"', 'style="--accent:var(--navy);"', s)
for t in ['admin', 'sport', 'facilities', 'orgcard', 'authcard', 'other']:
    s = re.sub(r'(\.tab\[data-tab="%s"\]\.active\s*\{ border-bottom-color: )var\(--[a-z]+\)' % t,
               r'\1var(--navy)', s)

# ================= 4. צבעים חד-פעמיים שנותרו מחוץ לפלטה =================
ONEOFF = {
  '#12798F': 'var(--navy)',      '#EBD9BF': 'var(--border)',
  '#F7E7E7': '#FAE6E7',          '#E6C9C9': '#F0C7C9',
  '#E8F3EC': '#E3F1E8',          '#B9DCC6': '#B7DCC3',
  '#EEF1F4': 'var(--surface-soft)', '#9B6A1C': 'var(--navy)',
  '#FAF1DF': '#FDF3D9',          '#EAD8AE': '#F0DFA8',
  '#1E6B44': 'var(--green)',     '#FBEBEB': '#FAE6E7',
  '#F0D2D2': '#F0C7C9',          '#9B2C2C': 'var(--red)',
  '#CBD6E8': '#C7D3E6',          '#22406B': 'var(--navy)',
  '#eef2f8': 'var(--surface-soft)', '#9aa8bd': 'var(--slate)',
}
head_end = s.index('</style>')
head, tail = s[:head_end], s[head_end:]
for k, vv in ONEOFF.items():
    head = head.replace(k, vv)
s = head + tail

# ================= 5. כותרת עליונה — פס נייבי עם הלוגו (כמו בדשבורד הדוגמה) =================
old_brand_css = s[s.index("  .brand {"): s.index("  .tabs {")]
new_brand_css = """  .brand { display:flex; align-items:center; gap:14px; padding:12px 26px;
    background: var(--navy); border-bottom: 3px solid var(--gold); }
  .brand-logo { height:38px; width:auto; flex-shrink:0; background:#fff;
    border-radius:6px; padding:4px 7px; }
  .brand-txt .t1 { display:block; font-size:15px; font-weight:700; color:#fff; letter-spacing:.1px; }
  .brand-txt .t2 { display:block; font-size:11.5px; color:#C7D3E6; margin-top:1px; }
  .brand-badge { margin-inline-start:auto; font-size:11.5px; font-weight:600; color:#fff;
    background:rgba(255,255,255,.14); border:1px solid rgba(255,255,255,.28);
    padding:5px 13px; border-radius:999px; }
"""
s = s.replace(old_brand_css, new_brand_css)

old_brand_html = '''<header class="brand">
  <div class="brand-logo">ת<span style="font-size:12px">ס</span></div>
  <div class="brand-txt">'''
assert s.count(old_brand_html) == 1
s = s.replace(old_brand_html,
  '<header class="brand">\n'
  '  <img class="brand-logo" alt="משרד התרבות והספורט" src="data:image/png;base64,%s">\n'
  '  <div class="brand-txt">' % LOGO)

# ================= 6. שורת הלשוניות — יושבת מתחת לפס הנייבי =================
old_tabs = s[s.index("  .tabs {"): s.index('  .tab[data-tab="admin"]')]
new_tabs = """  .tabs { display:flex; gap:2px; padding:0 26px; background:var(--surface);
    border-bottom:1px solid var(--border); position:sticky; top:0; z-index:40;
    overflow-x:auto; box-shadow:0 1px 3px rgba(31,63,109,.04); }
  .tab { flex:0 0 auto; appearance:none; border:0; background:none; cursor:pointer;
    font:inherit; font-size:13.5px; color:var(--ink-muted); padding:13px 18px;
    border-bottom:3px solid transparent; white-space:nowrap; transition:.15s; }
"""
s = s.replace(old_tabs, new_tabs)

io.open(p, "w", encoding="utf-8").write(s)
print("theme applied, bytes:", len(s) - n0)
