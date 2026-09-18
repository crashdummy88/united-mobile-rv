import { islandHeader, islandFooter, islandMobileBar, shopCartNavItem } from '../_lib/mesh-chrome.js';
import { QUOTE_FORM_INTRO } from '../_lib/shop.js';

/**
 * GET /shop/cart -- quote-list page (localStorage "cart" is a request list).
 *
 * Static shell (list lives in localStorage via /js/cart.js); the actual
 * line items are fetched client-side from /api/shop/products/:id and
 * rendered into #cart-items. Submitting the form posts the whole list to
 * /api/shop/quote as one request-info lead. Not click-pay-ship -- Matt
 * arranges payment, then orders the shipment.
 */
function escHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export async function onRequestGet(context) {
  const base = new URL(context.request.url).origin;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Quote list | United Mobile RV Shop</title>
<meta name="description" content="Review the items you've gathered and request info. We quote, then arrange payment and shipping.">
<link rel="canonical" href="${base}/shop/cart">
<meta name="robots" content="noindex,follow">
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
    <h1>Quote list</h1>
    <p class="muted">Gather what you need, then request info for the whole list. We quote, Matt arranges payment with you, then orders the shipment. Nothing here charges a card or ships automatically.</p>
  </div>
</section>
<section class="shop-cart-band">
  <div class="wrap wrap-narrow">
    <div id="cart-items"><p class="cart-empty">Loading your quote list&hellip;</p></div>
    <div id="cart-total-wrap" hidden>
      <div class="cart-total">Reference subtotal: $<span id="cart-total">0</span></div>
      <p id="cart-total-note" class="muted" hidden>Plus one or more items priced on request -- the quote we send you will include those. Not a charge.</p>
    </div>
  </div>
</section>
<section class="shop-checkout-band" id="quote" hidden>
  <div class="wrap wrap-narrow" id="quote-wrap">
    <div class="shop-checkout-panel">
    <h2>Request info for this list</h2>
    <p class="muted">${escHtml(QUOTE_FORM_INTRO)}</p>
    <form id="quote-form">
      <label class="service-tier"><input type="radio" name="service_option" value="hardware_only" checked><span class="service-tier-text"><strong>Hardware only</strong><small>You install. After we arrange payment, Matt orders the shipment to you.</small></span></label>
      <label class="service-tier"><input type="radio" name="service_option" value="hardware_plus_config"><span class="service-tier-text"><strong>Hardware + remote configuration</strong><small>After payment, Matt orders the shipment and we configure it remotely (VRM where it applies).</small></span></label>
      <label class="service-tier"><input type="radio" name="service_option" value="hardware_plus_install"><span class="service-tier-text"><strong>Hardware + UMRT installation</strong><small>After payment, Matt orders the shipment and we install it on-site.</small></span></label>
      <label class="service-tier"><input type="radio" name="service_option" value="full_design_install"><span class="service-tier-text"><strong>Full system design + installation</strong><small>We design the system, arrange payment, order the shipment, and install. VRM is an optional add-on.</small></span></label>

      <div class="qf-grid">
        <div class="qf-field"><label class="qf-label" for="qf-name">Your name</label><input class="forum-input" id="qf-name" placeholder="Jane Smith" maxlength="120"></div>
        <div class="qf-field"><label class="qf-label" for="qf-phone">Phone</label><input class="forum-input" id="qf-phone" placeholder="(555) 555-5555" maxlength="40"></div>
        <div class="qf-field"><label class="qf-label" for="qf-email">Email</label><input class="forum-input" id="qf-email" placeholder="you@email.com" maxlength="160"></div>
        <div class="qf-field"><label class="qf-label" for="qf-location">City / State</label><input class="forum-input" id="qf-location" placeholder="Missoula, MT" maxlength="160"></div>
      </div>
      <div class="qf-field"><label class="qf-label" for="qf-rig">RV year / make / model</label><input class="forum-input" id="qf-rig" placeholder="2021 Forest River Cherokee" maxlength="160"></div>
      <div class="qf-field"><label class="qf-label" for="qf-notes">Anything else we should know?</label><textarea class="forum-input" id="qf-notes" rows="3" maxlength="1500"></textarea></div>
      <div class="btn-row"><button type="submit" class="btn btn-gold" id="qf-submit">Request info</button></div>
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
<script src="/js/site.js?v=20260918nav" defer></script>
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

  function renderLine(product, qty) {
    var line = document.createElement('div');
    line.className = 'cart-line';
    line.dataset.productId = product.id;
    var thumbHtml = product.image_url
      // Double-backslash is deliberate, not a typo -- this whole file is one big
      // JS template literal server-side (see the displayName() note below for the
      // same gotcha). A single \' here has its backslash eaten when that outer
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
      '<input class="cart-line-qty" type="number" min="1" max="99" value="' + esc(qty) + '">' +
      '<div class="cart-line-price">' + esc(formatPrice(product)) + '</div>' +
      '<button type="button" class="cart-line-remove" title="Remove">&times;</button>';

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
      itemsEl.innerHTML = '<p class="cart-empty">Your quote list is empty. <a href="/shop/">Browse the shop</a>.</p>';
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
      itemsEl.innerHTML = '<p class="cart-empty">Your quote list is empty. <a href="/shop/">Browse the shop</a>.</p>';
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
    if (!items.length) { status.textContent = 'Your quote list is empty.'; return; }

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
    if (!data.success) { status.textContent = data.message || 'Could not submit -- please text/call (616) 606-5277 instead.'; return; }
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
