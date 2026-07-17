# מתקני ספורט — מקורות מרחביים מתעדכנים (deep pass, run 2026-07-16a)

מטרה: דאטה מרחבי של **מתקני ספורט** שמתעדכן ב**קצב קבוע** דרך **API**, וניתן ל**הצלבה** במפתחות מוכרים (רשות מקומית · מס' עמותה/ח"פ · נ"צ ITM · lat/lng · place_id · גוש/חלקה).
16 סוכנים · 15 הצליחו · 475 ממצאים חדשים · 52 מקורות חדשים. שני מפתחות-הכרעה לכל מקור: `update_cadence` + `cross_ref_key`.

## 🏆 הזוכים — קצב-רענון אמיתי **וגם** ניתנים להצלבה (מאומתים חי)

### 1. Efshari Bari — Health_Sport_Facility_V (FeatureServer חי של משרד הבריאות) ⭐ הגילוי המרכזי
- **8,494 מתקנים**, ArcGIS REST **ללא auth**, `EPSG:2039 (ITM)` — אותו CRS כמו 408.
- `https://services5.arcgis.com/dlrDjz89gx9qyfev/arcgis/rest/services/Health_Sport_Facility_V/FeatureServer/0/query?where=1=1&outFields=*&f=json`
- **קצב:** אין Frequency מוצהר, אבל `editingInfo.lastEditDate = 2025-03-07` — עריכות חיות ~4 שנים אחרי הרענון האחרון של 408 (2021-07-25). זה ה-backend החי שמאחורי מפת אפשריבריא (iframe ל-govmap SPORT — אבל ה-FeatureServer עצמו נפרד ונגיש).
- **הצלבה:** `local_authority` (שם רשות) + `facility_type` + נ"צ ITM ישיר מול 408.
- **למה זה גדול:** משרד הבריאות + **המשרד שלנו** שותפים לדאטה הזה. פותר את בעיית הבַּיָשְׁנוּת של 408 — מקור רשמי, חי, בלי גרידה, בלי טוקן.

### 2. באר שבע — CKAN על data.gov.il, **רענון אוטומטי מוצהר** ⭐
- `resource_id=ac12e904-be38-4011-9306-bc4820eb7f41` (WGS84 lat/lon; יש resource-אחות ב-ITM).
- `https://data.gov.il/api/3/action/datastore_search?resource_id=ac12e904-be38-4011-9306-bc4820eb7f41`
- **קצב:** `Frequency='Year'` + `Update='Automat'` — הצהרה מפורשת; נצפה republish 2026-05-10. **אותה תשתית CKAN כמו 408** (כבר בשימוש בפרויקט).
- **הצלבה:** `Owner='עיריית באר שבע'` (שם רשות מדויק) + Name+street+neighborhood + lat/lon. הסכימה כמעט זהה ל-408 (Type/Name/Operator/Owner/handicappe/condition/ForSchool).

### 3. תל אביב-יפו — IView2 ArcGIS, שדה `date_import` לכל רשומה (machine-pollable) ⭐
- בסיס: `https://gisn.tel-aviv.gov.il/arcgis/rest/services/IView2/MapServer/<layer>` — `EPSG:2039` + שדות lon/lat + כתובת מלאה.
- **שכבות ספורט:** 936 אצטדיונים/היכלים · 938 מגרשי ספורט · 939 בריכות · 943 מגרשי ספורט · **834 מתקני כושר בגינות** · 466 טניס-שולחן בגינות · 553 (near-live, date_import 01/07/2026 — שבועיים לפני הריצה).
- **קצב:** אין Frequency מוצהר, אבל כל רשומה נושאת `date_import` (למשל 14/03/2026) → אפשר לזהות reload פרוגרמטית ולתזמן ETL.
- **הצלבה:** נ"צ ITM ישיר מול 408 + שם מתקן + כתובת מלאה + שכונה + שדה operator (משלים את פער owner/operator של 408). *הערי הכי עשירות ב-open-GIS — זה הדפוס לשכפל לערים נוספות.*

### 4. Haifa Open Data — CKAN בקבוצת `city_planning_geography` עם **auto-sync נצפה** ⭐
- `https://opendata.haifa.muni.il/api/3/action/package_show?id=public_gardens` (GeoJSON, WGS84).
- **קצב:** `public_gardens` עודכן 2026-07-15 (יום לפני הריצה) — רענון מתגלגל ~יומי נצפה בקבוצה. **גינות ציבוריות** = בדיוק "גן ציבורי עם מתקן ספורט" שחיפשת.
- **הצלבה:** WGS84 (spatial-join / point-in-polygon ל-408) או שם-גן+רחוב+עיר=חיפה.

### 5. BudgetKey `supports_transactions_data` — SQL API חי לתמיכות סל-הספורט
- `GET https://next.obudget.org/api/query?query=SELECT ... FROM supports_transactions_data WHERE ...` (מאומת חי, שורות 2026).
- **קצב:** near-live/שנתי (מתמלא מפרסום התמיכות הממשלתי החובה).
- **הצלבה:** `recipient_entity_id` (קוד רשות — אותו מרחב מפתחות כמו BudgetKey entities_geo שכבר ביד) → מחבר **מימון** למתקן/רשות.

## 🥈 שכבה שנייה — מתקנים ברמת-רשות, ArcGIS FeatureServers חיים (מצוין ל-gap-analysis)
מגרש עשיר של FeatureServers עירוניים/אזוריים עם `editingInfo.lastEditDate` (ניתן ל-polling) + ITM, בלי auth:
- **מועצה אזורית עמק יזרעאל** — `services7.arcgis.com/1ptlMSlFOlAMxpnz/.../izr_sport1124/FeatureServer/0` (edit 2024-11-25, שדה Last_date לכל רשומה).
- **רשות (owner bathenha)** — `services3.arcgis.com/XBDMqmX1PKcVQCKG/.../ספורט/FeatureServer/0` (edit 2024-12-25, **audit-trail מלא** CreationDate/Editor — מעקב-שינויים הטוב ביותר שנמצא).
- **רשות (owner meged-w)** — `services-eu1.arcgis.com/UFcQDN9TjksUhg4p/.../מתקני_ספורט/FeatureServer/0` (FacId + כתובת + ITM).
- **אשדוד** `gis.ashdod.muni.il/arcgis/rest/services/` · **פתח תקווה** `services9.arcgis.com/tfeLX7LFVABzD11G/...` (18 FeatureServers) · **ירושלים** gisviewer + **DataCity CKAN** (`jerusalem.datacity.org.il/dataset/sport`, dual-CRS, אבל stale Dec-2023).
- **MoE מוסדות חינוך** (`resource_id=5548fd63-...`, XLSX עודכן 2026-05-11) — מפתח `SEMEL_מוסד`, מצליב ל-flag "משרת בית ספר" של 408 (אלפי אולמות בי"ס = מתקני ספורט ציבוריים).

**הרעיון:** point-in-polygon/nearest של כל שכבה עירונית מול 408 → מתקנים שקיימים בעיר ולא ב-408 = "חדשים מאז 2021"; ב-408 ולא בעיר = לאמת. הדיף עצמו = מדד איכות-דאטה לרשות.

## ⚠️ שליליות מאומתות (מקורות שאפשר להפסיק לרדוף אחריהם)
- **טוטו — קרן המתקנים** (`winner.co.il/info/keren-mitkanim`): 403 לכלים אוטומטיים, כותרת "2020" = stale. המקור הרשמי היחיד למתקני-טוטו, אך לא נגיש/לא מתעדכן.
- **מפעל הפיס:** **אין feed ציבורי כלל** (בדיקת pais.co.il / culture.pais / goodcauses). רגיסטר פנימי בלבד (דוח מבקר 2009). → בקשת דאטה ישירה, לא API.
- **ייצוא Excel רשמי של המשרד** (`gov.il/.../mapping_sports_facilities`): שם הקובץ "מעודכן 31.1" מטעה — Last-Modified אמיתי = **ינואר 2022**. one-off ישן.
- **חיפה — dataset `https-goo-gl-u7v4qv` ב-data.gov.il:** סתירה — `Frequency=NA` אבל notes אומר "מתעדכנת אחת לחודש"; ההורדה חסומה anti-bot. → להעדיף את opendata.haifa.muni.il הישיר (#4).
- **GovMap layers 210697 (מבני ציבור) / 213418 (גנים ציבוריים):** קיימות אך token-gated, cadence לא ניתן לאימות, ה-CKAN המקביל התברר single-municipality.

## מסקנה אופרטיבית
"פילר 408" נשאר העמוד השדרתי הרשמי, אבל הפער-הרעננות שלו נסגר עכשיו בשלוש דרכים אמיתיות, בסדר עדיפות:
1. **Efshari Bari FeatureServer** (#1) — מקור-אב רשמי חי, ארצי, בלי auth, ITM. להתחיל כאן.
2. **CKAN עירוני מתעדכן** (באר שבע #2, חיפה #4) — הצהרת/תצפית קצב, אותה תשתית CKAN.
3. **IView2/FeatureServers עירוניים** (ת"א #3 + שכבה שנייה) — date_import/lastEditDate ל-polling; שכבת גילוי-פערים ארצית ברמת-רשות.
+ **BudgetKey supports SQL** (#5) לחבר מימון → מתקן/רשות.

*המהלך הלא-טכני עדיין בעל המנוף הגבוה ביותר:* פנייה פנימית ל-`Mitkanim@most.gov.il` לייצוא חי של 408 + ה-ID הפנימי שמחבר מתקן↔מבחן-תמיכה (הופך את הjoin מ-fuzzy למדויק).
