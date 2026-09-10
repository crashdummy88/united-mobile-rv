# Site Concierge Brain — Handoff

## Who owns what
| Role | Owner |
|------|--------|
| System prompt + FAQ facts (this folder) | **Sales — Field Knowledge** |
| Public-facing chat persona / runtime | **Sales — Site Concierge** |
| Widget embed on staging / Book funnel | **Dev — Funnel & Pages** |
| Money exceptions / angry / legal | **Sales Lead → Matt** |

## Files
- `SYSTEM_PROMPT.md` — paste/load as the model system prompt (**v3**)
- `FAQ_FACTS.md` — retrieval / few-shot / grounded facts (**v3**; connectivity pack + Book-matched lead fields)

## Funnel/Dev asks
1. Wire widget on staging (umrt-sales-prototype / Cloudflare Pages), not live WP cores unless Matt names them.
2. Point model at `SYSTEM_PROMPT.md`; ground answers on `FAQ_FACTS.md`.
3. Book CTA / chat lead fields (required, match Book): Name, Phone, Email, Location (City/ZIP), Issue, Rig info; Prefer Text default → existing Book / Web3Forms path.
4. Escalation path: surface “a human will follow up” + still capture the lead; do not auto-approve discounts.

## Maintenance
Field Knowledge updates these files when pricing, corridor, services, or credentials change. Ping Sales Floor after a canon bump.
