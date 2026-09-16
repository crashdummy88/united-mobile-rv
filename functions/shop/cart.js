import { islandHeader, islandFooter, islandMobileBar, shopCartNavItem, PREFER_TEXT_HREF, PREFER_TEXT_LABEL } from '../_lib/mesh-chrome.js';

/**
 * GET /shop/cart -- skeleton cart page.
 *
 * Static shell (cart lives in localStorage via /js/cart.js); the actual
 * line items are fetched client-side from /api/shop/products/:id and
 * rendered into #cart-items. Submitting the form posts the whole cart to
 * /api/shop/quote as one quote request. Phase 1: still a quote request,
 * not a live checkout -- no payment happens here.
 */
export async function onRequestGet(context) {
  const base = new URL(context.request.url).origin;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Your Cart | United Mobile RV Shop</title>
<meta name="description" content="Review the items you've gathered and request one combined quote.">
<link rel="canonical" href="${base}/shop/cart">
<meta name="robots" content="noindex,follow">
<link rel="icon" href="/favicon.png" type="image/png">
<link rel="stylesheet" href="/css/site.css">
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
<style>
  .cart-hero{padding:calc(var(--space) * 8) 0 calc(var(--space) * 5)}
  .cart-hero h1{font-size:clamp(2rem,4vw,3.5rem);margin-bottom:calc(var(--space) * 2)}
  .cart-hero .lead{max-width:52ch}
  .cart-section{padding:calc(var(--space) * 4) 0 calc(var(--space) * 6)}
  .cart-quote{padding:calc(var(--space) * 6) 0 calc(var(--space) * 10);border-top:1px solid var(--rule)}
  .cart-quote h2{font-size:clamp(1.6rem,3vw,2.4rem);margin-bottom:calc(var(--space) * 2)}
  .cart-line{display:grid;grid-template-columns:56px minmax(0,1fr) auto auto;align-items:center;gap:12px 16px;border:1px solid rgba(201,151,44,0.25);border-radius:12px;padding:14px 16px;margin-bottom:12px;background:rgba(255,255,255,0.03)}
  .cart-line-thumb{flex:none;width:56px;height:56px;border-radius:8px;background:#0f0f0f;display:flex;align-items:center;justify-content:center;overflow:hidden}
  .cart-line-thumb img{width:100%;height:100%;object-fit:contain;padding:4px}
  .cart-line-thumb.is-fallback{background:linear-gradient(160deg,rgba(201,151,44,0.14),rgba(255,255,255,0.02));font-size:1.3rem;opacity:.55}
  .cart-line-title{min-width:0}
  .cart-line-title a{color:inherit;text-decoration:none;font-weight:600;line-height:1.35}
  .cart-line-title a:hover{color:#E8B84B}
  .cart-line-meta{display:flex;align-items:center;gap:14px}
  .cart-qty{display:flex;align-items:center;gap:8px;margin:0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.5)}
  .cart-line-price{font-weight:700;color:#E8B84B;white-space:nowrap}
  .cart-line-qty{width:64px;padding:8px 6px;border-radius:8px;border:1px solid rgba(201,151,44,0.3);background:#111;color:#f2f2f2;text-align:center}
  .cart-line-remove{background:none;border:none;color:#9a9a9a;cursor:pointer;font-size:1.25em;padding:8px 10px;line-height:1}
  .cart-line-remove:hover{color:#e05555}
  .cart-empty{padding:12px 0 8px}
  .cart-empty-title{font-size:1.15rem;font-weight:600;color:#f2f2f2;margin:0 0 8px}
  .cart-empty .btn{margin-top:16px}
  .cart-total-wrap{margin-top:8px;padding-top:8px}
  .cart-total{font-size:1.2em;font-weight:800;color:#E8B84B;margin:0 0 8px}
  .service-tiers{border:0;margin:0 0 24px;padding:0;min-width:0}
  .service-tiers legend{font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(255,255,255,0.55);margin:0 0 12px;padding:0}
  .service-tier{display:grid;grid-template-columns:auto 1fr;align-items:start;gap:12px;border:1px solid rgba(201,151,44,0.25);border-radius:12px;padding:14px 16px;margin:0 0 10px;cursor:pointer;font-size:0.95em;text-transform:none;letter-spacing:normal;color:#f2f2f2;background:rgba(255,255,255,0.03)}
  .service-tier:hover{border-color:rgba(201,151,44,0.55)}
  .service-tier:has(input:checked){border-color:rgba(201,151,44,0.7);background:rgba(201,151,44,0.08)}
  .service-tier input{margin:3px 0 0;width:auto;accent-color:#C9972C}
  .service-tier strong{display:block;color:#fff;font-size:1em;letter-spacing:normal;text-transform:none}
  .service-tier small{display:block;margin-top:4px;color:rgba(255,255,255,0.55);font-size:0.9em;line-height:1.4;font-weight:400;letter-spacing:normal;text-transform:none}
  .quote-fields{display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;margin:0 0 8px}
  .quote-field{margin:0 0 14px}
  .quote-field.full{grid-column:1/-1}
  .quote-field label{margin-bottom:6px}
  textarea.forum-input,input.forum-input{width:100%;padding:12px 14px;border-radius:10px;border:1px solid rgba(201,151,44,0.28);background:#111;color:#f2f2f2;font-family:inherit;font-size:1.02em;line-height:1.5;margin:0}
  .quote-actions{margin-top:8px}
  .held-note{color:#C9972C;font-size:0.85em}
  .cart-quote-alt{margin-top:14px}
  .cart-badge-count{display:inline-block;background:#E8B84B;color:#111;border-radius:999px;font-size:0.75em;font-weight:800;padding:1px 7px;margin-left:6px}
  @media (max-width:700px){
    .quote-fields{grid-template-columns:1fr}
    .cart-line{grid-template-columns:48px minmax(0,1fr) auto;align-items:start}
    .cart-line-thumb{width:48px;height:48px}
    .cart-line-title{grid-column:2;grid-row:1}
    .cart-line-meta{grid-column:2;grid-row:2;justify-content:space-between;width:100%}
    .cart-line-remove{grid-column:3;grid-row:1 / span 2;align-self:center}
  }
</style>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
${islandHeader({ current: 'shop', extraNavHtml: shopCartNavItem() })}
<main id="main">
<section class="page-hero cart-hero">
  <div class="wrap wrap-narrow">
    <span class="eyebrow"><span class="dot"></span>Shop cart</span>
    <h1>Your Cart</h1>
    <p class="lead">Gather what you need, then request one combined quote. Nothing here is a live checkout. Our team follows up with real pricing and availability.</p>
  </div>
</section>
<section class="cart-section">
  <div class="wrap wrap-narrow">
    <div id="cart-items"><p class="cart-empty muted">Loading your cart&hellip;</p></div>
    <div id="cart-total-wrap" class="cart-total-wrap" hidden>
      <div class="cart-total">Reference subtotal: $<span id="cart-total">0</span></div>
      <p id="cart-total-note" class="muted" hidden>Plus one or more items priced on request. Your real quote will include those once we follow up.</p>
    </div>
  </div>
</section>
<section class="cart-quote" id="quote" hidden>
  <div class="wrap wrap-narrow" id="quote-wrap">
    <h2>Request a quote for this cart</h2>
    <p class="muted">One combined quote request covering every item above.</p>
    <form id="quote-form">
      <fieldset class="service-tiers">
        <legend>How should we handle this</legend>
        <label class="service-tier"><input type="radio" name="service_option" value="hardware_only" checked> <span><strong>Hardware only</strong><small>Ships to you. You install.</small></span></label>
        <label class="service-tier"><input type="radio" name="service_option" value="hardware_plus_config"> <span><strong>Hardware + remote configuration</strong><small>We configure it with you remotely.</small></span></label>
        <label class="service-tier"><input type="radio" name="service_option" value="hardware_plus_install"> <span><strong>Hardware + UMRT installation</strong><small>We install it on-site.</small></span></label>
        <label class="service-tier"><input type="radio" name="service_option" value="full_design_install"> <span><strong>Full system design + installation</strong><small>We design the whole system around this and install it.</small></span></label>
      </fieldset>

      <div class="quote-fields">
        <div class="quote-field">
          <label for="qf-name">Your name <span class="req">*</span></label>
          <input class="forum-input" id="qf-name" name="name" autocomplete="name" maxlength="120">
        </div>
        <div class="quote-field">
          <label for="qf-phone">Phone</label>
          <input class="forum-input" id="qf-phone" name="phone" type="tel" autocomplete="tel" maxlength="40">
        </div>
        <div class="quote-field">
          <label for="qf-email">Email</label>
          <input class="forum-input" id="qf-email" name="email" type="email" autocomplete="email" maxlength="160">
        </div>
        <div class="quote-field">
          <label for="qf-location">City / State</label>
          <input class="forum-input" id="qf-location" name="location" autocomplete="address-level2" maxlength="160">
        </div>
        <div class="quote-field full">
          <label for="qf-rig">RV year / make / model</label>
          <input class="forum-input" id="qf-rig" name="rig" maxlength="160">
        </div>
        <div class="quote-field full">
          <label for="qf-notes">Anything else we should know?</label>
          <textarea class="forum-input" id="qf-notes" name="notes" rows="3" maxlength="1500"></textarea>
        </div>
      </div>
      <div class="btn-row quote-actions"><button type="submit" class="btn btn-gold" id="qf-submit">Request Quote</button></div>
      <p class="held-note" id="qf-status"></p>
      <div id="qf-turnstile"></div>
      <p class="muted cart-quote-alt"><a href="${PREFER_TEXT_HREF}">${PREFER_TEXT_LABEL}</a> if you'd rather send this list that way.</p>
    </form>
  </div>
</section>
</main>
${islandFooter({ current: 'shop' })}
${islandMobileBar()}
<script src="/js/cart.js"></script>
<script src="/js/site.js?v=20260916mesh" defer></script>
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
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // Same null-price handling as /shop/ and /shop/p/:id (functions/_lib/shop.js) --
  // duplicated here since this runs client-side, not through that server module.
  function hasPrice(product) {
    return product && product.retail_price !== null && product.retail_price !== undefined;
  }
  function formatPrice(product) {
    return hasPrice(product) ? '$' + Number(product.retail_price).toLocaleString() : 'Contact for pricing';
  }
  // Same dedup rule as /shop/ and /shop/p/:id -- product titles sometimes
  // already include the manufacturer name; don't repeat it.
  // Same fix as functions/_lib/shop.js displayName() -- also check the
  // manufacturer's first word alone, not just the full string, so
  // "Victron Energy" + "Victron GX Touch 50..." doesn't render as
  // "Victron Energy Victron GX Touch 50...".
  function displayName(manufacturer, title) {
    var m = String(manufacturer || '').trim();
    var t = String(title || '').trim();
    var tLower = t.toLowerCase();
    var mLower = m.toLowerCase();
    // NOTE: this whole file's HTML (including this inline script) is one big
    // JS template literal on the server side. A single backslash-s here
    // would have its backslash silently eaten when that outer literal is
    // parsed, shipping a literal slash-s-plus-slash to the browser instead
    // of a whitespace regex -- needs the doubled backslash to survive.
    var mFirstWord = mLower.split(/\\s+/)[0] || mLower;
    if (tLower.indexOf(mLower) === 0 || (mFirstWord && tLower.indexOf(mFirstWord) === 0)) {
      return t;
    }
    return m + ' ' + t;
  }

  var itemsEl = document.getElementById('cart-items');
  var totalWrap = document.getElementById('cart-total-wrap');
  var totalEl = document.getElementById('cart-total');
  var quoteSection = document.getElementById('quote');
  var loadedProducts = {}; // product_id -> product

  function emptyStateHtml() {
    return '<div class="cart-empty">' +
      '<p class="cart-empty-title">Nothing in this cart yet</p>' +
      '<p class="muted">Add hardware from the shop, then request one combined quote. No charge happens here.</p>' +
      '<a class="btn btn-gold" href="/shop/">Browse the shop</a>' +
      '</div>';
  }

  function renderLine(product, qty) {
    var line = document.createElement('div');
    line.className = 'cart-line';
    line.dataset.productId = product.id;
    var thumbHtml = product.image_url
      // Double-backslash is deliberate, not a typo -- this whole file is one big
      // JS template literal server-side (see the displayName() note below for the
      // same gotcha). A single \\' here has its backslash eaten when that outer
      // literal is parsed, shipping a bare, unescaped ' to the browser -- which
      // prematurely closes THIS string at classList.add(' and throws
      // "SyntaxError: Unexpected identifier 'is'", killing the whole inline
      // <script> block before loadCart() ever runs. That's the exact bug reported
      // 2026-09-16 as the cart hanging forever on "Loading your cart...".
      ? '<img src="' + esc(product.image_url) + '" alt="" loading="lazy" onerror="this.parentElement.classList.add(\\'is-fallback\\');this.remove()">'
      : '<span aria-hidden="true">🔧</span>'; // generic wrench -- cart thumbnails are too small to justify a full per-category icon set
    line.innerHTML =
      '<div class="cart-line-thumb' + (product.image_url ? '' : ' is-fallback') + '">' + thumbHtml + '</div>' +
      '<div class="cart-line-title"><a href="/shop/p/' + esc(product.id) + '">' + esc(displayName(product.manufacturer, product.title)) + '</a></div>' +
      '<div class="cart-line-meta">' +
        '<label class="cart-qty"><span>Qty</span><input class="cart-line-qty" type="number" min="1" max="99" value="' + esc(qty) + '" aria-label="Quantity"></label>' +
        '<div class="cart-line-price">' + esc(formatPrice(product)) + '</div>' +
      '</div>' +
      '<button type="button" class="cart-line-remove" title="Remove" aria-label="Remove from cart">&times;</button>';

    line.querySelector('.cart-line-qty').addEventListener('change', function (e) {
      var newQty = parseInt(e.target.value, 10) || 0;
      window.UMRTCart.setQuantity(product.id, newQty);
      loadCart();
    });
    line.querySelector('.cart-line-remove').addEventListener('click', function () {
      window.UMRTCart.removeFromCart(product.id);
      loadCart();
    });
    return line;
  }

  async function loadCart() {
    var cart = window.UMRTCart.readCart();
    var ids = Object.keys(cart);
    itemsEl.innerHTML = '';
    loadedProducts = {};

    if (!ids.length) {
      itemsEl.innerHTML = emptyStateHtml();
      totalWrap.hidden = true;
      quoteSection.hidden = true;
      return;
    }

    var total = 0;
    var anyLoaded = false;
    var anyUnpriced = false;
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      try {
        var res = await fetch('/api/shop/products/' + encodeURIComponent(id));
        var data = await res.json();
        if (data && data.success && data.product) {
          loadedProducts[id] = data.product;
          itemsEl.appendChild(renderLine(data.product, cart[id]));
          if (hasPrice(data.product)) {
            total += Number(data.product.retail_price) * cart[id];
          } else {
            anyUnpriced = true;
          }
          anyLoaded = true;
        } else {
          // Product no longer active/available -- drop it from the cart silently.
          window.UMRTCart.removeFromCart(id);
        }
      } catch (e) {
        // Network hiccup -- leave this item in the cart, just don't render it this pass.
      }
    }

    if (!anyLoaded) {
      itemsEl.innerHTML = emptyStateHtml();
      totalWrap.hidden = true;
      quoteSection.hidden = true;
      return;
    }

    totalEl.textContent = total.toLocaleString();
    totalWrap.hidden = false;
    document.getElementById('cart-total-note').hidden = !anyUnpriced;
    quoteSection.hidden = false;
  }

  document.getElementById('quote-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    var status = document.getElementById('qf-status');
    var submitBtn = document.getElementById('qf-submit');
    var name = document.getElementById('qf-name').value.trim();
    var phone = document.getElementById('qf-phone').value.trim();
    var email = document.getElementById('qf-email').value.trim();
    if (!name || (!phone && !email)) { status.textContent = 'Name and a phone or email are required.'; return; }

    var cart = window.UMRTCart.readCart();
    var items = Object.keys(cart)
      .filter(function (id) { return loadedProducts[id]; })
      .map(function (id) { return { product_id: id, quantity: cart[id] }; });
    if (!items.length) { status.textContent = 'Your cart is empty.'; return; }

    var rig = document.getElementById('qf-rig').value.trim().split(' ');
    submitBtn.disabled = true;
    status.textContent = '';
    var qfToken = await getQuoteTurnstileToken();
    var res = await fetch('/api/shop/quote', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: items,
        name: name, phone: phone, email: email,
        location: document.getElementById('qf-location').value.trim(),
        rv_year: rig[0] || '', rv_make: rig[1] || '', rv_model: rig.slice(2).join(' '),
        service_option: document.querySelector('input[name="service_option"]:checked').value,
        notes: document.getElementById('qf-notes').value.trim(),
        'cf-turnstile-response': qfToken,
      })
    });
    var data = await res.json().catch(function () { return {}; });
    submitBtn.disabled = false;
    if (!data.success) { status.textContent = data.message || 'Could not submit. ${PREFER_TEXT_LABEL} and we will take the request that way.'; return; }
    status.textContent = data.message;
    window.UMRTCart.clearCart();
    document.getElementById('quote-form').reset();
    loadCart();
  });

  loadCart();
})();
</script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
