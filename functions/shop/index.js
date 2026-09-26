/**
 * GET /shop/ -- real, server-rendered shop homepage.
 * Lists published (active=1) products grouped by problem-based category,
 * per the ecommerce spec's "category pages around customer problems" rule.
 * Phase 1: no live checkout -- every product routes to a quote request.
 *
 * 2026-09-20: sale catalog is Parts only. Appointments stay on Book /
 * Square / WP /service/ -- not a second Services tab in this catalog.
 * Legacy services-tab query bookmarks still 200 and render parts.
 */
import { formatPrice, displayName, CATEGORY_ICONS, stockStatusMeta, productSquareHref } from '../_lib/shop.js';
import { productImageSrc } from '../_lib/product-image.js';
import { islandHeader, islandFooter, islandMobileBar, shopCartNavItem, clarityHeadSnippet, landJsonLdSnippet, landCrumbsNav } from '../_lib/mesh-chrome.js';
import {
  quoteFirstSection,
  shopEmptyHtml,
  shopPartsIntroHtml,
  shopQuoteNeedsSection,
  shopSystemsSection,
} from '../_lib/island-substance.js';

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const CATEGORY_LABELS = {
  'rv-batteries': 'RV batteries',
  'rv-solar': 'RV solar',
  'rv-power-protection': 'RV electrical and power protection',
  'rv-connectivity': 'RV connectivity',
  'rv-climate': 'RV climate and A/C',
  'rv-refrigeration': 'RV refrigeration',
  'rv-roof-ventilation': 'RV roof and ventilation',
  'rv-precision-stack': 'Precision stack',
};

function cardImageHtml(p) {
  const src = productImageSrc(p.image_url);
  if (src) {
    return `<img class="shop-card-img" src="${esc(src)}" alt="" loading="lazy" width="220" height="220"
      onerror="this.closest('.shop-card-imgwrap').classList.add('is-fallback');this.remove()">`;
  }
  return `<span class="shop-card-img-fallback" aria-hidden="true">${CATEGORY_ICONS[p.category] || '🔧'}</span>`;
}

async function loadPublishedProducts(db) {
  // square_item_url is migration 022 -- if D1 hasn't been migrated yet,
  // fall back so the catalog still renders (cards then stay quote/cart only).
  try {
    const { results } = await db.prepare(
      `SELECT id, manufacturer, title, category, retail_price, product_type, stock_status, image_url, square_item_url
       FROM products WHERE active = 1 ORDER BY category, manufacturer, title`
    ).all();
    return results || [];
  } catch (err) {
    const msg = String((err && err.message) || err);
    if (!/no such column:\s*square_item_url/i.test(msg)) throw err;
    const { results } = await db.prepare(
      `SELECT id, manufacturer, title, category, retail_price, product_type, stock_status, image_url
       FROM products WHERE active = 1 ORDER BY category, manufacturer, title`
    ).all();
    return results || [];
  }
}

export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const base = url.origin;
  const activeCategory = (url.searchParams.get('category') || '').trim();

  let products = [];
  if (env.DB) {
    products = await loadPublishedProducts(env.DB);
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

  const partsSectionsHtml = categoriesToShow.map((cat) => {
    const label = CATEGORY_LABELS[cat] || cat;
    const cards = byCategory[cat].map((p) => {
      const stock = stockStatusMeta(p);
      const squareHref = productSquareHref(p);
      return `
      <div class="shop-card">
        <a class="shop-card-link" href="${base}/shop/p/${esc(p.id)}">
          <div class="shop-card-imgwrap${productImageSrc(p.image_url) ? '' : ' is-fallback'}">${cardImageHtml(p)}</div>
          <div class="shop-card-body">
            ${p.manufacturer ? `<div class="shop-card-brand">${esc(p.manufacturer)}</div>` : ''}
            <div class="shop-card-title">${esc(displayName(p.manufacturer, p.title))}</div>
            <div class="shop-card-price">${formatPrice(p)}</div>
            <div class="shop-card-meta">${p.product_type === 'kit' ? 'Complete kit' : 'Component'} · published reference price — request a quote for availability and payment</div>
            <span class="shop-stock-chip is-${stock.cls}">${esc(stock.label)}</span>
          </div>
        </a>
        <button type="button" class="btn btn-ghost shop-add-btn" data-product-id="${esc(p.id)}">Add to Cart</button>
        ${squareHref ? `<a class="btn btn-ghost shop-square-link" href="${esc(squareHref)}" target="_blank" rel="noopener">View on Square</a>` : ''}
      </div>`;
    }).join('');
    return `<section class="shop-category-band"><div class="wrap">
      <h2>${esc(label)}</h2>
      <div class="shop-grid">${cards}</div>
    </div></section>`;
  }).join('\n');

  const partsContextHtml = `${quoteFirstSection({ variant: 'shop' })}
${shopSystemsSection()}
${shopQuoteNeedsSection()}`;

  const sectionsHtml = partsSectionsHtml ? `${partsSectionsHtml}\n${partsContextHtml}` : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>RV Systems Shop | United Mobile RV</title>
<meta name="description" content="Specify RV power, solar, lithium, and climate systems that work together. Published reference prices. Request a quote — not a live checkout.">
<link rel="canonical" href="${base}/shop/">
<!-- 2026-09-16: was noindex,follow -- the X-Robots-Tag header in
     functions/_middleware.js now sends index,follow for /shop/ (real
     public catalog, confirmed with Matt), so this meta tag is flipped to
     match rather than left contradicting it -- see that file's own
     comments on why a stale meta/header mismatch is a real bug here. -->
<meta name="robots" content="index,follow">
<link rel="icon" href="/favicon.png" type="image/png">
<link rel="stylesheet" href="/css/site.css?v=20260920crumbs">
<link rel="stylesheet" href="/css/shop.css?v=20260926brand">
${clarityHeadSnippet()}
${landJsonLdSnippet(request, { pageName: 'Systems Shop' })}
</head>
<body class="island-chrome">
<a class="skip-link" href="#main">Skip to content</a>
${islandHeader({ current: 'shop', extraNavHtml: shopCartNavItem(), extraAfterKey: 'shop' })}
${landCrumbsNav(request, { pageName: 'Systems Shop' })}
<main id="main">
<section class="page-hero">
  <div class="wrap">
    ${shopPartsIntroHtml()}
  </div>
</section>
${chipsHtml ? `<section class="shop-filter-band"><div class="wrap">${chipsHtml}</div></section>` : ''}
${sectionsHtml || shopEmptyHtml()}
</main>
${islandFooter({ current: 'shop' })}
${islandMobileBar()}
<script src="/js/cart.js"></script>
<script src="/js/site.js?v=20260920chatoff" defer></script>
<script>
(function () {
  document.querySelectorAll('.shop-add-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      window.UMRTCart.addToCart(btn.dataset.productId, 1);
      var original = btn.textContent;
      btn.textContent = 'Added';
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

// Cloudflare Pages only dispatches onRequestGet to GET. Uptime/CDN HEAD
// probes on /shop/ (and leftover services-tab query bookmarks) were 404
// (GET 200) -- cheap empty 200 matches the GET success status without
// running the D1 listing query.
export function onRequestHead() {
  return new Response(null, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
  });
}
