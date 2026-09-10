# Forum setup — one-time steps

This forum needs: a D1 database, three OAuth apps (Google/GitHub/Meta), and a
few secrets set in Cloudflare Pages. None of these live in the repo.

## 1. Create the D1 database

```bash
cd ~/united-mobile-rv
wrangler login          # opens a browser to authorize wrangler CLI on this Cloudflare account
wrangler d1 create umrt_forum
```

Copy the `database_id` it prints, paste it into `wrangler.toml` replacing
`REPLACE_WITH_D1_DATABASE_ID`, then apply the schema:

```bash
wrangler d1 execute umrt_forum --remote --file=./db/schema.sql
```

## 2. Make yourself a moderator

After your first sign-in (step 5 below) run this once, using the email you signed in with:

```bash
wrangler d1 execute umrt_forum --remote \
  --command "UPDATE users SET is_mod = 1 WHERE email = 'YOUR_EMAIL_HERE';"
```

Then `/forum/mod/` will show the AI-flagged review queue for you.

## 3. Register OAuth apps

**Google** — https://console.cloud.google.com/apis/credentials
- Create Credentials → OAuth client ID → Web application
- Authorized redirect URI: `https://united-mobile-rv.pages.dev/api/auth/google/callback`
  (add the netlify.app one too if you're keeping that mirror live)
- Copy Client ID + Client Secret

**GitHub** — https://github.com/settings/developers → New OAuth App
- Homepage URL: `https://united-mobile-rv.pages.dev`
- Authorization callback URL: `https://united-mobile-rv.pages.dev/api/auth/github/callback`
- Copy Client ID, generate + copy Client Secret

**Meta (Facebook)** — https://developers.facebook.com/apps → Create App → "Consumer" or "Business" type
- Add product: Facebook Login → Settings
- Valid OAuth Redirect URI: `https://united-mobile-rv.pages.dev/api/auth/meta/callback`
- Copy App ID + App Secret
- **Note:** Meta requires your app to complete App Review + business verification before
  login works for anyone other than you (added as a Test User) — this is the slow one.
  Google and GitHub work immediately for any user; Meta will only work for you/test users
  until that review clears.

## 4. Set secrets in Cloudflare Pages

Dashboard → Workers & Pages → **united-mobile-rv** → Settings → Environment variables
(Production). Add each of these — never commit them to the repo:

| Variable | Value |
|---|---|
| `SESSION_SECRET` | any long random string (e.g. `openssl rand -hex 32`) |
| `GOOGLE_CLIENT_ID` | from step 3 |
| `GOOGLE_CLIENT_SECRET` | from step 3 |
| `GITHUB_OAUTH_CLIENT_ID` | from step 3 |
| `GITHUB_OAUTH_CLIENT_SECRET` | from step 3 |
| `META_APP_ID` | from step 3 |
| `META_APP_SECRET` | from step 3 |

The `AI` Workers AI binding should already be set from the earlier chat-widget setup — same
binding powers the moderation classifier, no extra cost.

## 5. Redeploy and test

Trigger a redeploy (push to `main`, or manually redeploy in the dashboard) so the new
bindings/env vars take effect, then visit `/forum/`, sign in, post a thread.

## How moderation works

Every new thread/reply is scanned by Workers AI (same free Llama model as the chat widget)
for spam/scam/harassment/explicit content. Flagged-but-low-severity posts still go live but
are logged; high-severity posts are held (hidden) and queued at `/forum/mod/` for a human
(you) to approve or keep removed. The classifier fails open — if it errors, the post is
never blocked, only unflagged.
