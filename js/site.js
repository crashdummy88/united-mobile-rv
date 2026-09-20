/* Cloudflare Turnstile -- shared non-interactive-widget helper.
 * Reuses the same site key already live on the forum forms. One widget per
 * container, re-executed (not re-rendered) on repeat use so chat can fetch
 * a fresh token per message without a visible challenge for real visitors. */
var UMRT_TURNSTILE_SITEKEY = '0x4AAAAAAEvvXidVbXxlagxj';
var umrtTurnstileWidgets = {};
function umrtEnsureTurnstileScript() {
  if (document.getElementById('cf-turnstile-script')) return;
  var s = document.createElement('script');
  s.id = 'cf-turnstile-script';
  s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
  s.async = true;
  s.defer = true;
  document.head.appendChild(s);
}
function umrtGetTurnstileToken(containerId) {
  umrtEnsureTurnstileScript();
  return new Promise(function (resolve) {
    var tries = 0;
    (function waitForApi() {
      if (window.turnstile) return proceed();
      tries += 1;
      if (tries > 40) return resolve(''); // ~4s -- api.js never loaded
      setTimeout(waitForApi, 100);
    })();
    function proceed() {
      var el = document.getElementById(containerId);
      if (!el) return resolve('');
      var done = false;
      function finish(token) {
        if (done) return;
        done = true;
        resolve(token || '');
      }
      var widgetId = umrtTurnstileWidgets[containerId];
      if (widgetId == null) {
        widgetId = window.turnstile.render(el, {
          sitekey: UMRT_TURNSTILE_SITEKEY,
          size: 'normal',
          appearance: 'interaction-only',
          execution: 'execute',
          callback: finish,
          'error-callback': function () { finish(''); },
          'timeout-callback': function () { finish(''); },
        });
        umrtTurnstileWidgets[containerId] = widgetId;
      } else {
        window.turnstile.reset(widgetId);
      }
      window.turnstile.execute(widgetId);
      setTimeout(function () { finish(''); }, 5000);
    }
  });
}

(function () {
  /* Matt LOCK: every header + mobile bar is Call / Text Now / Book.
     Do not rewrite a Call control onto sms: — older clients use tel:. */
  var BOOK_PUBLIC = 'https://united-mobile-rv-llc.square.site/';
  var TEXT_NOW_HREF = 'sms:+16166065277';
  var TEXT_NOW_COMPACT = 'Text Now';
  var CALL_HREF = 'tel:+16166065277';
  var CALL_LABEL = 'Call (616) 606-5277';
  var navCtaHtml = '<a class="nav-phone" href="' + CALL_HREF + '">' + CALL_LABEL + '</a>'
    + '<a class="btn btn-gold nav-text-now" href="' + TEXT_NOW_HREF + '">' + TEXT_NOW_COMPACT + '</a>'
    + '<a class="btn btn-ghost" href="' + BOOK_PUBLIC + '" target="_blank" rel="noopener">Book</a>';
  var mobileBarHtml = '<a class="btn btn-ghost" href="' + CALL_HREF + '">' + CALL_LABEL + '</a>'
    + '<a class="btn btn-gold" href="' + TEXT_NOW_HREF + '">' + TEXT_NOW_COMPACT + '</a>'
    + '<a class="btn btn-ghost" href="' + BOOK_PUBLIC + '" target="_blank" rel="noopener">Book</a>';
  var navCtas = document.querySelectorAll('.nav-cta');
  for (var ni = 0; ni < navCtas.length; ni++) navCtas[ni].innerHTML = navCtaHtml;
  var mobileBars = document.querySelectorAll('.mobile-bar');
  for (var mi = 0; mi < mobileBars.length; mi++) mobileBars[mi].innerHTML = mobileBarHtml;

  function umrtLinkLabel(a) {
    return (a.textContent || '').replace(/\s+/g, ' ').trim();
  }
  function umrtIsRetiredChromeLink(a) {
    var label = umrtLinkLabel(a);
    var key = a.getAttribute('data-platform-link') || '';
    if (/^(portal|status)$/i.test(key)) return true;
    if (/^(Portal|Status)$/i.test(label)) return true;
    var href = a.getAttribute('href') || '';
    try {
      var host = new URL(href, window.location.origin).hostname;
      if (host === 'portal.unitedmobilerv.com' || host === 'status.unitedmobilerv.com') return true;
    } catch (e) {}
    return false;
  }
  function umrtIsForbiddenIslandNav(a) {
    if (umrtIsRetiredChromeLink(a)) return true;
    return /^(Field guides|Guides|WP Field Guides)$/i.test(umrtLinkLabel(a)); // retired guide-library labels only
  }
  function umrtRemoveChromeLink(a) {
    var li = a.parentNode && a.parentNode.tagName === 'LI' ? a.parentNode : a;
    if (li && li.parentNode) li.parentNode.removeChild(li);
  }

  var chromeRoots = document.querySelectorAll('.nav-links, .site-footer, .umrt-platform-bar');
  for (var ci = 0; ci < chromeRoots.length; ci++) {
    var chromeLinks = chromeRoots[ci].querySelectorAll('a[href]');
    for (var cj = 0; cj < chromeLinks.length; cj++) {
      var chromeA = chromeLinks[cj];
      if (umrtIsRetiredChromeLink(chromeA)) {
        umrtRemoveChromeLink(chromeA);
        continue;
      }
      var chromeLabel = umrtLinkLabel(chromeA);
      if (/^(MAIN HUB|Main Hub|Main)$/i.test(chromeLabel)
        || chromeA.getAttribute('data-platform-link') === 'hub') {
        chromeA.setAttribute('href', 'https://unitedmobilerv.com/');
        chromeA.textContent = 'Home';
        continue;
      }
      if (/^(Book|Book Now|Book a Service|BOOK ONLINE|Book Online|Book service)$/i.test(chromeLabel)) {
        chromeA.setAttribute('href', BOOK_PUBLIC);
        chromeA.setAttribute('target', '_blank');
        chromeA.setAttribute('rel', 'noopener');
        chromeA.textContent = 'Book';
        continue;
      }
      if (/^(Call(\s*\(616\)\s*606[-.\s]?5277)?|\(?616\)?\s*606[-.\s]?5277)$/i.test(chromeLabel)
        || chromeA.getAttribute('data-platform-link') === 'call') {
        chromeA.setAttribute('href', CALL_HREF);
        chromeA.textContent = CALL_LABEL;
        continue;
      }
      if (/^(Text\s*\/\s*Call|Call\s*\/\s*Text|Text Us|Text|Prefer Text.*|Text Now.*)$/i.test(chromeLabel)) {
        chromeA.setAttribute('href', TEXT_NOW_HREF);
        chromeA.textContent = chromeA.closest('.umrt-platform-bar') ? TEXT_NOW_COMPACT
          : (/Text Now \(616\)/i.test(chromeLabel) ? chromeLabel.replace(/^Prefer Text/i, 'Text Now') : TEXT_NOW_COMPACT);
      }
    }
  }

  /* In-page Book a Service / Book Now still pointed at /book-service/
     (the suite). Owner lock: Book lands on Square. Keep the existing
     button labels (no redesign). Optional body[data-book-service] adds
     SKU intent so related guides (generator, winterize, PPI, …) match
     shop service cards. Header Book stays the bare Square homepage. */
  function umrtSquareBookHref(serviceId, serviceName, source) {
    if (!serviceId) return BOOK_PUBLIC;
    var u;
    try { u = new URL(BOOK_PUBLIC); } catch (e) { return BOOK_PUBLIC; }
    u.searchParams.set('service', serviceId);
    if (serviceName) u.searchParams.set('service_name', serviceName);
    u.searchParams.set('utm_source', source || 'umrt_guide');
    u.searchParams.set('utm_medium', 'book_cta');
    u.searchParams.set('utm_campaign', 'book_this_service');
    u.searchParams.set('utm_content', serviceId);
    return u.toString();
  }
  function umrtHrefIsSuiteBook(href) {
    if (!href) return false;
    if (href.indexOf('thank-you') !== -1) return false;
    if (href === '/book-service/' || href === '/book-service') return true;
    try {
      var parsed = new URL(href, window.location.origin);
      if (parsed.hostname === 'book.unitedmobilerv.com') return true;
      return /\/book-service\/?$/.test(parsed.pathname);
    } catch (e) {
      return false;
    }
  }
  var pageService = (document.body && document.body.getAttribute('data-book-service')) || '';
  var pageServiceName = (document.body && document.body.getAttribute('data-book-service-name')) || '';
  var pageSource = (document.body && document.body.getAttribute('data-book-source')) || 'umrt_guide';
  var inPageBook = document.querySelectorAll('main a[href]');
  for (var bi = 0; bi < inPageBook.length; bi++) {
    var ba = inPageBook[bi];
    var blabel = (ba.textContent || '').replace(/\s+/g, ' ').trim();
    if (!/^(Book|Book Now|Book a Service|BOOK ONLINE|Book Online|Book service)$/i.test(blabel)) continue;
    if (!umrtHrefIsSuiteBook(ba.getAttribute('href'))) continue;
    ba.setAttribute('href', umrtSquareBookHref(pageService, pageServiceName, pageSource));
    ba.setAttribute('target', '_blank');
    ba.setAttribute('rel', 'noopener');
  }

  /* Shop/forum/book islands: Shop-first product nav — Home + Shop · Book ·
     Forum · Software · Docs. Not Book-first. Strip retired destinations and guide-library labels. */
  var MAIN_HOME_HREF = 'https://unitedmobilerv.com/';
  var MAIN_HOME_LABEL = 'Home';
  var islandHost = location.hostname === 'shop.unitedmobilerv.com'
    || location.hostname === 'forum.unitedmobilerv.com'
    || location.hostname === 'book.unitedmobilerv.com';
  var meshItems = [
    [MAIN_HOME_LABEL, MAIN_HOME_HREF],
    ['Shop', 'https://shop.unitedmobilerv.com/'],
    ['Book', BOOK_PUBLIC],
    ['Forum', 'https://forum.unitedmobilerv.com/'],
    ['Software', 'https://software.unitedmobilerv.com/'],
    ['Docs', 'https://docs.unitedmobilerv.com/']
  ];
  if (islandHost) {
    var meshNav = document.querySelector('.nav-links');
    if (meshNav) {
      var leftover = Array.prototype.slice.call(meshNav.children);
      leftover.forEach(function (li) { meshNav.removeChild(li); });
      var have = {};
      var extras = [];
      var cartItems = [];
      leftover.forEach(function (li) {
        var a = li.querySelector('a');
        if (!a) { extras.push(li); return; }
        if (umrtIsForbiddenIslandNav(a)) return;
        var name = umrtLinkLabel(a);
        if (/^Cart\b/i.test(name)) { cartItems.push(li); return; }
        have[name.toLowerCase()] = li;
        if (/^(main|home|main hub)$/i.test(name)) {
          have.home = li;
          have['main hub'] = li;
        }
      });
      meshItems.forEach(function (pair) {
        var name = pair[0];
        var href = pair[1];
        var found = have[name.toLowerCase()]
          || (name === MAIN_HOME_LABEL ? (have.home || have['main hub'] || have.main) : null);
        var li;
        var link;
        if (found) {
          li = found;
          link = li.querySelector('a');
          link.setAttribute('href', href);
          if (name === MAIN_HOME_LABEL) link.textContent = MAIN_HOME_LABEL;
          else if (name === 'Book') link.textContent = 'Book';
        } else {
          li = document.createElement('li');
          link = document.createElement('a');
          link.setAttribute('href', href);
          link.textContent = name;
          li.appendChild(link);
        }
        if (name === 'Book') {
          link.setAttribute('target', '_blank');
          link.setAttribute('rel', 'noopener');
        }
        meshNav.appendChild(li);
        if (name === 'Shop') {
          cartItems.forEach(function (c) { meshNav.appendChild(c); });
        }
      });
      extras.forEach(function (li) { meshNav.appendChild(li); });
    }
    var brandTexts = document.querySelectorAll('.site-header .brand-text');
    for (var bt = 0; bt < brandTexts.length; bt++) {
      brandTexts[bt].parentNode.removeChild(brandTexts[bt]);
    }
  }

  /* Text Now / TEXT NOW controls must open sms:, never tel:. Call stays tel:. */
  var textNowLinks = document.querySelectorAll('a[href], a.nav-text-now, a[data-platform-link="text"]');
  for (var ti = 0; ti < textNowLinks.length; ti++) {
    var textA = textNowLinks[ti];
    var textLabel = (textA.textContent || '').replace(/\s+/g, ' ').trim();
    var isTextNow = textA.classList.contains('nav-text-now')
      || textA.getAttribute('data-platform-link') === 'text'
      || /^TEXT\s*NOW\b/i.test(textLabel);
    if (isTextNow) textA.setAttribute('href', TEXT_NOW_HREF);
  }

  var header = document.querySelector('.site-header');
  var toggle = document.querySelector('.nav-toggle');
  if (toggle && header) {
    toggle.addEventListener('click', function () {
      var open = header.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }
  var form = document.getElementById('book-form');
  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var status = document.getElementById('form-status');
      var prefer = form.querySelector('[name="prefer"]');
      if (prefer && !prefer.value) {
        status.className = 'form-status err';
        status.textContent = 'Please choose how you prefer to be contacted.';
        return;
      }
      var data = new FormData(form);
      data.append('subject', 'UMRT Book a Service request');
      status.className = 'form-status';
      status.textContent = 'Sending...';
      try {
        var tsToken = await umrtGetTurnstileToken('book-turnstile');
        data.append('cf-turnstile-response', tsToken);
        // Always go through /api/book -- the Web3Forms key never lives in
        // client-side JS.
        var res = await fetch('/api/book', { method: 'POST', body: data });
        var json = await res.json();
        if (json.success) {
          window.location.href = '/book-service/thank-you/';
        } else {
          status.className = 'form-status err';
          status.textContent = json.message || 'Could not send. Please call (616) 606-5277.';
        }
      } catch (err) {
        status.className = 'form-status err';
        status.textContent = 'Network error. Please call (616) 606-5277.';
      }
    });
  }
})();

/* UMRT AI Chat widget */
(function () {
  function mountChatFab() {
    if (document.getElementById('umrt-chat-root')) return;
    var root = document.createElement('div');
    root.id = 'umrt-chat-root';
    root.innerHTML = [
      '<button type="button" class="chat-fab" id="chat-fab" aria-haspopup="dialog" aria-controls="chat-panel" aria-expanded="false" aria-label="Chat with us">' +
      '<svg class="chat-fab-icon" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>' +
      '<span class="chat-fab-dot" aria-hidden="true"></span>' +
      '</button>',
      '<div class="chat-panel" id="chat-panel" role="dialog" aria-label="UMRT assistant" aria-modal="false">',
      '  <div class="chat-head"><div><h2>UMRT Assistant</h2><div class="sub">Pricing · services · booking help</div></div>',
      '  <button type="button" class="chat-close" id="chat-close" aria-label="Close">×</button></div>',
      '  <div class="chat-msgs" id="chat-msgs" aria-live="polite"></div>',
      '  <div class="chat-softfail">Prefer a human? Call or text <a href="tel:+16166065277">(616) 606-5277</a></div>',
      '  <div class="chat-lead" id="chat-lead">',
      '    <div class="chat-lead-grid">',
      '      <div><label for="cl-name">Name *</label><input id="cl-name" name="name" autocomplete="name" required></div>',
      '      <div><label for="cl-phone">Phone *</label><input id="cl-phone" name="phone" type="tel" autocomplete="tel" required></div>',
      '      <div><label for="cl-email">Email *</label><input id="cl-email" name="email" type="email" autocomplete="email" required></div>',
      '      <div><label for="cl-location">Location *</label><input id="cl-location" name="location" required placeholder="City / ZIP (e.g. Billings 59101)"></div>',
      '      <div><label for="cl-rig">Rig info *</label><input id="cl-rig" name="rig" required placeholder="Year / make / model (or van/trailer type)"></div>',
      '      <div><label for="cl-prefer">Prefer *</label><select id="cl-prefer" name="prefer" required><option value="Text" selected>Text</option><option value="Call">Call</option><option value="Email">Email</option></select></div>',
      '      <div class="full"><label for="cl-issue">Issue *</label><input id="cl-issue" name="issue" required placeholder="Symptoms, error codes, when it started..."></div>',
      '    </div>',
      '    <button type="button" class="chat-send" id="chat-lead-go" style="width:100%;margin-top:8px">Start chat</button>',
      '  </div>',
      '  <div class="chat-compose" id="chat-compose" hidden>',
      '    <textarea id="chat-input" rows="2" placeholder="Ask about pricing, services, corridors..."></textarea>',
      '    <button type="button" class="chat-send" id="chat-send">Send</button>',
      '  </div>',
      '  <div id="chat-turnstile"></div>',
      '</div>'
    ].join('');
    document.body.appendChild(root);

    var fab = document.getElementById('chat-fab');
    var panel = document.getElementById('chat-panel');
    var closeBtn = document.getElementById('chat-close');
    var msgs = document.getElementById('chat-msgs');
    var lead = document.getElementById('chat-lead');
    var compose = document.getElementById('chat-compose');
    var input = document.getElementById('chat-input');
    var sendBtn = document.getElementById('chat-send');
    var leadGo = document.getElementById('chat-lead-go');
    var history = [];
    var leadData = null;
    var transcriptSent = false;

    function openPanel() {
      panel.classList.add('is-open');
      fab.setAttribute('aria-expanded', 'true');
      if (!msgs.dataset.welcomed) {
        addBubble('bot', 'I can help with UMRT pricing, services, service corridors, credentials, and booking. Share your details below  -  Text is selected by default  -  then ask anything. Or call (616) 606-5277.');
        msgs.dataset.welcomed = '1';
      }
    }
    function closePanel() {
      panel.classList.remove('is-open');
      fab.setAttribute('aria-expanded', 'false');
      sendTranscriptIfNeeded();
    }

    async function emailLead(trigger) {
      if (!leadData) return;
      // 'transcript' fires from beforeunload/close -- no time to await a
      // fresh Turnstile token there, so it goes through with an empty one
      // (server will reject with captcha_failed; this send is a background
      // courtesy copy, never user-facing, so that's an acceptable trade-off).
      var tsToken = trigger === 'captured' ? await umrtGetTurnstileToken('chat-turnstile') : '';
      try {
        fetch('/api/chat-lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lead: leadData, trigger: trigger, messages: history, 'cf-turnstile-response': tsToken })
        }).catch(function () {});
      } catch (e) {}
    }

    function sendTranscriptIfNeeded() {
      if (!leadData || transcriptSent || history.length < 2) return;
      transcriptSent = true;
      emailLead('transcript');
    }
    window.addEventListener('beforeunload', sendTranscriptIfNeeded);
    fab.addEventListener('click', function () {
      if (panel.classList.contains('is-open')) closePanel(); else openPanel();
    });
    closeBtn.addEventListener('click', closePanel);

    function escapeHtml(str) {
      var esc = document.createElement('div');
      esc.textContent = str;
      return esc.innerHTML;
    }
    function addBubble(role, text) {
      var d = document.createElement('div');
      d.className = 'chat-bubble ' + role;
      d.innerHTML = escapeHtml(text).replace(/\n/g, '<br>');
      msgs.appendChild(d);
      msgs.scrollTop = msgs.scrollHeight;
    }

    leadGo.addEventListener('click', function () {
      var name = document.getElementById('cl-name').value.trim();
      var phone = document.getElementById('cl-phone').value.trim();
      var email = document.getElementById('cl-email').value.trim();
      var location = document.getElementById('cl-location').value.trim();
      var rig = document.getElementById('cl-rig').value.trim();
      var prefer = document.getElementById('cl-prefer').value;
      var issue = document.getElementById('cl-issue').value.trim();
      if (!name || !phone || !email || !location || !rig || !prefer || !issue) {
        addBubble('bot', 'Please fill Name, Phone, Email, Location, Rig, Prefer, and Issue  -  then we can chat. Or text <a href="tel:+16166065277">(616) 606-5277</a>.');
        return;
      }
      leadData = { name: name, phone: phone, email: email, location: location, city_zip: location, rig: rig, prefer: prefer, issue: issue };
      lead.hidden = true;
      compose.hidden = false;
      addBubble('user', 'Lead: ' + name + ' · ' + location + ' · ' + rig + ' · Prefer ' + prefer + ' · ' + issue);
      addBubble('bot', 'Thanks, ' + name.split(' ')[0] + '. What would you like to know?');
      history.push({ role: 'user', content: 'Lead capture: ' + JSON.stringify(leadData) });
      input.focus();
      emailLead('captured');
    });

    async function sendMessage() {
      var text = (input.value || '').trim();
      if (!text || !leadData) return;
      input.value = '';
      addBubble('user', text);
      history.push({ role: 'user', content: text });
      sendBtn.disabled = true;
      try {
        var chatTsToken = await umrtGetTurnstileToken('chat-turnstile');
        var res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history, lead: leadData, 'cf-turnstile-response': chatTsToken })
        });
        var data = await res.json().catch(function () { return {}; });
        if (!res.ok || !data.reply) {
          throw new Error(data.error || 'fail');
        }
        addBubble('bot', data.reply);
        history.push({ role: 'assistant', content: data.reply });
      } catch (e) {
        addBubble('bot', 'Chat is briefly unavailable. Call or text <a href="tel:+16166065277">(616) 606-5277</a>  -  our team answers. Or <a href="https://united-mobile-rv-llc.square.site/" target="_blank" rel="noopener">Book</a>.');
      } finally {
        sendBtn.disabled = false;
      }
    }
    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
  }
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(mountChatFab, { timeout: 2000 });
  } else {
    setTimeout(mountChatFab, 1);
  }
})();