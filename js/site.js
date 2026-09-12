/* Cloudflare Turnstile -- shared invisible-widget helper.
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
          size: 'invisible',
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
        addBubble('bot', 'I can help with UMRT pricing, services, service corridors, credentials, and booking. Share your details below  -  Prefer Text is selected by default  -  then ask anything. Or call (616) 606-5277.');
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
        addBubble('bot', 'Chat is briefly unavailable. Call or text <a href="tel:+16166065277">(616) 606-5277</a>  -  Matt answers. Or use <a href="/book-service/">Book a Service</a>.');
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