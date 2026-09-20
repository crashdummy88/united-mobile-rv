# United Mobile RV  -  SpaceX staging prototype

Private staging site. Separate from unitedmobilerv.com WordPress.

## Cloudflare Pages
- Framework preset: None
- Build command: (empty)
- Output directory: /

## Book form + secrets (Pages)

- **AI chat** (`functions/api/chat.js` → `POST /api/chat`): set Production env `OPENAI_API_KEY` (or `ANTHROPIC_API_KEY`). After saving secrets, **Redeploy** the project so Functions bind the new vars. Until then `/api/chat` returns `mode: "local"`.
- **Book form** (`functions/api/book.js` → `POST /api/book`): set Production env `PUBLIC_WEB3FORMS_KEY`. Static HTML cannot read Pages env — the client posts to `/api/book`, which proxies to Web3Forms. Optional: inline a real public key in `window.PUBLIC_WEB3FORMS_KEY` as a client-side fallback.
- **Book host Square embed** (`book.unitedmobilerv.com/` via `functions/_lib/book-suite.js`): optional Pages env `SQUARE_EMBED_URL` (https Square-land appointment / widget URL) for the on-page iframe. Falls back to `SQUARE_BOOKING_URL`, then `https://united-mobile-rv-llc.square.site/`. Non-Square pastes are rejected. `/s/appointments` exists but the live widget has errored — do not default there. Booking still processes via Square; the land host stays `book.*`.
- **Shared Google SSO**: book. and shop. allow `/api/auth/`, `/api/me`, `/api/logout` (same mothership Google login as forum). Add `https://book.unitedmobilerv.com/api/auth/google/callback` (and the shop callback if used) to the Google OAuth client's authorized redirect URIs.
- Never paste secrets into chat or commit them.

## Canon
- Phone: (616) 606-5277
- Trip: $75 / 30mi then $1.50/mi each way
- Labor: ~$150/hr
- Diagnostic: $150 applied if proceed
- CTAs: Book Now / Book a Service
- Creds: Victron Professional Certified Installer; weBoost Authorized Installer; Peplink Certified Associate; Dometic Professional Certified

## Design
Black #1A1A1A, white type, gold #C9972C only. SpaceX-inspired. No rockets/HUD.

## AI chat
- Gold FAB + dark panel (client: js/site.js)
- Backend: Cloudflare Pages Function `functions/api/chat.js` → POST /api/chat
- Set secret OPENAI_API_KEY (or ANTHROPIC_API_KEY) in Pages env  -  never in client
- Without a key, local canon replies still work; upstream errors soft-fail to (616) 606-5277
- Lead gate: Name, Phone, City/ZIP, issue, Prefer (Text default)
