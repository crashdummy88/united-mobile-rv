# UMRT sales / staging prototype

**Private staging site for United Mobile RV LLC.**  
This is **not** the live WordPress site at [unitedmobilerv.com](https://unitedmobilerv.com).

Repo: `crashdummy88/umrt-sales-prototype`  
Host target: **Cloudflare Pages** (Git-connected).

## Stack
Static HTML/CSS — no build step. Cloudflare Pages can deploy from the repo root as a static site.

## Cloudflare Pages setup
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
- Phase 1 Pages/IA **in progress**: service-areas + service line pages (`/services/<slug>.html`)
- MVP static pages: Home, Services (hub), Pricing, Book, About, Service Areas
- Book form is a **placeholder** (alert) until Web3Forms (or similar) is wired
- Team fact-check in progress (Audit / Sales / Brand / Dev)
- Guides hub + stub guide pages added; Guides in primary nav

## Do not
- Point this project at live WP cores (Home / Book / Pricing / Services)
- Edit live WordPress
- Add partner logos without brand rights
- Add fake testimonials
