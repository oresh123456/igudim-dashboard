# מתקני ספורט — סבב 2 (frontier verify), run 2026-07-17a

מטרה: לאמת בשטח את 63 ה-`suggest` שהחזיר סבב 07-16 ולהרחיב. 13 סוכנים · 13 הצליחו · 0 נכשלו · **488 ממצאים · 132 coverage · 53 leads חדשים**. כל מקור נושא שני מפתחות-הכרעה: `update_cadence` + `cross_ref_key`.

## 🏆 חדשים מאומתים חי — קצב אמיתי **וגם** מפתח הצלבה

### 1. GovMap open GeoServer — WMS/WFS **פתוח בלי טוקן** ⭐ הגילוי המרכזי של הסבב
- `https://open.govmap.gov.il/geoserver/opendata/wms?request=getcapabilities&service=wms` — חי, לא-מאומת.
- **הצלבה:** ITM native; שכבת `muni_il` = פוליגוני **רשויות מקומיות** (join/גבול). זה פותר את בעיית ה-token של `govmap.gov.il/?lay=…` (ה-JS API `govmap.getLayerEntities` דורש טוקן domain-bound; ה-GeoServer הפתוח לא).
- **הערה:** ה-`?lay=215697/17/210697` הספציפיים נותרו blocked (ECONNRESET/ללא אימות כותרת) — לגשת דרך ה-GeoServer, לא ה-viewer.

### 2. שלושה FeatureServers עירוניים/אזוריים חיים — owner handles שנפתרו
- **מ.א. עמק יזרעאל** (`services7.arcgis.com/1ptlMSlFOlAMxpnz/.../izr_sport1124/FeatureServer/0`) — item modified **2024-11-25**, org פעיל מאוד. `cross_ref`: local-authority (רב-יישובי) + ITM.
- **bathenha = עיריית קרית מלאכי** (`services3.arcgis.com/XBDMqmX1PKcVQCKG/.../ספורט/FeatureServer`) — lastEditDate **2024-07-17**, audit-trail מלא + gush/helka.
- **meged-w** (`services-eu1.arcgis.com/UFcQDN9TjksUhg4p/.../מתקני_ספורט`) — lastEditDate **2024-11-10**, ITM מאומת; שם הרשות עדיין לא זוהה (ה-`sharing/rest/portals/<org>` מחזיר 403 אנונימי).
- (רחת 2024-07-18 — מרחב ציבורי גנרי, לא ספורט טהור · גוש עציון 2019 · נוף הגליל 2021 — **stale**, לא לרדוף.)

### 3. מרכז מיפוי ישראל — חלקות (parcels) · `Frequency=Month` טרי ⭐ (מפתח gush/helka)
- `https://data.gov.il/dataset/dff8a168-af6c-4e0f-bbe3-c4bd3646084c` — shapefile, `Frequency=Month` מוצהר, last_modified **2026-06-21** (~חודש).
- **cross_ref:** gush/helka בהגדרה. זה מקור ה-קדסטר החסר לחיבור מתקן→חלקה→תב"ע.

### 4. MoE — מאפייני מוסדות חינוך · מתעדכן בפועל 2026-05-11
- `e.data.gov.il/dataset/5a9278c8…/resource/5548fd63…` — למרות `Frequency=NotConstant`, last_modified **2026-05-11**. `cross_ref`: **SEMEL_MOSAD** (קוד מוסד תקני) → מצליב ל-flag "משרת בית ספר" של 408.
- (שכבת MoE schools FeatureServer `services8.arcgis.com/JcXY3lLZni6BK4El/schools` — SETL_CODE אך **stale 2018**; קואורדינטות מוסדות — stale 2022. → להעדיף את ה-mosdot dataset הטרי.)

### 5. IPLAN Xplan — ייעודי-קרקע (שטח מיועד לספורט/שצ"פ)
- `https://ags.iplan.gov.il/arcgisiplan/rest/services/PlanningPublic/Xplan/MapServer/4` — query פעיל, שדה `last_update_date` per-plan. ITM פוליגון (אין gush/helka ישיר — לחבר דרך #3). שכבות TMM מחוזיות (`compilation_tmm_{darom|haifa|…}`) קיימות, מחזור רב-שנתי.
- (המראה `ags.moin.gov.il` — **DNS מת**, לא קיים.)

### 6. OSM — נתיב מבוקר ומתוזמן (מסיר את מגבלת 2-slots)
- `download.geofabrik.de/asia/israel-and-palestine-latest.osm.pbf` — pbf יומי + feed דיפים דקתי. self-hosted Overpass (`wiktorn/overpass-api` docker, `OVERPASS_DIFF_URL`) → קצב שליטה מלא. `cross_ref`: lat/lng (WGS84, reproject ל-ITM). שאילתת sport-in-park containment רצה חי. `osm.org.il` חזר לחיים.

### 7. תל אביב IView2 — קצב batch-republish מאושש
- כל שכבות הספורט (936 אצטדיונים · 938 היכלים · 939 בריכות · 943 מגרשים · 466 · 420 חוף) עם `date_import` אחיד לכל השכבה (**14/03/2026**) → republish באצווה, ניתן ל-polling. ITM + Full_Address/Street/neighborhood + operator. ה-WM mirror (`/services/WM/IView2WM/`) מסונכרן (WKID 3857 — פחות שימושי ל-QuickSight).

## 📋 מקורות non-API (FOI / ידני) — טוטו/פיס
- Pais `Freeinfo2024.pdf` (1.4MB, 41 עמ') חי — שנתי; GuideStar מפעל הפיס **ח"פ 520018714**; FOI ל-`Mitkanim@most.gov.il` + טופס pais FOI (חלון 30-60 יום); דוחות מבקר המדינה. אף אחד לא feed חי — נתיב בקשה, לא API.

## ⚠️ dead-ends מאומתים (להפסיק לרדוף)
- **Complot GISNET V5** (`v5.gis-net.co.il` — נתניה/ראשל"צ/אשקלון): backend סגור (GeoServer על IP פרטי + proxy ASP.NET), אין FeatureServer ציבורי. סילו סגור.
- **אשקלון** היגרה כולה ל-`ashkelon.muni.gov.il` (סיכון-תשתית לכל scraper שנשען על `muni.il`).
- **ראשל"צ / Systematics nearby** — אין org ArcGIS Online ייעודי; דפי שיווק בלבד.
- **football.org.il / portal / api-football / football-state** — login-wall / 403 / off-topic. אין רשימת מגרשים ציבורית.
- **BudgetKey SQL** — היה **down בזמן הריצה** (psycopg2 connection-pool exhausted / 504). לא dead — **retry** בסבב הבא. ה-repo `hasadna/obudget` — לא נמצא `geocode_entities.py` (כנראה הוסר).
- data.gov.il: `organization_type` facet ריק; חיפושי מבני-ציבור/מצילים/תמיכות-ספורט → 0 (חלקם artifact של קידוד עברית ב-curl).

## 🔒 חסום ב-WAF — דורש דפדפן אמיתי (Playwright), לא נפתר headless
- **ירושלים** (`gisviewer.jerusalem.muni.il`, `jergisng…`) — Akamai 403 גם דרך r.jina.ai (proxy צד-שרת).
- **חיפה** (`gis.haifa.muni.il/HaifaProjectsPublic`) — `config.json` נקרא, אבל שורש ה-services 404 (listing כבוי); ExperienceBuilder app לא נבדק.
- **GovMap viewer** (`?lay=…`), `old.govmap` registration — ECONNRESET.
→ אלה הצטברו כ-`tooling-gap`: הסבב הבא צריך trace דרך דפדפן אמיתי. **(דורש אישור המשתמש לשימוש ב-browser.)**

## מסקנה אופרטיבית (מעודכן)
עמוד השדרה נשאר **Efshari Bari** (#1 סבב 07-16, סכימה נשלפה: `local_authority` שם + `school_use`). סביבו, סדר עדיפות מעודכן להטמעה:
1. **GovMap open GeoServer** — גבולות רשות (`muni_il`) ל-spatial-join, בלי טוקן.
2. **מרכז מיפוי — חלקות (Month)** — שכבת gush/helka לחיבור מתקן↔תב"ע.
3. **FeatureServers אזוריים חיים** (יזרעאל, קרית מלאכי) + **TA IView2** — שכבת גילוי-פערים ברמת-רשות עם קצב.
4. **MoE mosdot (SEMEL_MOSAD, טרי)** — אולמות בי"ס = מתקני ספורט ציבוריים, מצליב ל-408.
5. **OSM self-hosted** — כיסוי משלים בקצב נשלט.
+ **BudgetKey SQL** — retry (היה down) לחיבור מימון→רשות.

**חסמים לסבב 3:** Playwright ל-ירושלים/חיפה/GovMap-viewer · retry ל-BudgetKey · enumerate מלא של אינדקס שכבות TA IView2 (0-1000) · odata.org.il `organization_list` לכל `*_muni`.
