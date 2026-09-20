import { islandHeader, islandFooter, islandMobileBar } from '../_lib/mesh-chrome.js';
import { shopQuoteNavItem, quoteFormHtml } from '../_lib/quote-form.js';

/**
 * GET /shop/cart -- quote-request list (not a checkout).
 *
 * Line items live in localStorage via /js/cart.js and render from
 * /api/shop/products/:id. The form posts one quote request to
 * /api/shop/quote. Payment is a later Square invoice -- nothing
 * charges here.
 */
export async function onRequestGet(context) {
  const base = new URL(context.request.url).origin;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Your quote request | United Mobile RV Shop</title>
<meta name="description" content="Review the system you configured and request one quote. Matt prices by hand; you pay on a Square invoice -- not a shop checkout.">
<link rel="canonical" href="${base}/shop/cart">
<meta name="robots" content="noindex,follow">
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
    <h1>Your quote request</h1>
    <p class="muted">This is a quote list, not a checkout. Matt checks current cost by hand -- Artek stays TBD until that check -- then you pay on a Square invoice if the spec holds. Hardware ships after that invoice.</p>
  </div>
</section>
<section class="shop-cart-band">
  <div class="wrap wrap-narrow">
    <div id="cart-items"><p class="cart-empty">Loading your quote list&hellip;</p></div>
    <div id="cart-total-wrap" hidden>
      <div class="cart-total">Reference subtotal: $<span id="cart-total">0</span></div>
      <p id="cart-total-note" class="muted" hidden>Plus one or more items priced on request (including any Artek TBD). Your Square invoice will include those once Matt follows up.</p>
    </div>
  </div>
</section>
<section class="shop-checkout-band" id="quote" hidden>
  <div class="wrap wrap-narrow" id="quote-wrap">
    ${quoteFormHtml({ variant: 'cart', nextHref: `${base}/shop/cart` })}
  </div>
</section>
</main>
${islandFooter({ current: 'shop' })}
${islandMobileBar()}
<script src="/js/cart.js"></script>
<script src="/js/quote-form.js"></script>
<script src="/js/site.js?v=20260918mesh" defer></script>
<script>
(function () {
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function isArtekQuoteOnly(product) {
    if (!product) return false;
    var manufacturer = String(product.manufacturer || '').toLowerCase();
    var id = String(product.id || '').toLowerCase();
    return manufacturer === 'artek' || id.indexOf('artek-') === 0 || manufacturer === 'epoch';
  }
  function hasPrice(product) {
    if (isArtekQuoteOnly(product)) return false;
    return product && product.retail_price !== null && product.retail_price !== undefined;
  }
  function formatPrice(product) {
    if (product && product.display_price) return product.display_price;
    if (isArtekQuoteOnly(product)) return 'Price TBD -- request a quote';
    return hasPrice(product) ? '$' + Number(product.retail_price).toLocaleString() : 'Request quote';
  }
  function displayName(manufacturer, title) {
    var m = String(manufacturer || '').trim();
    var t = String(title || '').trim();
    var tLower = t.toLowerCase();
    var mLower = m.toLowerCase();
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

  function renderLine(product, qty) {
    var line = document.createElement('div');
    line.className = 'cart-line';
    line.dataset.productId = product.id;
    var thumbHtml = product.image_url
      ? '<img src="' + esc(product.image_url) + '" alt="" loading="lazy" onerror="this.parentElement.classList.add(\\'is-fallback\\');this.remove()">'
      : '<span aria-hidden="true">🔧</span>';
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

    if (!ids.length) {
      itemsEl.innerHTML = '<p class="cart-empty">Your quote list is empty. <a href="/shop/">Browse the shop</a> or <a href="/shop/#configure">configure a system</a>.</p>';
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
          itemsEl.appendChild(renderLine(data.product, cart[id]));
          if (hasPrice(data.product) && !data.product.price_tbd) {
            total += Number(data.product.retail_price) * cart[id];
          } else {
            anyUnpriced = true;
          }
          anyLoaded = true;
        } else {
          window.UMRTCart.removeFromCart(id);
        }
      } catch (e) { /* leave the item; skip this pass */ }
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
