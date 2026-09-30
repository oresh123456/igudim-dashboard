# Official address sources (authority → locality → street)

Pulled 2026-09-30 via data.gov.il CKAN datastore API (direct file links are bot-challenged). No house numbers, no per-street coords.

| File | Rows | Publisher | Dataset page | API (source of this file) |
|---|---|---|---|---|
| `streets_piba.csv` | 63,577 | רשות האוכלוסין וההגירה | [population_authority/321](https://data.gov.il/he/datasets/population_authority/321) | [resource 9ad3862c…](https://data.gov.il/api/3/action/datastore_search?resource_id=9ad3862c-8391-4b2f-84a4-2d4c68625f4b&limit=5) |
| `localities_piba.csv` | 1,316 | רשות האוכלוסין וההגירה | [population_authority/citiesandsettelments](https://data.gov.il/he/datasets/population_authority/citiesandsettelments) | [resource 5c78e9fa…](https://data.gov.il/api/3/action/datastore_search?resource_id=5c78e9fa-c2e2-4771-93ff-7f400a12f7ba&limit=5) |
| `local_authorities_digital_agency.csv` | 259 | מערך הדיגיטל הלאומי | [cio/municipal-authorities](https://data.gov.il/he/datasets/cio/municipal-authorities) | [resource c4916937…](https://data.gov.il/api/3/action/datastore_search?resource_id=c4916937-f5d3-4295-a22e-88a1af5cde6a&limit=5) |
| `localities_cbs_2023.csv` | 1,484 | הלמ"ס (CBS) | [lamas/localities-in-israel](https://data.gov.il/he/datasets/lamas/localities-in-israel) | [resource d47a54ff…](https://data.gov.il/api/3/action/datastore_search?resource_id=d47a54ff-87f0-44b3-b33a-f284c0c38e5a&limit=5) |
| `joined_authority_locality_street.csv` | 63,577 | **derived** (join of above; not official) | — | — |

## Joins
- street → locality: `סמל_ישוב` (1,316/1,316 match)
- city/local council: locality code = `LocalAuthorityCode` (203/205; misses מגדל תפן 1722, נאות חובב 1770)
- regional council: by name — CBS `שם מעמד מונציפאלי` (1,030 localities), fallback PIBA `שם_מועצה` (53). Codes don't match (authorities use 55xx).
- unassigned: 30 localities / 61 streets (mostly Bedouin שבט localities + מקווה ישראל)
- `authority_match` column in joined file = which route was used.

## Coords (joined file)
Locality-level ITM only, from CBS `קואורדינטות`: 12-digit = X(6)+Y(6) m; 10-digit = X(5)+Y(5) ×10 m. 1,264/1,316 localities have coords.
