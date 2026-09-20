/**
 * GET /shop/p/:id -- real, server-rendered product page.
 * Phase 1: reference pricing + a quote-request form (four service tiers per
 * the "Product + Service" model) instead of a live checkout charge.
 */
import { formatPrice, priceNote, displayName, CATEGORY_ICONS, stockStatusMeta } from '../../_lib/shop.js';
import { islandHeader, islandFooter, islandMobileBar } from '../../_lib/mesh-chrome.js';
import { shopQuoteNavItem, quoteFormHtml } from '../../_lib/quote-form.js';

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
${islandHeader({ current: 'shop', extraNavHtml: shopQuoteNavItem() })}
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
        <div class="btn-row product-quote-ctas">
          <a class="btn btn-gold" href="#quote">Request quote</a>
          <button type="button" class="btn btn-ghost shop-add-btn add-cart-btn" id="add-cart-btn" data-product-id="${esc(product.id)}">Add to quote</button>
        </div>
      </div>
    </div>
  </div>
</section>
<section class="band">
  <div class="wrap wrap-narrow">
    <h2>Description</h2>
    <p>${esc(product.description || 'Technical details available on request.')}</p>
    ${product.compatibility ? `<h2>Compatibility</h2><p>${esc(product.compatibility)}</p>` : ''}
    ${componentsHtml}
    ${product.installation_required ? '<p class="held-note">Professional installation is recommended for this item. Request the hardware quote here; <a href="https://book.unitedmobilerv.com/" target="_blank" rel="noopener">schedule installation</a> after the Square invoice if you want us on the coach.</p>' : ''}
  </div>
</section>
<section class="shop-checkout-band" id="quote">
  <div class="wrap wrap-narrow">
    ${quoteFormHtml({ variant: 'product', productId: product.id, nextHref: `${base}/shop/p/${product.id}` })}
  </div>
</section>
</main>
${islandFooter({ current: 'shop' })}
${islandMobileBar()}
<script src="/js/cart.js"></script>
<script src="/js/quote-form.js"></script>
<script src="/js/site.js?v=20260918mesh" defer></script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
  });
}
