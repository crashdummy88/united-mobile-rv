(function () {
  'use strict';
  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
  function catEmoji(cat) { return { general: '\uD83D\uDCAC', repair: '\uD83D\uDD27', power: '\u26A1', connectivity: '\uD83D\uDCE1', route: '\uD83D\uDDFA\uFE0F', blog: '\uD83D\uDCDD' }[cat] || '\uD83D\uDCAC'; }

  function injectAskTechCTA() {
    var hero = document.querySelector('.page-hero .wrap');
    if (!hero) return;
    var cta = document.createElement('div');
    cta.className = 'ask-tech-cta';
    cta.innerHTML = '<h3>\uD83D\uDD27 Got an RV problem right now?</h3>' +
      '<p>Post it in Repair &amp; Diagnostics and get a real answer from a certified tech — or text direct.</p>' +
      '<a class="btn" href="#new-thread-form">Ask the community</a> &nbsp; ' +
      '<a class="btn" href="sms:+16166065277">Text Matt</a>';
    hero.appendChild(cta);
  }

  function injectTrending() {
    var band = document.querySelector('.band .wrap.wrap-narrow');
    if (!band) return;
    var wrap = document.createElement('div');
    wrap.className = 'trending-wrap';
    wrap.innerHTML = '<div class="cat-nav-label">\uD83D\uDD25 Trending this week</div>' +
      '<div class="trending-list" id="trending-list"><span class="muted" style="font-size:13px">Loading\u2026</span></div>';
    band.insertBefore(wrap, band.firstChild);
    fetch('/api/forum/trending?limit=5').then(r => r.json()).then(data => {
      var el = document.getElementById('trending-list');
      if (!data.success || !data.threads.length) { el.innerHTML = '<span class="muted" style="font-size:13px">No trending threads yet \u2014 be the first!</span>'; return; }
      el.innerHTML = data.threads.map(function (t, i) {
        var flame = t.reply_count > 5 ? ' <span class="trending-flame">\uD83D\uDD25</span>' : '';
        return '<a class="trending-item" href="/forum/t/' + esc(t.id) + '">' +
          '<span class="trending-rank">' + (i + 1) + '</span>' +
          '<span class="trending-content"><span class="trending-title">' + esc(t.title) + flame + '</span>' +
          '<span class="trending-meta">' + catEmoji(t.category) + ' ' + (t.reply_count || 0) + ' replies' +
          (t.vote_count ? ' \u00b7 ' + t.vote_count + ' helpful' : '') +
          (t.solved_at ? ' \u00b7 \u2713 solved' : '') + '</span></span></a>';
      }).join('');
    }).catch(function () { document.getElementById('trending-list').innerHTML = ''; });
  }

  function injectOnlineBadge() {
    var statsBar = document.getElementById('stats-bar');
    if (!statsBar) return;
    fetch('/api/me').then(r => r.json()).then(function (data) {
      if (data.user) { fetch('/api/forum/online', { method: 'POST' }).catch(function () {}); }
    });
    fetch('/api/forum/online').then(r => r.json()).then(function (data) {
      if (!data.success || data.online === 0) return;
      var badge = document.createElement('span');
      badge.className = 'online-badge';
      badge.innerHTML = '<span class="online-dot"></span> ' + data.online + ' online now';
      statsBar.appendChild(badge);
      setInterval(function () {
        fetch('/api/forum/online').then(r => r.json()).then(function (d) {
          if (d.success) { badge.innerHTML = '<span class="online-dot"></span> ' + d.online + ' online now'; }
        }).catch(function () {});
      }, 60000);
    }).catch(function () {});
  }

  function addShareButtons(threadId, title) {
    var threadView = document.getElementById('thread-view-content');
    if (!threadView) return;
    var existing = document.querySelector('.share-row');
    if (existing) existing.remove();
    var url = 'https://united-mobile-rv.pages.dev/forum/t/' + threadId;
    var row = document.createElement('div');
    row.className = 'share-row';
    row.innerHTML = '<span class="share-label">Share:</span>' +
      '<a class="share-btn" href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url) + '" target="_blank" rel="noopener">\uD83D\uDCD8 Facebook</a>' +
      '<a class="share-btn" href="https://twitter.com/intent/tweet?text=' + encodeURIComponent(title) + '&url=' + encodeURIComponent(url) + '" target="_blank" rel="noopener">\uD835\uDD4F Twitter</a>' +
      '<a class="share-btn" href="https://www.reddit.com/submit?url=' + encodeURIComponent(url) + '&title=' + encodeURIComponent(title) + '" target="_blank" rel="noopener">\uD83D\uDD34 Reddit</a>' +
      '<button class="share-btn" id="copy-link-btn">\uD83D\uDD17 Copy link</button>';
    threadView.appendChild(row);
    document.getElementById('copy-link-btn').addEventListener('click', function () {
      navigator.clipboard.writeText(url).then(function () {
        this.textContent = '\u2713 Copied!';
        setTimeout(function () { document.getElementById('copy-link-btn').textContent = '\uD83D\uDD17 Copy link'; }, 2000);
      }.bind(this));
    });
  }

  function trackView(threadId) {
    if (!threadId) return;
    fetch('/api/forum/track-view', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ threadId: threadId }) }).catch(function () {});
  }

  var observer = new MutationObserver(function () {
    var threadView = document.getElementById('thread-view');
    if (!threadView || !threadView.classList.contains('is-open')) return;
    var content = document.getElementById('thread-view-content');
    if (!content || content.dataset.enhanced) return;
    content.dataset.enhanced = '1';
    var threadId = null;
    var match = window.location.hash.match(/forum\/t\/([^?&]+)/);
    if (match) threadId = match[1];
    if (threadId) { trackView(threadId); var h2 = content.querySelector('h2'); addShareButtons(threadId, h2 ? h2.textContent : ''); }
  });
  var threadViewEl = document.getElementById('thread-view');
  if (threadViewEl) { observer.observe(threadViewEl, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] }); }
  window.addEventListener('hashchange', function () {
    var match = window.location.hash.match(/forum\/t\/([^?&]+)/);
    if (match) { var threadId = match[1]; trackView(threadId); setTimeout(function () { var h2 = document.querySelector('#thread-view-content h2'); addShareButtons(threadId, h2 ? h2.textContent : ''); }, 500); }
  });

  function init() { injectAskTechCTA(); injectTrending(); injectOnlineBadge(); }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
