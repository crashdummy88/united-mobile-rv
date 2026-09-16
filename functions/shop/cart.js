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
  .cart-line{display:flex;align-items:center;gap:14px;border:1px solid #333;border-radius:10px;padding:12px 16px;margin-bottom:10px}
  .cart-line-thumb{flex:none;width:48px;height:48px;border-radius:8px;background:#0f0f0f;display:flex;align-items:center;justify-content:center;overflow:hidden}
  .cart-line-thumb img{width:100%;height:100%;object-fit:contain;padding:4px}
  .cart-line-thumb.is-fallback{background:linear-gradient(160deg,rgba(201,151,44,0.14),rgba(255,255,255,0.02));font-size:1.3rem;opacity:.55}
  .cart-line-title{flex:1;min-width:0}
  .cart-line-title a{color:inherit;text-decoration:none}
  .cart-line-price{font-weight:700;color:#E8B84B;white-space:nowrap}
  .cart-line-qty{width:60px;padding:6px 8px;border-radius:8px;border:1px solid #333;background:#111;color:#f2f2f2;text-align:center}
  .cart-line-remove{background:none;border:none;color:#9a9a9a;cursor:pointer;font-size:1.1em;padding:4px 8px}
  .cart-line-remove:hover{color:#e05555}
  .cart-empty{color:#9a9a9a;padding:24px 0}
  .cart-total{font-size:1.3em;font-weight:800;color:#E8B84B;margin:16px 0}
  .service-tier{display:block;border:1px solid #333;border-radius:10px;padding:14px 16px;margin-bottom:10px;cursor:pointer;font-size:0.95em;text-transform:none;letter-spacing:normal;color:#f2f2f2}
  .service-tier:hover{border-color:rgba(201,151,44,0.5)}
  .service-tier input{margin-right:10px}
  .service-tier strong{color:#fff}
  textarea.forum-input,input.forum-input{width:100%;padding:14px 16px;border-radius:10px;border:1px solid #333;background:#111;color:#f2f2f2;font-family:inherit;font-size:1.05em;line-height:1.5;margin-bottom:10px}
  .held-note{color:#C9972C;font-size:0.85em}
  .cart-badge-count{display:inline-block;background:#E8B84B;color:#111;border-radius:999px;font-size:0.75em;font-weight:800;padding:1px 7px;margin-left:6px}
</style>
</head>
<body>
<header class="site-header">
  <div class="wrap nav-bar">
    <!-- Absolute URL on purpose, not "/" -- see functions/shop/index.js -->
    <a class="brand" href="https://unitedmobilerv.com/"><img class="brand-logo" src="/assets/brand/umrt-logo.webp" alt="United Mobile RV" width="40" height="40"><span class="brand-text">United Mobile <span>RV</span></span></a>
    <ul class="nav-links">
      <li><a href="/shop/">&larr; Shop</a></li>
      <li><a href="/shop/cart">Cart <span class="cart-badge-count" hidden></span></a></li>
    </ul>
    <!-- Forum removed 2026-09-15: dead link on this host, see
         functions/_middleware.js SHOP_ALLOWED_PREFIXES. -->

    <div class="nav-cta"><a class="nav-phone" href="tel:+16166065277">Prefer Text (616) 606-5277</a></div>
  </div>
</header>
<main id="main">
<section class="page-hero">
  <div class="wrap wrap-narrow">
    <h1>Your Cart</h1>
    <p class="muted">Gather what you need, then request one combined quote. Nothing here is a live checkout -- our team follows up with real pricing and availability.</p>
  </div>
</section>
<section class="band">
  <div class="wrap wrap-narrow">
    <div id="cart-items"><p class="cart-empty">Loading your cart&hellip;</p></div>
    <div id="cart-total-wrap" hidden>
      <div class="cart-total">Reference subtotal: $<span id="cart-total">0</span></div>
      <p id="cart-total-note" class="muted" hidden>Plus one or more items priced on request -- your real quote will include those once we follow up.</p>
    </div>
  </div>
</section>
<section class="band band-gray" id="quote" hidden>
  <div class="wrap wrap-narrow" id="quote-wrap">
    <h2>Request a quote for this cart</h2>
    <p class="muted">One combined quote request covering every item above.</p>
    <form id="quote-form">
      <label class="service-tier"><input type="radio" name="service_option" value="hardware_only" checked> <strong>Hardware only</strong> -- ships to you, you install</label>
      <label class="service-tier"><input type="radio" name="service_option" value="hardware_plus_config"> <strong>Hardware + remote configuration</strong> -- we configure it with you remotely</label>
      <label class="service-tier"><input type="radio" name="service_option" value="hardware_plus_install"> <strong>Hardware + UMRT installation</strong> -- we install it on-site</label>
      <label class="service-tier"><input type="radio" name="service_option" value="full_design_install"> <strong>Full system design + installation</strong> -- we design the whole system around this and install it</label>

      <input class="forum-input" id="qf-name" placeholder="Your name" maxlength="120">
      <input class="forum-input" id="qf-phone" placeholder="Phone" maxlength="40">
      <input class="forum-input" id="qf-email" placeholder="Email" maxlength="160">
      <input class="forum-input" id="qf-location" placeholder="City / State" maxlength="160">
      <input class="forum-input" id="qf-rig" placeholder="RV year / make / model" maxlength="160">
      <textarea class="forum-input" id="qf-notes" rows="3" placeholder="Anything else we should know?" maxlength="1500"></textarea>
      <div class="btn-row"><button type="submit" class="btn btn-gold" id="qf-submit">Request Quote</button></div>
      <p class="held-note" id="qf-status"></p>
      <div id="qf-turnstile"></div>
    </form>
  </div>
</section>
</main>
<script src="/js/cart.js"></script>
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
      itemsEl.innerHTML = '<p class="cart-empty">Your cart is empty. <a href="/shop/">Browse the shop</a>.</p>';
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
      itemsEl.innerHTML = '<p class="cart-empty">Your cart is empty. <a href="/shop/">Browse the shop</a>.</p>';
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
