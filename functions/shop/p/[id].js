/**
 * GET /shop/p/:id -- real, server-rendered product page.
 * Phase 1: reference pricing + a quote-request form (four service tiers per
 * the "Product + Service" model) instead of a live checkout charge.
 */
import { formatPrice, priceNote, displayName, CATEGORY_ICONS, stockStatusMeta } from '../../_lib/shop.js';
import { islandHeader, islandFooter, islandMobileBar, shopCartNavItem } from '../../_lib/mesh-chrome.js';
import { relatedGuidesForProduct, relatedGuidesMarkup } from '../../_lib/field-guides.js';

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
       retail_price, price_source, stock_status, installation_required, compatibility, image_url
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
        results.map((c) => `<li>${esc(c.quantity)}&times; ${esc(displayName(c.manufacturer, c.title))}</li>`).join('') +
        `</ul></div>`;
    }
  }

  // Shared with functions/shop/index.js's card grid -- functions/_lib/shop.js
  // (2026-09-16) so a product's availability label/copy matches wherever
  // it's shown instead of two hand-maintained copies drifting apart.
  const stock = stockStatusMeta(product);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(displayName(product.manufacturer, product.title))} | United Mobile RV Shop</title>
<meta name="description" content="${esc((product.description || '').slice(0, 150))}">
<link rel="canonical" href="${base}/shop/p/${esc(product.id)}">
<!-- 2026-09-16: matches functions/shop/index.js -- /shop/ is now index,follow
     via the X-Robots-Tag header, so individual product pages follow suit. -->
<meta name="robots" content="index,follow">
<link rel="icon" href="/favicon.png" type="image/png">
<link rel="stylesheet" href="/css/site.css">
<link rel="stylesheet" href="/css/shop.css">
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
</head>
<body>
${islandHeader({ current: 'shop', extraNavHtml: shopCartNavItem() })}
<main id="main">
<section class="page-hero">
  <div class="wrap wrap-narrow">
    <p class="muted mb-0"><a class="text-link" href="/shop/">&larr; Back to shop</a></p>
    <div class="product-hero-grid">
      <div class="product-hero-img${product.image_url ? '' : ' is-fallback'}">${
        product.image_url
          ? `<img src="${esc(product.image_url)}" alt="" loading="eager" onerror="this.closest('.product-hero-img').classList.add('is-fallback');this.remove()">`
          : `<span aria-hidden="true">${CATEGORY_ICONS[product.category] || '🔧'}</span>`
      }</div>
      <div>
        ${product.manufacturer ? `<div class="shop-card-brand">${esc(product.manufacturer)}</div>` : ''}
        <h1>${esc(displayName(product.manufacturer, product.title))}</h1>
        <div class="price-tag">${esc(formatPrice(product))}</div>
        <p class="price-note">${esc(priceNote(product))}</p>
        <span class="shop-stock-chip is-${stock.cls}">${esc(stock.label)}</span>
        <p class="muted" style="margin-top:8px">${esc(stock.note)}</p>
        <button type="button" class="btn btn-gold add-cart-btn" id="add-cart-btn" data-product-id="${esc(product.id)}">Add to Cart</button>
      </div>
    </div>
  </div>
</section>
<section class="band">
  <div class="wrap wrap-narrow">
    <h2>Description</h2>
    <p>${esc(product.description || 'Technical details available on request.')}</p>
    ${relatedGuidesMarkup(relatedGuidesForProduct(product))}
    ${product.compatibility ? `<h2>Compatibility</h2><p>${esc(product.compatibility)}</p>` : ''}
    ${componentsHtml}
    ${product.installation_required ? '<p class="held-note">Professional installation strongly recommended for this item.</p>' : ''}
  </div>
</section>
<section class="shop-checkout-band" id="quote">
  <div class="wrap wrap-narrow">
    <div class="shop-checkout-panel">
    <h2>Request a quote</h2>
    <p class="muted">This isn't a live checkout yet -- submit your info and our team follows up with real pricing, availability, and next steps. No charge happens here. Call or text (616) 606-5277 anytime.</p>
    <form id="quote-form">
      <input type="hidden" id="qf-product-id" value="${esc(product.id)}">
      <label class="service-tier"><input type="radio" name="service_option" value="hardware_only" checked><span class="service-tier-text"><strong>Hardware only</strong><small>We ship it to you and you handle the install.</small></span></label>
      <label class="service-tier"><input type="radio" name="service_option" value="hardware_plus_config"><span class="service-tier-text"><strong>Hardware + remote configuration</strong><small>We ship it and walk you through setup remotely.</small></span></label>
      <label class="service-tier"><input type="radio" name="service_option" value="hardware_plus_install"><span class="service-tier-text"><strong>Hardware + UMRT installation</strong><small>We ship it and send a technician to install it on-site.</small></span></label>
      <label class="service-tier"><input type="radio" name="service_option" value="full_design_install"><span class="service-tier-text"><strong>Full system design + installation</strong><small>We design the complete system around your rig and install everything.</small></span></label>

      <div class="qf-grid">
        <div class="qf-field"><label class="qf-label" for="qf-name">Your name</label><input class="forum-input" id="qf-name" placeholder="Jane Smith" maxlength="120"></div>
        <div class="qf-field"><label class="qf-label" for="qf-phone">Phone</label><input class="forum-input" id="qf-phone" placeholder="(555) 555-5555" maxlength="40"></div>
        <div class="qf-field"><label class="qf-label" for="qf-email">Email</label><input class="forum-input" id="qf-email" placeholder="you@email.com" maxlength="160"></div>
        <div class="qf-field"><label class="qf-label" for="qf-location">City / State</label><input class="forum-input" id="qf-location" placeholder="Missoula, MT" maxlength="160"></div>
      </div>
      <div class="qf-field"><label class="qf-label" for="qf-rig">RV year / make / model</label><input class="forum-input" id="qf-rig" placeholder="2021 Forest River Cherokee" maxlength="160"></div>
      <div class="qf-field"><label class="qf-label" for="qf-notes">Anything else we should know?</label><textarea class="forum-input" id="qf-notes" rows="3" maxlength="1500"></textarea></div>
      <div class="btn-row"><button type="submit" class="btn btn-gold" id="qf-submit">Request Quote</button></div>
      <p class="held-note" id="qf-status"></p>
      <div id="qf-turnstile"></div>
    </form>
    </div>
  </div>
</section>
</main>
${islandFooter({ current: 'shop' })}
${islandMobileBar()}
<script src="/js/cart.js"></script>
<script src="/js/site.js?v=20260917nav" defer></script>
<script>
(function () {
  var qfTurnstileWidgetId = null;
  function getQuoteTurnstileToken() {
    return new Promise(function (resolve) {
      var el = document.getElementById('qf-turnstile');
      if (!window.turnstile || !el) { resolve(''); return; }
      var done = false;
      function finish(token) { if (!done) { done = true; resolve(token || ''); } }
      if (qfTurnstileWidgetId == null) {
        qfTurnstileWidgetId = window.turnstile.render(el, {
          sitekey: '0x4AAAAAAEvvXidVbXxlagxj',
          size: 'normal',
          appearance: 'interaction-only',
          execution: 'execute',
          callback: finish,
          'error-callback': function () { finish(''); },
          'timeout-callback': function () { finish(''); }
        });
      } else {
        window.turnstile.reset(qfTurnstileWidgetId);
      }
      window.turnstile.execute(qfTurnstileWidgetId);
      setTimeout(function () { finish(''); }, 5000);
    });
  }
  var addBtn = document.getElementById('add-cart-btn');
  addBtn.addEventListener('click', function () {
    window.UMRTCart.addToCart(addBtn.dataset.productId, 1);
    var original = addBtn.textContent;
    addBtn.textContent = 'Added to Cart \u2713';
    setTimeout(function () { addBtn.textContent = original; }, 1200);
  });

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
    var qfToken = await getQuoteTurnstileToken();
    var res = await fetch('/api/shop/quote', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: document.getElementById('qf-product-id').value,
        name: name, phone: phone, email: email,
        location: document.getElementById('qf-location').value.trim(),
        rv_year: rig[0] || '', rv_make: rig[1] || '', rv_model: rig.slice(2).join(' '),
        service_option: form.querySelector('input[name="service_option"]:checked').value,
        notes: document.getElementById('qf-notes').value.trim(),
        'cf-turnstile-response': qfToken,
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
