/**
 * GET /shop/ -- real, server-rendered shop homepage.
 * Lists published (active=1) products grouped by problem-based category,
 * per the ecommerce spec's "category pages around customer problems" rule.
 * Phase 1: no live checkout -- every product routes to a quote request.
 */
function esc(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function displayName(manufacturer, title) {
  const m = String(manufacturer || '').trim();
  const t = String(title || '').trim();
  return t.toLowerCase().indexOf(m.toLowerCase()) === 0 ? t : `${m} ${t}`;
}

const CATEGORY_LABELS = {
  'rv-batteries': '🔋 RV Batteries',
  'rv-solar': '☀️ RV Solar',
  'rv-power-protection': '⚡ RV Electrical & Power Protection',
  'rv-connectivity': '📡 RV Connectivity',
  'rv-climate': '❄️ RV Climate & A/C',
  'rv-refrigeration': '🧊 RV Refrigeration',
  'rv-roof-ventilation': '🌬️ RV Roof & Ventilation',
};

export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const base = url.origin;
  const activeCategory = (url.searchParams.get('category') || '').trim();

  let products = [];
  if (env.DB) {
    const { results } = await env.DB.prepare(
      `SELECT id, manufacturer, title, category, retail_price, product_type, stock_status
       FROM products WHERE active = 1 ORDER BY category, manufacturer, title`
    ).all();
    products = results || [];
  }

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

  const sectionsHtml = categoriesToShow.map((cat) => {
    const label = CATEGORY_LABELS[cat] || cat;
    const cards = byCategory[cat].map((p) => `
      <div class="shop-card">
        <a class="shop-card-link" href="${base}/shop/p/${esc(p.id)}">
          <div class="shop-card-title">${esc(displayName(p.manufacturer, p.title))}</div>
          <div class="shop-card-price">$${Number(p.retail_price).toLocaleString()}</div>
          <div class="shop-card-meta">${p.product_type === 'kit' ? 'Complete kit' : 'Component'} &middot; price shown is a public reference price, not a live quote</div>
        </a>
        <button type="button" class="btn btn-ghost shop-add-btn" data-product-id="${esc(p.id)}">Add to Cart</button>
      </div>`).join('');
    return `<section class="band"><div class="wrap wrap-narrow">
      <h2>${esc(label)}</h2>
      <div class="shop-grid">${cards}</div>
    </div></section>`;
  }).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>RV Systems Shop | United Mobile RV</title>
<meta name="description" content="Curated RV power, solar, and climate systems -- tell us what your rig needs to do and we'll tell you what equipment actually works together.">
<link rel="canonical" href="${base}/shop/">
<meta name="robots" content="noindex,follow">
<link rel="icon" href="/favicon.png" type="image/png">
<link rel="stylesheet" href="/css/site.css">
<style>
  .shop-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;margin-top:16px}
  .shop-card{display:block;background:rgba(255,255,255,0.03);border:1px solid rgba(201,151,44,0.25);border-radius:12px;padding:16px;text-decoration:none;color:inherit;transition:border-color .15s}
  .shop-card:hover{border-color:rgba(201,151,44,0.6)}
  .shop-card-title{font-weight:700;margin-bottom:6px}
  .shop-card-price{color:#E8B84B;font-weight:800;font-size:1.1em;margin-bottom:6px}
  .shop-card-meta{font-size:12px;color:#9a9a9a}
  .shop-chip-row{display:flex;flex-wrap:wrap;gap:10px}
  .shop-chip{display:inline-flex;align-items:center;background:rgba(255,255,255,0.03);border:1px solid rgba(201,151,44,0.3);color:#E8B84B;font-size:0.9em;font-weight:600;padding:8px 16px;border-radius:999px;text-decoration:none}
  .shop-chip:hover{background:rgba(201,151,44,0.16)}
  .shop-chip.is-active{background:#C9972C;border-color:#C9972C;color:#1A1A1A}
  .shop-card-link{display:block;text-decoration:none;color:inherit}
  .shop-add-btn{margin-top:10px;width:100%}
  .cart-badge-count{display:inline-block;background:#E8B84B;color:#111;border-radius:999px;font-size:0.75em;font-weight:800;padding:1px 7px;margin-left:6px}
</style>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap nav-bar">
    <a class="brand" href="/"><img class="brand-logo" src="/assets/brand/umrt-logo.webp" alt="United Mobile RV" width="40" height="40"><span class="brand-text">United Mobile <span>RV</span></span></a>
    <button class="nav-toggle" type="button" aria-label="Menu" aria-expanded="false">☰</button>
    <ul class="nav-links">
      <li><a href="/">Home</a></li>
      <li><a href="/service/">Services</a></li>
      <li><a href="/guide/">Guides</a></li>
      <li><a href="/forum/">Forum</a></li>
      <li><a href="/shop/" aria-current="page">Shop</a></li>
      <li><a href="/shop/cart">Cart <span class="cart-badge-count" hidden></span></a></li>
      <li><a href="/about/">About</a></li>
    </ul>
    <div class="nav-cta">
      <a class="nav-phone" href="tel:+16166065277">Prefer Text (616) 606-5277</a>
      <a class="btn btn-ghost" href="/book-service/">Book</a>
    </div>
  </div>
</header>
<main id="main">
<section class="page-hero">
  <div class="wrap">
    <span class="eyebrow"><span class="dot"></span>RV Systems Shop</span>
    <h1>Not a parts store. A systems integrator.</h1>
    <p class="lead">Tell us what your RV is trying to do and we'll tell you what equipment actually works together -- then handle sourcing, configuration, and installation if you want it. Every listing here is a real, cited reference price -- not a guess, and not a live checkout yet. Submit a quote request and Matt follows up directly.</p>
    <p class="muted" style="margin-top:14px">Not sure what you need? <a class="text-link" href="/shop/#quote-help">Tell us the problem instead</a> and skip guessing at part numbers.</p>
  </div>
</section>
${chipsHtml ? `<section class="band"><div class="wrap wrap-narrow">${chipsHtml}</div></section>` : ''}
${sectionsHtml || '<section class="band"><div class="wrap wrap-narrow"><p class="muted">Products are being added -- check back shortly, or <a class="text-link" href="/book-service/">book a consultation</a> in the meantime.</p></div></section>'}
</main>
<footer class="site-footer">
  <div class="wrap footer-grid">
    <div>
      <div class="footer-brand">United Mobile RV LLC</div>
      <p class="mb-0">Active MT · WY · ID · WA corridor. Case-by-case beyond.</p>
      <p class="mt-6 mb-0"><a href="tel:+16166065277">(616) 606-5277</a><br>
      <a href="mailto:unitedrvnetwork@gmail.com">unitedrvnetwork@gmail.com</a></p>
    </div>
  </div>
</footer>
<script src="/js/cart.js"></script>
<script src="/js/site.js" defer></script>
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
