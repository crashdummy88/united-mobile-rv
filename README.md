# United Mobile RV  -  SpaceX staging prototype

Private staging site. Separate from unitedmobilerv.com WordPress.

## Cloudflare Pages
- Framework preset: None
- Build command: (empty)
- Output directory: /

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
