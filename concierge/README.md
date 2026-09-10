# Site Concierge Brain (in-repo copy)

| Role | Owner |
|------|--------|
| System prompt + FAQ facts | **Sales — Field Knowledge** |
| Public-facing chat persona / runtime | **Sales — Site Concierge** |
| Re-inline into `/api/chat` after canon bumps | **Dev — Funnel & Pages** |
| Money exceptions / angry / legal | **Sales Lead → Matt** |

## Files
- `SYSTEM_PROMPT.md` — model system prompt (**v2**)
- `FAQ_FACTS.md` — grounded facts (**v2**; includes Network Engineer connectivity pack)

## Funnel wiring
Field Knowledge owns and bumps these files when pricing, corridor, services, credentials, or connectivity canon changes.

**Funnel re-inlines** `SYSTEM_PROMPT.md` + `FAQ_FACTS.md` into `functions/api/chat.js` as `MODEL_CONTEXT` (server-side only — never fetch from client or external URL). After a Field Knowledge bump, Funnel must update the inlined const and ship a new Pages deploy.

Book CTA fields: Name, Phone, City/ZIP, issue, prefer Text → existing Book / soft-fail phone path.
