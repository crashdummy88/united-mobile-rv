# UMRT sales / staging prototype

**Private staging site for United Mobile RV LLC.**  
This is **not** the live WordPress site at [unitedmobilerv.com](https://unitedmobilerv.com).

Repo: `crashdummy88/umrt-sales-prototype`  
Host target: **Cloudflare Pages** (Git-connected).

## Stack
Static HTML/CSS — no build step. Cloudflare Pages can deploy from the repo root as a static site.

## Cloudflare Pages setup
See also **[CF_PAGES.md](./CF_PAGES.md)** for a short reference card.

1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Authorize GitHub → select `crashdummy88/umrt-sales-prototype`
3. Build settings:
   - **Framework preset:** None
   - **Build command:** *(leave empty)*
   - **Build output directory:** `/` (repo root)
4. Deploy. You’ll get a `*.pages.dev` preview URL.
5. Optional later: custom subdomain (e.g. `staging.unitedmobilerv.com`) via the existing Cloudflare zone — keep apex/www on live WP.

## Brand (canon)
- Gold `#C9972C` · Black `#1A1A1A` · White `#FFFFFF` · Light gray `#F5F5F5` · Dark gray `#666666`
- Book CTAs: **Book Now** / **Book a Service**
- Phone `(616) 606-5277` · Email `unitedrvnetwork@gmail.com`

## Status
- MVP static pages: Home, Services, Pricing, Book, About
- Book form wired to **Web3Forms** (access key stubbed as `YOUR_WEB3FORMS_ACCESS_KEY` — replace before public traffic)
- See **CF_PAGES.md** for Cloudflare Pages build settings
- Team fact-check in progress (Audit / Sales / Brand / Dev)

## Do not
- Point this project at live WP cores (Home / Book / Pricing / Services)
- Add partner logos without brand rights

## On-site AI chat

Floating **UMRT Advisor** widget (`chat-widget.js` + `chat-widget.css`) on all public pages. Backend is a **Cloudflare Pages Function** at `/api/chat` (`functions/api/chat.js`).

### Environment variables (server-side only)

Cloudflare Dashboard → your Pages project → **Settings** → **Environment variables** (Production + Preview as needed):

| Variable | Required | Purpose |
|---|---|---|
| `AI_API_KEY` | Preferred | API key for an OpenAI-compatible **chat completions** API. **Never** put this in client JS. |
| `AI_BASE_URL` | Optional | Base URL (default `https://api.openai.com/v1`). Override for compatible providers. |
| `AI_MODEL` | Optional | Model id (default `gpt-4o-mini`). |

**Optional Workers AI path:** If `AI_API_KEY` is unset and the project has a Workers AI binding named `AI`, the function uses `@cf/meta/llama-3.1-8b-instruct` instead.

### Behavior
- Client POSTs `{ messages: [...] }` (optional `lead` object) to `/api/chat`.
- System prompt + FAQ facts live **only** in the Pages Function / `concierge/` (Field Knowledge brain v1) — not in client JS.
- If the function errors, the key is missing, or the AI call fails, the widget **soft-fails**: calm message + prominent call/text link to `(616) 606-5277` (`tel:+16166065277`), plus Book page handoff.

### Concierge brain
- `concierge/SYSTEM_PROMPT.md` + `concierge/FAQ_FACTS.md` — source of truth (also inlined into the function for deploy).

