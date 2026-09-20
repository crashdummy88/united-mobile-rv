/**
 * GET /shop/ -- real, server-rendered shop homepage.
 * Lists published (active=1) products grouped by problem-based category,
 * per the ecommerce spec's "category pages around customer problems" rule.
 * Phase 1: no live checkout -- every product routes to a quote request.
 */
import { formatPrice, displayName, CATEGORY_ICONS, formatServicePrice, stockStatusMeta, serviceBookHref } from '../_lib/shop.js';
import { islandHeader, islandFooter, islandMobileBar, shopCartNavItem, clarityHeadSnippet, landJsonLdSnippet, landCrumbsNav } from '../_lib/mesh-chrome.js';
import { relatedGuidesForService, relatedGuidesMarkup } from '../_lib/field-guides.js';
import {
  quoteFirstSection,
  shopEmptyHtml,
  shopPartsIntroHtml,
  shopQuoteNeedsSection,
  shopServicesIntroHtml,
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

// Services tab -- added 2026-09-15. Site-owned content (db/migrations/
// 016_services.sql), deliberately NOT synced from Square: Square stays
// Matt's own internal invoicing tool. See that migration's header for
// the full reasoning.
const SERVICE_CATEGORY_LABELS = {
  diagnostics: 'Diagnostics and planning',
  seasonal: 'Seasonal and inspection',
  'power-solar': 'Power and solar installation',
  'electrical-repair': 'Electrical repair',
  'systems-repair': 'Systems repair',
  connectivity: 'Connectivity',
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
      // book_url is migration 020 -- if D1 hasn't been migrated yet, fall
      // back so the tab still renders (helper then uses Square homepage + intent).
      try {
        const { results } = await env.DB.prepare(
          `SELECT id, title, description, category, price, price_type, price_note, book_url
           FROM services WHERE active = 1 ORDER BY category, display_order, title`
        ).all();
        services = results || [];
      } catch (err) {
        const msg = String((err && err.message) || err);
        if (!/no such column:\s*book_url/i.test(msg)) throw err;
        const { results } = await env.DB.prepare(
          `SELECT id, title, description, category, price, price_type, price_note
           FROM services WHERE active = 1 ORDER BY category, display_order, title`
        ).all();
        services = results || [];
      }
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
            <div class="shop-card-meta">${p.product_type === 'kit' ? 'Complete kit' : 'Component'} · published reference price — request a quote for availability and payment</div>
            <span class="shop-stock-chip is-${stock.cls}">${esc(stock.label)}</span>
          </div>
        </a>
        <button type="button" class="btn btn-ghost shop-add-btn" data-product-id="${esc(p.id)}">Add to Cart</button>
      </div>`;
    }).join('');
    return `<section class="shop-category-band"><div class="wrap">
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
      <div class="shop-card shop-service-card">
        <div class="shop-card-body">
          <div class="shop-card-title">${esc(s.title)}</div>
          <div class="shop-card-price">${esc(formatServicePrice(s))}${s.price_note ? ` <span class="shop-card-price-note">${esc(s.price_note)}</span>` : ''}</div>
          <p class="shop-card-desc">${esc(s.description || '')}</p>
          ${relatedGuidesMarkup(relatedGuidesForService(s))}
        </div>
        <a class="btn btn-ghost" href="${esc(serviceBookHref(s, env))}" target="_blank" rel="noopener">Book this service</a>
      </div>`).join('');
    return `<section class="shop-category-band"><div class="wrap">
      <h2>${esc(label)}</h2>
      <div class="shop-grid">${cards}</div>
    </div></section>`;
  }).join('\n');

  const servicesNoteHtml = `<section class="band"><div class="wrap">
    <p>These cards are published reference rates for system work — install, commission, and seasonal lines. Confirming a line is still a quote, not a cart charge. Hardware you want specified lives on <a class="text-link" href="/shop/">Parts</a>.</p>
  </div></section>`;

  const partsContextHtml = `${quoteFirstSection({ variant: 'shop' })}
${shopSystemsSection()}
${shopQuoteNeedsSection()}`;

  const servicesContextHtml = `${shopSystemsSection()}
${shopQuoteNeedsSection()}`;

  const sectionsHtml = activeTab === 'services'
    ? (services.length ? `${servicesNoteHtml}\n${servicesSectionsHtml}\n${servicesContextHtml}` : '')
    : (partsSectionsHtml ? `${partsSectionsHtml}\n${partsContextHtml}` : '');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${activeTab === 'services' ? 'RV Repair and Install Services' : 'RV Systems Shop'} | United Mobile RV</title>
<meta name="description" content="${activeTab === 'services' ? 'Published rates for Victron installs, commissioning, and seasonal system work. Request a quote — not a live checkout.' : 'Specify RV power, solar, lithium, and climate systems that work together. Published reference prices. Request a quote — not a live checkout.'}">
<link rel="canonical" href="${base}/shop/${activeTab === 'services' ? '?tab=services' : ''}">
<!-- 2026-09-16: was noindex,follow -- the X-Robots-Tag header in
     functions/_middleware.js now sends index,follow for /shop/ (real
     public catalog, confirmed with Matt), so this meta tag is flipped to
     match rather than left contradicting it -- see that file's own
     comments on why a stale meta/header mismatch is a real bug here. -->
<meta name="robots" content="index,follow">
<link rel="icon" href="/favicon.png" type="image/png">
<link rel="stylesheet" href="/css/site.css?v=20260920crumbs">
<link rel="stylesheet" href="/css/shop.css">
${clarityHeadSnippet()}
${landJsonLdSnippet(request, { pageName: activeTab === 'services' ? 'Services' : 'Systems Shop' })}
</head>
<body class="island-chrome">
<a class="skip-link" href="#main">Skip to content</a>
${islandHeader({ current: 'shop', extraNavHtml: shopCartNavItem(), extraAfterKey: 'shop' })}
${landCrumbsNav(request, { pageName: activeTab === 'services' ? 'Services' : 'Systems Shop' })}
<main id="main">
<section class="page-hero">
  <div class="wrap">
    ${activeTab === 'services' ? shopServicesIntroHtml() : shopPartsIntroHtml()}
    ${tabsHtml}
  </div>
</section>
${chipsHtml ? `<section class="shop-filter-band"><div class="wrap">${chipsHtml}</div></section>` : ''}
${sectionsHtml || shopEmptyHtml(activeTab)}
</main>
${islandFooter({ current: 'shop' })}
${islandMobileBar()}
<script src="/js/cart.js"></script>
<script src="/js/site.js?v=20260920svc" defer></script>
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
// probes on /shop/?tab=services were 404 (GET 200) -- cheap empty 200
// matches the GET success status without running the D1 listing query.
export function onRequestHead() {
  return new Response(null, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
  });
}
