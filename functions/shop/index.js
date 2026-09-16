/**
 * GET /shop/ -- real, server-rendered shop homepage.
 * Lists published (active=1) products grouped by problem-based category,
 * per the ecommerce spec's "category pages around customer problems" rule.
 * Phase 1: no live checkout -- every product routes to a quote request.
 */
import { formatPrice, displayName, CATEGORY_ICONS, formatServicePrice, stockStatusMeta } from '../_lib/shop.js';
import { islandHeader, islandFooter, islandMobileBar, shopCartNavItem, BOOK_PUBLIC_HREF } from '../_lib/mesh-chrome.js';

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const CATEGORY_LABELS = {
  'rv-batteries': '🔋 RV Batteries',
  'rv-solar': '☀️ RV Solar',
  'rv-power-protection': '⚡ RV Electrical & Power Protection',
  'rv-connectivity': '📡 RV Connectivity',
  'rv-climate': '❄️ RV Climate & A/C',
  'rv-refrigeration': '🧊 RV Refrigeration',
  'rv-roof-ventilation': '🌬️ RV Roof & Ventilation',
  'rv-precision-stack': '⚙️ Precision Stack',
};

// Services tab -- added 2026-09-15. Site-owned content (db/migrations/
// 016_services.sql), deliberately NOT synced from Square: Square stays
// Matt's own internal invoicing tool. See that migration's header for
// the full reasoning.
const SERVICE_CATEGORY_LABELS = {
  diagnostics: '🔍 Diagnostics & Planning',
  seasonal: '🗓️ Seasonal & Inspection',
  'power-solar': '☀️ Power & Solar Installation',
  'electrical-repair': '⚡ Electrical Repair',
  'systems-repair': '🔧 Systems Repair',
  connectivity: '📡 Connectivity',
};

function cardImageHtml(p) {
  if (p.image_url) {
    return `<img class="shop-card-img" src="${esc(p.image_url)}" alt="" loading="lazy" width="220" height="220"
      onerror="this.closest('.shop-card-imgwrap').classList.add('is-fallback');this.remove()">`;
  }
  return `<span class="shop-card-img-fallback" aria-hidden="true">${CATEGORY_ICONS[p.category] || '🔧'}</span>`;
}

export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const base = url.origin;
  const activeCategory = (url.searchParams.get('category') || '').trim();
  const activeTab = url.searchParams.get('tab') === 'services' ? 'services' : 'parts';

  let products = [];
  let services = [];
  if (env.DB) {
    if (activeTab === 'services') {
      const { results } = await env.DB.prepare(
        `SELECT id, title, description, category, price, price_type, price_note
         FROM services WHERE active = 1 ORDER BY category, display_order, title`
      ).all();
      services = results || [];
    } else {
      const { results } = await env.DB.prepare(
        `SELECT id, manufacturer, title, category, retail_price, product_type, stock_status, image_url
         FROM products WHERE active = 1 ORDER BY category, manufacturer, title`
      ).all();
      products = results || [];
    }
  }

  const tabsHtml = `<div class="shop-tab-row">
    <a class="shop-tab${activeTab === 'parts' ? ' is-active' : ''}" href="${base}/shop/">Parts</a>
    <a class="shop-tab${activeTab === 'services' ? ' is-active' : ''}" href="${base}/shop/?tab=services">Services</a>
  </div>`;

  const byCategory = {};
  for (const p of products) {
    (byCategory[p.category] = byCategory[p.category] || []).push(p);
  }

  const chipsHtml = Object.keys(byCategory).length
    ? `<div class="shop-chip-row">
        <a class="shop-chip${activeCategory ? '' : ' is-active'}" href="${base}/shop/">All</a>
        ${Object.keys(byCategory).map((cat) => `<a class="shop-chip${activeCategory === cat ? ' is-active' : ''}" href="${base}/shop/?category=${encodeURIComponent(cat)}">${esc(CATEGORY_LABELS[cat] || cat)}</a>`).join('')}
      </div>`
    : '';

  const categoriesToShow = activeCategory && byCategory[activeCategory] ? [activeCategory] : Object.keys(byCategory);

  const partsSectionsHtml = categoriesToShow.map((cat) => {
    const label = CATEGORY_LABELS[cat] || cat;
    const cards = byCategory[cat].map((p) => {
      const stock = stockStatusMeta(p);
      return `
      <div class="shop-card">
        <a class="shop-card-link" href="${base}/shop/p/${esc(p.id)}">
          <div class="shop-card-imgwrap${p.image_url ? '' : ' is-fallback'}">${cardImageHtml(p)}</div>
          <div class="shop-card-body">
            ${p.manufacturer ? `<div class="shop-card-brand">${esc(p.manufacturer)}</div>` : ''}
            <div class="shop-card-title">${esc(displayName(p.manufacturer, p.title))}</div>
            <div class="shop-card-price">${formatPrice(p)}</div>
            <div class="shop-card-meta">${p.product_type === 'kit' ? 'Complete kit' : 'Component'} &middot; price shown is a public reference price, not a live quote</div>
            <span class="shop-stock-chip is-${stock.cls}">${esc(stock.label)}</span>
          </div>
        </a>
        <button type="button" class="btn btn-ghost shop-add-btn" data-product-id="${esc(p.id)}">Add to Cart</button>
      </div>`;
    }).join('');
    return `<section class="shop-category-band"><div class="wrap wrap-narrow">
      <h2>${esc(label)}</h2>
      <div class="shop-grid">${cards}</div>
    </div></section>`;
  }).join('\n');

  const servicesByCategory = {};
  for (const s of services) {
    (servicesByCategory[s.category] = servicesByCategory[s.category] || []).push(s);
  }

  const servicesSectionsHtml = Object.keys(servicesByCategory).map((cat) => {
    const label = SERVICE_CATEGORY_LABELS[cat] || cat;
    const cards = servicesByCategory[cat].map((s) => `
      <div class="shop-card service-card">
        <div class="shop-card-body">
          <div class="shop-card-title">${esc(s.title)}</div>
          <div class="shop-card-price">${esc(formatServicePrice(s))}${s.price_note ? ` <span class="shop-card-price-note">${esc(s.price_note)}</span>` : ''}</div>
          <p class="shop-card-desc">${esc(s.description || '')}</p>
        </div>
        <a class="btn btn-ghost" href="${BOOK_PUBLIC_HREF}" target="_blank" rel="noopener">Book this service</a>
      </div>`).join('');
    return `<section class="shop-category-band"><div class="wrap wrap-narrow">
      <h2>${esc(label)}</h2>
      <div class="shop-grid">${cards}</div>
    </div></section>`;
  }).join('\n');

  const servicesNoteHtml = `<section class="band"><div class="wrap wrap-narrow">
    <p class="muted">Shop labor is billed at <strong>$150/hr</strong> after the initial diagnostic. A trip fee applies beyond 30 miles ($1.50/mi each way) -- confirmed with you before any work starts.</p>
  </div></section>`;

  const sectionsHtml = activeTab === 'services'
    ? (services.length ? `${servicesNoteHtml}\n${servicesSectionsHtml}` : '')
    : partsSectionsHtml;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${activeTab === 'services' ? 'RV Repair & Install Services' : 'RV Systems Shop'} | United Mobile RV</title>
<meta name="description" content="${activeTab === 'services' ? 'Diagnostics, installs, winterization, and repair -- real UMRT service rates, book straight from the list.' : "Curated RV power, solar, and climate systems -- tell us what your rig needs to do and we'll tell you what equipment actually works together."}">
<link rel="canonical" href="${base}/shop/${activeTab === 'services' ? '?tab=services' : ''}">
<!-- 2026-09-16: was noindex,follow -- the X-Robots-Tag header in
     functions/_middleware.js now sends index,follow for /shop/ (real
     public catalog, confirmed with Matt), so this meta tag is flipped to
     match rather than left contradicting it -- see that file's own
     comments on why a stale meta/header mismatch is a real bug here. -->
<meta name="robots" content="index,follow">
<link rel="icon" href="/favicon.png" type="image/png">
<link rel="stylesheet" href="/css/site.css">
<style>
  .shop-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;margin-top:16px}
  .shop-card{display:flex;flex-direction:column;background:rgba(255,255,255,0.03);border:1px solid rgba(201,151,44,0.25);border-radius:12px;overflow:hidden;text-decoration:none;color:inherit;transition:border-color .15s}
  .shop-card:hover{border-color:rgba(201,151,44,0.6)}
  .shop-card-imgwrap{aspect-ratio:1/1;background:#0f0f0f;display:flex;align-items:center;justify-content:center;overflow:hidden}
  .shop-card-img{width:100%;height:100%;object-fit:contain;padding:10px}
  .shop-card-imgwrap.is-fallback{background:linear-gradient(160deg,rgba(201,151,44,0.14),rgba(255,255,255,0.02))}
  .shop-card-img-fallback{font-size:2.6rem;opacity:.55}
  .shop-card-body{padding:14px 16px}
  .shop-card-brand{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#C9972C;margin-bottom:4px}
  .shop-card-title{font-weight:700;margin-bottom:6px}
  .shop-card-price{color:#E8B84B;font-weight:800;font-size:1.1em;margin-bottom:6px}
  .shop-card-meta{font-size:12px;color:#9a9a9a;margin-bottom:10px}
  .shop-stock-chip{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;padding:4px 10px;border-radius:999px}
  .shop-stock-chip::before{content:'';width:6px;height:6px;border-radius:50%;background:currentColor}
  .shop-stock-chip.is-ok{color:#4ea36b;background:rgba(78,163,107,0.14)}
  .shop-stock-chip.is-warn{color:#E8B84B;background:rgba(232,184,75,0.14)}
  .shop-stock-chip.is-muted{color:#9a9a9a;background:rgba(255,255,255,0.06)}
  .shop-stock-chip.is-off{color:#d9776f;background:rgba(217,119,111,0.14)}
  .shop-add-btn{margin:0 16px 16px;width:auto}
  .shop-chip-row{display:flex;flex-wrap:wrap;gap:10px}
  .shop-chip{display:inline-flex;align-items:center;background:rgba(255,255,255,0.03);border:1px solid rgba(201,151,44,0.3);color:#E8B84B;font-size:0.9em;font-weight:600;padding:8px 16px;border-radius:999px;text-decoration:none}
  .shop-chip:hover{background:rgba(201,151,44,0.16)}
  /* Purpose-built spacing for stacked category sections -- .band/.band-tight
     are shared sitewide classes sized for one hero-style section per page;
     reusing either here (even band-tight) still compounds into 120px+ of
     dead space between every category when several stack in a row. */
  .shop-category-band{padding:28px 0}
  .shop-category-band:first-of-type{padding-top:8px}
  .shop-chip.is-active{background:#C9972C;border-color:#C9972C;color:#1A1A1A}
  .shop-card-link{display:block;text-decoration:none;color:inherit}
  .cart-badge-count{display:inline-block;background:#E8B84B;color:#111;border-radius:999px;font-size:0.75em;font-weight:800;padding:1px 7px;margin-left:6px}
  .shop-tab-row{display:flex;gap:8px;margin-top:18px}
  .shop-tab{padding:10px 22px;border-radius:999px;border:1px solid rgba(201,151,44,0.3);color:#c9c9c9;font-weight:700;text-decoration:none;font-size:0.95em}
  .shop-tab:hover{border-color:rgba(201,151,44,0.6);color:#f2f2f2}
  .shop-tab.is-active{background:#C9972C;border-color:#C9972C;color:#1A1A1A}
  .service-card{padding-bottom:16px}
  .service-card .shop-card-body{padding-bottom:8px}
  .shop-card-price-note{color:#9a9a9a;font-weight:600;font-size:0.7em;text-transform:uppercase;letter-spacing:.04em}
  .shop-card-desc{color:#c9c9c9;font-size:0.9em;line-height:1.5;margin:0}
  .service-card .btn{margin:12px 16px 0}
</style>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
${islandHeader({ current: 'shop', extraNavHtml: shopCartNavItem() })}
<main id="main">
<section class="page-hero">
  <div class="wrap">
    <span class="eyebrow"><span class="dot"></span>RV Systems Shop</span>
    ${activeTab === 'services' ? `
    <h1>Real rates. Book straight from the list.</h1>
    <p class="lead">Diagnostics, installs, winterization, and repair -- these are UMRT's actual current service rates, the same ones we invoice against. Pick one and book it; we'll confirm scope and schedule with you directly.</p>
    <p class="muted" style="margin-top:14px">Shopping for hardware instead? <a class="text-link" href="/shop/">See Parts</a>.</p>` : `
    <h1>Not a parts store. A systems integrator.</h1>
    <p class="lead">Tell us what your RV is trying to do and we'll tell you what equipment actually works together -- then handle sourcing, configuration, and installation if you want it. Every listing here is a real, cited reference price -- not a guess, and not a live checkout yet. Submit a quote request and our team follows up directly.</p>
    <p class="muted" style="margin-top:14px">Not sure what you need? <a class="text-link" href="${BOOK_PUBLIC_HREF}" target="_blank" rel="noopener">Tell us the problem</a> and skip guessing at part numbers -- we'll spec it for you.</p>`}
    ${tabsHtml}
  </div>
</section>
${chipsHtml ? `<section class="band"><div class="wrap wrap-narrow">${chipsHtml}</div></section>` : ''}
${sectionsHtml || `<section class="band"><div class="wrap wrap-narrow"><p class="muted">${activeTab === 'services' ? 'Services are being added -- check back shortly, or' : 'Products are being added -- check back shortly, or'} <a class="text-link" href="${BOOK_PUBLIC_HREF}" target="_blank" rel="noopener">book a consultation</a> in the meantime.</p></div></section>`}
</main>
${islandFooter({ current: 'shop' })}
${islandMobileBar()}
<script src="/js/cart.js"></script>
<script src="/js/site.js?v=20260916cta" defer></script>
<script>
(function () {
  document.querySelectorAll('.shop-add-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      window.UMRTCart.addToCart(btn.dataset.productId, 1);
      var original = btn.textContent;
      btn.textContent = 'Added \u2713';
      setTimeout(function () { btn.textContent = original; }, 1200);
    });
  });
})();
</script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
  });
}
