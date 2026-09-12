/**
 * UMRT Shop cart -- skeleton.
 *
 * Phase 1: there is no live checkout. This is a client-side "quote cart":
 * localStorage holds {product_id: quantity} so a customer can gather more
 * than one item, then submit ONE quote request for the whole cart from
 * /shop/cart (see functions/shop/cart.js), posted to /api/shop/quote.
 * Nothing here charges anything or reserves stock.
 */
(function (window) {
  var STORAGE_KEY = 'umrt_cart_v1';

  function readCart() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : {};
      return (parsed && typeof parsed === 'object') ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  function writeCart(cart) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      /* localStorage unavailable (private mode, etc.) -- cart just won't persist */
    }
    refreshBadges();
  }

  function addToCart(productId, quantity) {
    if (!productId) return;
    var qty = Math.max(1, parseInt(quantity, 10) || 1);
    var cart = readCart();
    cart[productId] = (cart[productId] || 0) + qty;
    writeCart(cart);
  }

  function setQuantity(productId, quantity) {
    var cart = readCart();
    var qty = parseInt(quantity, 10) || 0;
    if (qty <= 0) {
      delete cart[productId];
    } else {
      cart[productId] = qty;
    }
    writeCart(cart);
  }

  function removeFromCart(productId) {
    var cart = readCart();
    delete cart[productId];
    writeCart(cart);
  }

  function clearCart() {
    writeCart({});
  }

  function cartCount() {
    var cart = readCart();
    var total = 0;
    for (var id in cart) {
      if (Object.prototype.hasOwnProperty.call(cart, id)) total += cart[id];
    }
    return total;
  }

  function refreshBadges() {
    var count = cartCount();
    var badges = document.querySelectorAll('.cart-badge-count');
    for (var i = 0; i < badges.length; i++) {
      badges[i].textContent = count > 0 ? String(count) : '';
      badges[i].hidden = count === 0;
    }
  }

  window.UMRTCart = {
    readCart: readCart,
    addToCart: addToCart,
    setQuantity: setQuantity,
    removeFromCart: removeFromCart,
    clearCart: clearCart,
    cartCount: cartCount,
    refreshBadges: refreshBadges,
  };

  document.addEventListener('DOMContentLoaded', refreshBadges);
})(window);
