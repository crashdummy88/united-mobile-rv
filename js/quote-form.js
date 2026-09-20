/**
 * Shop quote / request-info client.
 * Posts to /api/shop/quote. Prefills from existing /api/me (Google SSO).
 * Success copy is Square-invoice, not shop checkout.
 */
(function (window) {
  var BOOK_INSTALL = 'https://book.unitedmobilerv.com/';
  var qfTurnstileWidgetId = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

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

  function checkedValues(form, name) {
    var nodes = form.querySelectorAll('input[name="' + name + '"]:checked');
    return Array.prototype.map.call(nodes, function (el) { return el.value; });
  }

  function bindIntentLabels(form) {
    var submit = form.querySelector('#qf-submit');
    if (!submit) return;
    function sync() {
      var intent = form.querySelector('input[name="intent"]:checked');
      var value = intent ? intent.value : 'quote';
      submit.textContent = value === 'info'
        ? (submit.getAttribute('data-label-info') || 'Request info')
        : (submit.getAttribute('data-label-quote') || 'Request quote');
    }
    form.querySelectorAll('input[name="intent"]').forEach(function (el) {
      el.addEventListener('change', sync);
    });
    sync();
  }

  function showSuccess(form, message) {
    var panel = document.getElementById('quote-success');
    var status = document.getElementById('qf-status');
    form.hidden = true;
    if (panel) panel.hidden = false;
    if (status) status.textContent = message || '';
  }

  function bindQuoteForm(form) {
    bindIntentLabels(form);
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var status = document.getElementById('qf-status');
      var submitBtn = document.getElementById('qf-submit');
      var name = (document.getElementById('qf-name') || {}).value;
      var phone = (document.getElementById('qf-phone') || {}).value;
      var email = (document.getElementById('qf-email') || {}).value;
      name = String(name || '').trim();
      phone = String(phone || '').trim();
      email = String(email || '').trim();
      if (!name || (!phone && !email)) {
        if (status) status.textContent = 'Name and a phone or email are required.';
        return;
      }

      var variant = form.getAttribute('data-variant') || 'system';
      var items = [];
      var productIdEl = document.getElementById('qf-product-id');
      if (variant === 'cart' && window.UMRTCart) {
        var cart = window.UMRTCart.readCart();
        items = Object.keys(cart).map(function (id) {
          return { product_id: id, quantity: cart[id] };
        });
        if (!items.length) {
          if (status) status.textContent = 'Add at least one item to this quote, or describe the system below.';
          return;
        }
      }

      var rig = String((document.getElementById('qf-rig') || {}).value || '').trim().split(/\s+/);
      var intentEl = form.querySelector('input[name="intent"]:checked');
      var serviceEl = form.querySelector('input[name="service_option"]:checked');
      submitBtn.disabled = true;
      if (status) status.textContent = '';
      var qfToken = await getQuoteTurnstileToken();
      var payload = {
        name: name,
        phone: phone,
        email: email,
        location: String((document.getElementById('qf-location') || {}).value || '').trim(),
        rv_year: rig[0] || '',
        rv_make: rig[1] || '',
        rv_model: rig.slice(2).join(' '),
        service_option: serviceEl ? serviceEl.value : 'hardware_only',
        intent: intentEl ? intentEl.value : 'quote',
        system_goal: checkedValues(form, 'system_goal').join(', '),
        use_case: String((document.getElementById('qf-use') || {}).value || '').trim(),
        notes: String((document.getElementById('qf-notes') || {}).value || '').trim(),
        website: String((document.getElementById('qf-website') || {}).value || '').trim(),
        'cf-turnstile-response': qfToken,
      };
      if (items.length) payload.items = items;
      else if (productIdEl && productIdEl.value) payload.product_id = productIdEl.value;

      var res = await fetch('/api/shop/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      var data = await res.json().catch(function () { return {}; });
      submitBtn.disabled = false;
      if (!data.success) {
        if (status) status.textContent = data.message || 'Could not submit -- please text/call (616) 606-5277 instead.';
        return;
      }
      if (variant === 'cart' && window.UMRTCart) window.UMRTCart.clearCart();
      form.reset();
      showSuccess(form, data.message);
    });
  }

  function googleBtn(href) {
    return '<a class="google-signin-btn" href="' + esc(href) + '">' +
      '<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">' +
      '<path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>' +
      '<path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>' +
      '<path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>' +
      '<path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>' +
      '</svg><span>Sign in with Google</span></a>';
  }

  function bindSso(bar) {
    var login = bar.getAttribute('data-login') || ('https://forum.unitedmobilerv.com/api/auth/google/login?next=' + encodeURIComponent(window.location.href));
    fetch('/api/me').then(function (r) { return r.json(); }).then(function (data) {
      var user = data && data.user;
      if (user && user.name) {
        bar.innerHTML = '<p class="sso-signed-in mb-0">Signed in as <strong>' + esc(user.name) + '</strong> -- same Google account as forum and book. We can attach this request to that identity.</p>';
        if (user.name && document.getElementById('qf-name') && !document.getElementById('qf-name').value) {
          document.getElementById('qf-name').value = user.name;
        }
        if (user.email && document.getElementById('qf-email') && !document.getElementById('qf-email').value) {
          document.getElementById('qf-email').value = user.email;
        }
        return;
      }
      bar.innerHTML = googleBtn(login) +
        '<p class="muted sso-note">Optional. Same Google sign-in already used on forum and book -- we are not creating a third account. Prefills your name so Matt can match the Square invoice later.</p>';
    }).catch(function () {
      bar.innerHTML = googleBtn(login);
    });
  }

  function bindAddToQuote() {
    document.querySelectorAll('.shop-add-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!window.UMRTCart) return;
        window.UMRTCart.addToCart(btn.dataset.productId, 1);
        var original = btn.textContent;
        btn.textContent = 'Added to quote \u2713';
        setTimeout(function () { btn.textContent = original; }, 1200);
      });
    });
  }

  window.UMRTQuote = {
    BOOK_INSTALL: BOOK_INSTALL,
    bindQuoteForm: bindQuoteForm,
    bindSso: bindSso,
  };

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('#quote-form').forEach(bindQuoteForm);
    document.querySelectorAll('.umrt-sso-bar').forEach(bindSso);
    bindAddToQuote();
  });
})(window);
