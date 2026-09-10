# Cloudflare Pages — united-mobile-rv (mothership)

**Tip:** https://united-mobile-rv.pages.dev/  
**Domain HOLD** — do not attach unitedmobilerv.com custom domains yet.  
**SEO:** mothership Pages is **noindex** vs live WP (`X-Robots-Tag` + meta).

## Workers AI chat (required — free Llama)

`POST /api/chat` uses **Cloudflare Workers AI** only. No OpenAI/Anthropic keys required.

### Bind AI on the Pages project
1. Cloudflare Dashboard → Workers & Pages → **united-mobile-rv**
2. **Settings → Bindings** (or Functions → Bindings)
3. Add binding:
   - Type: **Workers AI**
   - Variable name: **`AI`** (exact — `env.AI` in `functions/api/chat.js`)
4. Save → redeploy / wait for next Git deploy

### Model
- Default: `@cf/meta/llama-3.1-8b-instruct`
- Optional override env: `WORKERS_AI_MODEL`

### Verify
```bash
curl -sS -X POST https://united-mobile-rv.pages.dev/api/chat \
  -H 'content-type: application/json' \
  -d '{"messages":[{"role":"user","content":"What is your trip fee?"}]}'
```
Expect JSON `{ "reply": "...", "mode": "workers-ai", "model": "@cf/meta/llama-3.1-8b-instruct" }`.  
If `mode: fallback` + hint about binding → AI binding missing.

`wrangler.toml` also declares `[ai] binding = "AI"` for local/Pages config.

## Other
- Prefer Text (616) 606-5277 · Book on /book-service/
- Secrets never in repo
