# Cloudflare Pages settings

Static site — **no build step**. Connect this repo in Cloudflare Pages with:

| Setting | Value |
|---|---|
| **Framework preset** | None |
| **Build command** | *(leave empty)* |
| **Build output directory** | `/` (repo root). If the UI rejects `/`, use `.` |

## Quick setup
1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Select `crashdummy88/umrt-sales-prototype`
3. Apply the settings above → **Save and Deploy**
4. Preview URL: `*.pages.dev`
5. Optional: custom subdomain (e.g. `staging.unitedmobilerv.com`) — keep apex/www on live WordPress

## Notes
- Root files (`index.html`, `styles.css`, `_headers`, etc.) are the published site.
- Book form uses Web3Forms; set `PUBLIC_FORM_ACCESS_KEY` in `book.html` before public traffic (stub is `YOUR_WEB3FORMS_ACCESS_KEY`).

## Pages Functions

The `functions/` directory is deployed with the project as **Cloudflare Pages Functions** (no separate Workers project required).

- Preset can stay **None** / empty build / output `/` (or `.`) — Functions still deploy alongside static assets.
- `functions/api/chat.js` → `POST /api/chat`
- Set `AI_API_KEY` (and optional `AI_BASE_URL` / `AI_MODEL`) under **Settings → Environment variables**. Do not put keys in HTML/JS.
- Soft-fail: missing key or AI errors return a calm client message + phone CTA; the site remains usable without AI.

