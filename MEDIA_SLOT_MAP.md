# Media ID → slot map (unique placement)

| Media ID | File | Slot (only) |
|----------|------|-------------|
| 2998 | img_3280.jpg | Home **hero only** |
| 2994 | img_3286.jpg | Home proof grid |
| 2989 | img_3018.jpg | Home proof grid |
| 2970 | img_2937.jpg | Home proof grid |
| 2968 | img_2780.jpg | Home proof grid (underbelly) |
| 3001 | img_3258.jpg | `/victron/` |
| 2995 | img_3283.jpg | `/victron/` |
| 2991 | img_3288.jpg | `/victron/` |
| 3000 | img_3254.jpg | `/victron/` |
| 2992 | img_3259.jpg | `/victron/` |
| 2982 | img_2959.jpg | `/electrical/` |
| 2972 | img_2939.jpg | `/electrical/` |
| 2984 | img_2958.jpg | `/electrical/` |
| 2977 | img_2966.png | `/electrical/` |
| 2983 | img_2967.jpg | `/electrical/` |
| 2978 | img_2942.jpg | `/electrical/` |
| 2988 | img_3176.jpg | `/wireless/` only |
| 2986 | img_3026.jpg | `/plumbing/` |
| job-04 | job-04.jpg | `/plumbing/` wet-bay |
| 2985 | img_3024.jpg | `/roof/` |
| 3003 | img_3175.jpg | `/roof/` |
| 3004 | img_3247.jpg | `/about/` |
| 3251 | img_3251.jpg | `/about/` (replaced 2967) |
| 2967 | img_2482.jpg | `/preventive/` (moved from About) |
| job-01 | job-01-1200.webp | `/rv-repair/` |
| job-02 | job-02.jpg | `/trailer/` |
| job-06 | job-06-1200.webp | `/lp-gas/` |
| job-07 | job-07.jpg | `/tech/` |
| job-08 | job-08.jpg | `/ppi/` |
| job-09 | job-09.jpg | `/chassis/` |
| job-10 | job-10.jpg | `/customs/` |
| #68 service band | img_2941, img_2962, img_3104, job-03 | `/service/` photo-band |
| 2045 | umrt-logo (Canva) | Header sitewide + footer mark (targeted pages) |

## Notes
- HOLD 2976 / 2969 never used
- Home IDs 2998/2994/2989/2970 never reused on service lines
- Footer proof strip **omitted this PR** — only 8 unused Media IDs existed; all 8 assigned 1:1 to empty service lines (Dev Lead densify HARD). Brand footer strip soft/not blocking until more exclusive Media lands.
- `/service/` hub restore already on main via #72 / 1ef1201 — not re-touched beyond footer 2045 mark

## Dupes killed
- `img_3280` removed from Home grid, Wireless, Plumbing, About (hero-only)
- `img_3286` removed from Victron (Home keeps P0)
- `img_2937` removed from Electrical (Home keeps P0)
- `img_3018` removed from About (Home keeps P0)
- `img_3247` removed from Victron (About keeps)
- `img_3176` removed from Roof (Wireless keeps)
- HOLD 2976 / 2969 never used

Header mark remains Canva `umrt-logo` (2045). Footer brand row now includes the same 2045 mark on Home, troubleshoot, service, densified service lines, and primary service/about pages.
