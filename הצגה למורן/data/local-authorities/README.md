# שכבת רשויות מקומיות — גבולות שיפוט

מקור רשמי: **משרד הפנים (מינהל התכנון) — שכבת גבולות שיפוט של רשויות מקומיות**.
מופץ דרך פורטל ArcGIS Open Data של משרד הפנים (`gisdata-moinil.opendata.arcgis.com`).

## מה יש כאן

| קובץ | שכבה | Features | תיאור |
|------|------|----------|-------|
| `local-authorities.web.geojson` | `muni_il` | 409 | גבולות שיפוט של רשויות מקומיות (עיריות/מועצות מקומיות/אזוריות). **מוקטן (generalized) לשימוש בדשבורד web.** ~0.9MB |
| `local-authorities.full.geojson` | `muni_il` | 409 | אותה שכבה, **רזולוציה מלאה** (ארכיון/GIS). |
| `settlements-vaadim.web.geojson` | `muni_vaadim` | 1,786 | רמת יישוב/ועד מקומי בתוך מועצות אזוריות. מוקטן ל-web. ~2.7MB |
| `settlements-vaadim.full.geojson` | `muni_vaadim` | 1,786 | אותה שכבה, רזולוציה מלאה. |
| `MoI-gvulot-shiput-retzef-2025-10.zip` | Shapefile | — | ההורדה הרשמית המקורית של משרד הפנים ("גבולות שיפוט – רצף"), עודכן 2025-10-16. הכי עדכני. |

- **CRS:** קבצי ה-GeoJSON הומרו ל-**WGS84 (EPSG:4326)** — מוכן למפות web (Leaflet/Mapbox/QuickSight). ה-Shapefile במקור ITM/רשת ישראל.
- הגיאומטריה המוקטנת נוצרה עם `maxAllowableOffset=0.0005°` (~50 מ') — מספיק לרזולוציית דשבורד, שומר על טופולוגיה.

## שדות מפתח (לחיבור/JOIN לנתוני הדשבורד)

`muni_il` (רשויות):
- **`CR_LAMAS`** — קוד רשות של הלמ״ס (מפתח JOIN מומלץ).
- **`CR_PNIM`** — קוד רשות של משרד הפנים.
- `Muni_Heb` / `Muni_Eng` — שם הרשות.
- `Sug_Muni` — סוג (עירייה / מועצה מקומית / מועצה אזורית / ללא שיפוט).
- `Machoz` — מחוז.
- `Eshkol_MPn` — אשכול חברתי-כלכלי.
- `Sign_Date`, `Tikun1..15` — תאריכי חתימה/תיקוני גבול.

`muni_vaadim` (ועדים/יישובים) מוסיף: `CV_LAMAS`, `CV_PNIM`, `Vaad_Heb`, `Vaad_Eng`, `Nafa1/2`.

## פילוח סוגי רשות (מתוך 409)
מועצה אזורית 127 · מועצה מקומית 122 · עירייה 103 · ללא שיפוט 52 · מועצה מקומית תעשייתית 5.
> ספירה לפי פוליגון (רשות אחת עשויה להתפצל לכמה פוליגוני שיפוט; "ללא שיפוט" = שטח לא-מוניציפלי ברצף הארצי).

## מקורות
- פורטל: https://gisdata-moinil.opendata.arcgis.com/datasets/4d97c52bb29f4c51990ab5b7ac44a0c5
- Feature Service (מקור ה-GeoJSON): `services-eu1.arcgis.com/ORARfqfyRwgjcEva/.../גבולות_שיפוט_רשויות_מקומיות/FeatureServer`
- Item שכבת רצף (Shapefile רשמי): ArcGIS item `4d97c52bb29f4c51990ab5b7ac44a0c5`

הורד: 2026-08-06.
