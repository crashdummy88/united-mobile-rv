# WordPress local backup (unitedmobilerv.com)

Scope: full HTML content for every page reachable from the main nav bar
(top-level items + the Services dropdown), pulled live via the WordPress
MCP connector on 2026-09-15, plus a full metadata manifest of all 192
pages on the site (manifest.json).

Note: WordPress.com Jetpack Backup is also active and healthy for this
site independently of this folder -- 144 successful backups since April
2026, most recent one hours before this pull (verified via
backup.rewind_status). This folder is a convenience copy of the pages
that actually change during UI work, not a replacement for that.

## Main nav pages backed up (pages/ directory, named <id>-<slug>.html)

- 1216 home (Home)
- 1446 pricing (Pricing)
- 1543 service (Services -- dropdown parent)
- 1577 rv-repair (General RV Repair & Service)
- 1586 preventive (Preventive Maintenance & Annual Service)
- 1495 electrical (Electrical, Power Systems & Appliance Repair)
- 1591 chassis (Chassis & Engine Diagnostics)
- 1596 generator (Generator Service & Repair)
- 1600 lp-gas (LP Gas Systems & Safety)
- 1527 plumbing (Plumbing Systems & Repair)
- 1532 roof (Roof, Seals & Water Intrusion)
- 1606 trailer (Trailer Wiring & Brake Systems)
- 1611 ppi (Pre-Purchase Inspections)
- 1616 customs (Custom Van & Skoolie Builds)
- 1434 book-service (Request a Service Call)
- 1701 wireless (Connectivity)
- 1812 victron (Victron Energy Power Systems)
- 1724 guide (RV Owner's Field Guide -- index page only, not the 70+ individual guide articles under it)
- 2348 service-areas (Service Areas)

Not included: the ~70 individual /guide/* articles, the ~100 city/state
SEO pages, and drafts -- those are covered by manifest.json (metadata
only) and by Jetpack Backup (full content + files + DB).
