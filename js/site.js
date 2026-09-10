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
      var key = (window.PUBLIC_WEB3FORMS_KEY || '').trim();
      var prefer = form.querySelector('[name="prefer"]');
      if (prefer && !prefer.value) {
        status.className = 'form-status err';
        status.textContent = 'Please choose how you prefer to be contacted.';
        return;
      }
      if (!key || key === 'PUBLIC_WEB3FORMS_KEY' || key.indexOf('REPLACE') !== -1) {
        status.className = 'form-status err';
        status.textContent = 'Online form is not configured yet. Call or text (616) 606-5277 to book.';
        return;
      }
      var data = new FormData(form);
      data.append('access_key', key);
      data.append('subject', 'UMRT Book a Service request');
      status.className = 'form-status';
      status.textContent = 'Sendingâ¦';
      try {
        var res = await fetch('https://api.web3forms.com/submit', { method: 'POST', body: data });
        var json = await res.json();
        if (json.success) {
          window.location.href = '/book-service/thank-you/';
        } else {
          status.className = 'form-status err';
          status.textContent = 'Could not send. Please call (616) 606-5277.';
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
  if (document.getElementById('umrt-chat-root')) return;
  var root = document.createElement('div');
  root.id = 'umrt-chat-root';
  root.innerHTML = [
    '<button type="button" class="chat-fab" id="chat-fab" aria-haspopup="dialog" aria-controls="chat-panel" aria-expanded="false">Chat</button>',
    '<div class="chat-panel" id="chat-panel" role="dialog" aria-label="UMRT assistant" aria-modal="false">',
    '  <div class="chat-head"><div><h2>UMRT Assistant</h2><div class="sub">Pricing · services · booking help</div></div>',
    '  <button type="button" class="chat-close" id="chat-close" aria-label="Close">×</button></div>',
    '  <div class="chat-msgs" id="chat-msgs" aria-live="polite"></div>',
    '  <div class="chat-softfail">Prefer a human? Call or text <a href="tel:+16166065277">(616) 606-5277</a></div>',
    '  <div class="chat-lead" id="chat-lead">',
    '    <div class="chat-lead-grid">',
    '      <div><label for="cl-name">Name *</label><input id="cl-name" name="name" autocomplete="name" required></div>',
    '      <div><label for="cl-phone">Phone *</label><input id="cl-phone" name="phone" type="tel" autocomplete="tel" required></div>',
    '      <div><label for="cl-city">City / ZIP *</label><input id="cl-city" name="city_zip" required></div>',
    '      <div><label for="cl-prefer">Prefer *</label><select id="cl-prefer" required><option value="">Select…</option><option value="Text" selected>Text</option><option value="Call">Call</option><option value="Email">Email</option></select></div>',
    '      <div class="full"><label for="cl-issue">Issue *</label><input id="cl-issue" name="issue" required placeholder="What’s going on?"></div>',
    '    </div>',
    '    <button type="button" class="chat-send" id="chat-lead-go" style="width:100%;margin-top:8px">Start chat</button>',
    '  </div>',
    '  <div class="chat-compose" id="chat-compose" hidden>',
    '    <textarea id="chat-input" rows="2" placeholder="Ask about pricing, services, corridors…"></textarea>',
    '    <button type="button" class="chat-send" id="chat-send">Send</button>',
    '  </div>',
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

  function openPanel() {
    panel.classList.add('is-open');
    fab.setAttribute('aria-expanded', 'true');
    if (!msgs.dataset.welcomed) {
      addBubble('bot', 'I can help with UMRT pricing, services, service corridors, credentials, and booking. Share your details below — Prefer Text is selected by default — then ask anything. Or call (616) 606-5277.');
      msgs.dataset.welcomed = '1';
    }
  }
  function closePanel() {
    panel.classList.remove('is-open');
    fab.setAttribute('aria-expanded', 'false');
  }
  fab.addEventListener('click', function () {
    if (panel.classList.contains('is-open')) closePanel(); else openPanel();
  });
  closeBtn.addEventListener('click', closePanel);

  function addBubble(role, text) {
    var d = document.createElement('div');
    d.className = 'chat-bubble ' + role;
    d.innerHTML = text.replace(/\n/g, '<br>');
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
  }

  leadGo.addEventListener('click', function () {
    var name = document.getElementById('cl-name').value.trim();
    var phone = document.getElementById('cl-phone').value.trim();
    var city = document.getElementById('cl-city').value.trim();
    var prefer = document.getElementById('cl-prefer').value;
    var issue = document.getElementById('cl-issue').value.trim();
    if (!name || !phone || !city || !prefer || !issue) {
      addBubble('bot', 'Please fill Name, Phone, City/ZIP, Prefer, and Issue — then we can chat. Or call <a href="tel:+16166065277">(616) 606-5277</a>.');
      return;
    }
    leadData = { name: name, phone: phone, city_zip: city, prefer: prefer, issue: issue };
    lead.hidden = true;
    compose.hidden = false;
    addBubble('user', 'Lead: ' + name + ' · ' + city + ' · Prefer ' + prefer + ' · ' + issue);
    addBubble('bot', 'Thanks, ' + name.split(' ')[0] + '. What would you like to know?');
    history.push({ role: 'user', content: 'Lead capture: ' + JSON.stringify(leadData) });
    input.focus();
  });

  async function sendMessage() {
    var text = (input.value || '').trim();
    if (!text || !leadData) return;
    input.value = '';
    addBubble('user', text);
    history.push({ role: 'user', content: text });
    sendBtn.disabled = true;
    try {
      var res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, lead: leadData })
      });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok || !data.reply) {
        throw new Error(data.error || 'fail');
      }
      addBubble('bot', data.reply);
      history.push({ role: 'assistant', content: data.reply });
    } catch (e) {
      addBubble('bot', 'Chat is briefly unavailable. Call or text <a href="tel:+16166065277">(616) 606-5277</a> — Matt answers. Or use <a href="/book-service/">Book a Service</a>.');
    } finally {
      sendBtn.disabled = false;
    }
  }
  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
})();
