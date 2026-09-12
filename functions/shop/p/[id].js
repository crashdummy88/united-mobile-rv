/**
 * GET /shop/p/:id -- real, server-rendered product page.
 * Phase 1: reference pricing + a quote-request form (four service tiers per
 * the "Product + Service" model) instead of a live checkout charge.
 */
function esc(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function notFoundPage() {
  return new Response(
    `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Product not found | United Mobile RV Shop</title><meta name="robots" content="noindex,follow"><link rel="stylesheet" href="/css/site.css"></head><body><main id="main"><section class="page-hero"><div class="wrap"><h1>Product not found</h1><p class="lead"><a href="/shop/">Back to the shop</a>.</p></div></section></main></body></html>`,
    { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

export async function onRequestGet(context) {
  const { env, params, request } = context;
  const base = new URL(request.url).origin;
  if (!env.DB) return notFoundPage();

  const product = await env.DB.prepare(
    `SELECT id, sku, manufacturer, model, title, description, category, product_type,
       retail_price, price_source, stock_status, installation_required, compatibility
     FROM products WHERE id = ? AND active = 1`
  ).bind(params.id).first();
  if (!product) return notFoundPage();

  let componentsHtml = '';
  if (product.product_type === 'kit') {
    const { results } = await env.DB.prepare(
      `SELECT p.id, p.title, p.manufacturer, p.retail_price, pc.quantity
       FROM product_components pc JOIN products p ON p.id = pc.component_id
       WHERE pc.kit_id = ? AND p.active = 1`
    ).bind(params.id).all();
    if (results && results.length) {
      componentsHtml = `<h2>What's in this kit</h2><div class="faq-item"><ul>` +
        results.map((c) => `<li>${esc(c.quantity)}&times; ${esc(c.manufacturer)} ${esc(c.title)}</li>`).join('') +
        `</ul></div>`;
    }
  }

  const stockNote = {
    unverified: 'Availability not yet confirmed with the supplier for this order -- confirmed as part of your quote.',
    in_stock: 'Currently available.',
    special_order: 'Special order -- lead time confirmed as part of your quote.',
    discontinued: 'This item is discontinued; shown for reference only.',
  }[product.stock_status] || 'Availability confirmed as part of your quote.';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(product.manufacturer)} ${esc(product.title)} | United Mobile RV Shop</title>
<meta name="description" content="${esc((product.description || '').slice(0, 150))}">
<link rel="canonical" href="${base}/shop/p/${esc(product.id)}">
<meta name="robots" content="noindex,follow">
<link rel="icon" href="/favicon.png" type="image/png">
<link rel="stylesheet" href="/css/site.css">
<style>
  .price-tag{font-size:1.8em;font-weight:800;color:#E8B84B;margin:10px 0}
  .price-note{font-size:12px;color:#9a9a9a;margin-top:-6px;margin-bottom:16px}
  .service-tier{display:block;border:1px solid #333;border-radius:10px;padding:14px 16px;margin-bottom:10px;cursor:pointer}
  .service-tier:hover{border-color:rgba(201,151,44,0.5)}
  .service-tier input{margin-right:10px}
  textarea.forum-input,input.forum-input{width:100%;padding:14px 16px;border-radius:10px;border:1px solid #333;background:#111;color:#f2f2f2;font-family:inherit;font-size:1.05em;line-height:1.5;margin-bottom:10px}
  .held-note{color:#C9972C;font-size:0.85em}
</style>
</head>
<body>
<header class="site-header">
  <div class="wrap nav-bar">
    <a class="brand" href="/"><img class="brand-logo" src="/assets/brand/umrt-logo.webp" alt="United Mobile RV" width="40" height="40"><span class="brand-text">United Mobile <span>RV</span></span></a>
    <ul class="nav-links">
      <li><a href="/shop/">&larr; Shop</a></li>
      <li><a href="/forum/">Forum</a></li>
      <li><a href="/guide/">Guides</a></li>
    </ul>
    <div class="nav-cta"><a class="nav-phone" href="tel:+16166065277">Prefer Text (616) 606-5277</a></div>
  </div>
</header>
<main id="main">
<section class="page-hero">
  <div class="wrap wrap-narrow">
    <p class="muted mb-0"><a class="text-link" href="/shop/">&larr; Back to shop</a></p>
    <h1>${esc(product.manufacturer)} ${esc(product.title)}</h1>
    <div class="price-tag">$${Number(product.retail_price).toLocaleString()}</div>
    <p class="price-note">Public reference price (${esc(product.price_source || 'source on file')}) -- your actual quote may differ once availability and shipping are confirmed.</p>
    <p class="muted">${esc(stockNote)}</p>
  </div>
</section>
<section class="band">
  <div class="wrap wrap-narrow">
    <h2>Description</h2>
    <p>${esc(product.description || 'Technical details available on request.')}</p>
    ${product.compatibility ? `<h2>Compatibility</h2><p>${esc(product.compatibility)}</p>` : ''}
    ${componentsHtml}
    ${product.installation_required ? '<p class="held-note">Professional installation strongly recommended for this item.</p>' : ''}
  </div>
</section>
<section class="band band-gray" id="quote">
  <div class="wrap wrap-narrow">
    <h2>Request a quote</h2>
    <p class="muted">This isn't a live checkout yet -- submit your info and Matt follows up with real pricing, availability, and next steps. No charge happens here.</p>
    <form id="quote-form">
      <input type="hidden" id="qf-product-id" value="${esc(product.id)}">
      <label class="service-tier"><input type="radio" name="service_option" value="hardware_only" checked> <strong>Hardware only</strong> -- ships to you, you install</label>
      <label class="service-tier"><input type="radio" name="service_option" value="hardware_plus_config"> <strong>Hardware + remote configuration</strong> -- Matt configures it with you remotely</label>
      <label class="service-tier"><input type="radio" name="service_option" value="hardware_plus_install"> <strong>Hardware + UMRT installation</strong> -- Matt installs it on-site</label>
      <label class="service-tier"><input type="radio" name="service_option" value="full_design_install"> <strong>Full system design + installation</strong> -- Matt designs the whole system around this and installs it</label>

      <input class="forum-input" id="qf-name" placeholder="Your name" maxlength="120">
      <input class="forum-input" id="qf-phone" placeholder="Phone" maxlength="40">
      <input class="forum-input" id="qf-email" placeholder="Email" maxlength="160">
      <input class="forum-input" id="qf-location" placeholder="City / State" maxlength="160">
      <input class="forum-input" id="qf-rig" placeholder="RV year / make / model" maxlength="160">
      <textarea class="forum-input" id="qf-notes" rows="3" placeholder="Anything else we should know?" maxlength="1500"></textarea>
      <div class="btn-row"><button type="submit" class="btn btn-gold" id="qf-submit">Request Quote</button></div>
      <p class="held-note" id="qf-status"></p>
    </form>
  </div>
</section>
</main>
<script>
(function () {
  var form = document.getElementById('quote-form');
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var status = document.getElementById('qf-status');
    var submitBtn = document.getElementById('qf-submit');
    var name = document.getElementById('qf-name').value.trim();
    var phone = document.getElementById('qf-phone').value.trim();
    var email = document.getElementById('qf-email').value.trim();
    if (!name || (!phone && !email)) { status.textContent = 'Name and a phone or email are required.'; return; }
    var rig = document.getElementById('qf-rig').value.trim().split(' ');
    submitBtn.disabled = true;
    status.textContent = '';
    var res = await fetch('/api/shop/quote', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: document.getElementById('qf-product-id').value,
        name: name, phone: phone, email: email,
        location: document.getElementById('qf-location').value.trim(),
        rv_year: rig[0] || '', rv_make: rig[1] || '', rv_model: rig.slice(2).join(' '),
        service_option: form.querySelector('input[name="service_option"]:checked').value,
        notes: document.getElementById('qf-notes').value.trim(),
      })
    });
    var data = await res.json().catch(function(){return {};});
    submitBtn.disabled = false;
    if (!data.success) { status.textContent = data.message || 'Could not submit -- please text/call (616) 606-5277 instead.'; return; }
    status.textContent = data.message;
    form.reset();
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
