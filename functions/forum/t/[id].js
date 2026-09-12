/**
 * GET /forum/t/:id — real, server-rendered, permanently linkable thread page.
 * This is the P7 fix: forum content used to live only behind client-side
 * fetch()+innerHTML on /forum/ (real anchors were href="#"), so no thread
 * ever had a crawlable URL of its own. This function renders the actual
 * question + replies as real HTML with a real <title>/description/canonical,
 * then a small script hydrates it with sign-in-aware controls (reply, solve,
 * reopen, save, report) against the existing /api/threads and new
 * /api/forum/* endpoints. Hidden/not-found threads 404 and are not indexed.
 */
function esc(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderImages(imageKeysJson) {
  if (!imageKeysJson) return '';
  let keys;
  try { keys = JSON.parse(imageKeysJson); } catch { return ''; }
  if (!Array.isArray(keys) || !keys.length) return '';
  return '<div class="post-images">' + keys.map((k) => `<img src="/r2/${esc(k)}" alt="" loading="lazy" class="lightbox-img" tabindex="0" role="button" aria-label="View full-size photo">`).join('') + '</div>';
}

function catLabel(cat) {
  const map = {
    general: '💬 General', repair: '🔧 Repair & Diagnostics', power: '⚡ Off-Grid & Power',
    connectivity: '📡 Connectivity', route: '🗺️ Route & Service Areas', blog: '📝 Vlog & Updates',
  };
  return map[cat] || ('💬 ' + cat);
}

function notFoundPage(base) {
  const body = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Thread not found | United Mobile RV Forum</title>
<meta name="robots" content="noindex,follow">
<link rel="stylesheet" href="/css/site.css"></head>
<body><main id="main"><section class="page-hero"><div class="wrap">
<h1>Thread not found</h1><p class="lead">It may have been removed, or the link is off. <a href="${base}/forum/">Back to the forum</a>.</p>
</div></section></main></body></html>`;
  return new Response(body, { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export async function onRequestGet(context) {
  const { env, params, request } = context;
  const url = new URL(request.url);
  const base = url.origin;

  if (!env.DB) return notFoundPage(base);

  const thread = await env.DB.prepare(
    `SELECT t.id, t.title, t.body, t.category, t.created_at, t.updated_at, t.pinned, t.image_keys,
            t.solved_at, t.solved_by, t.reopened_at, t.accepted_reply_id, t.locked,
            u.id AS author_id, u.display_name AS author, u.avatar_url AS author_avatar
     FROM threads t JOIN users u ON u.id = t.author_id
     WHERE t.id = ? AND t.hidden = 0`
  ).bind(params.id).first();

  if (!thread) return notFoundPage(base);

  const { results: posts } = await env.DB.prepare(
    `SELECT p.id, p.body, p.created_at, p.image_keys,
            u.id AS author_id, u.display_name AS author, u.avatar_url AS author_avatar
     FROM posts p JOIN users u ON u.id = p.author_id
     WHERE p.thread_id = ? AND p.hidden = 0
     ORDER BY p.created_at ASC`
  ).bind(params.id).all();

  const canonical = `${base}/forum/t/${encodeURIComponent(thread.id)}`;
  const solved = !!thread.solved_at;
  const titleTag = `${solved ? '[Solved] ' : ''}${thread.title} | United Mobile RV Forum`;
  const descRaw = thread.body.replace(/\s+/g, ' ').trim();
  const description = (descRaw.length > 155 ? descRaw.slice(0, 152) + '…' : descRaw) || 'RV repair question and answers from the United Mobile RV community.';

  // Gold-standard forums (Discourse, Stack Overflow) float the accepted
  // answer to the top of the thread instead of leaving it buried in
  // chronological order -- do the same here.
  const orderedPosts = thread.accepted_reply_id
    ? [
        ...posts.filter((p) => p.id === thread.accepted_reply_id),
        ...posts.filter((p) => p.id !== thread.accepted_reply_id),
      ]
    : posts;

  const repliesHtml = orderedPosts.map((p) => {
    const isAccepted = thread.accepted_reply_id && p.id === thread.accepted_reply_id;
    return `<article class="faq-item" id="post-${esc(p.id)}" data-post-id="${esc(p.id)}">
      ${isAccepted ? '<p class="held-note" style="color:#2e9e4f;font-weight:700;margin:0 0 6px">&#10003; Accepted answer</p>' : ''}
      <p class="muted mb-0" style="font-size:13px"><a class="text-link" href="${base}/forum/member/${esc(p.author_id)}">${esc(p.author)}</a> &middot; <time datetime="${esc(p.created_at)}">${esc(p.created_at)}</time></p>
      <p>${esc(p.body).replace(/\n/g, '<br>')}</p>
      ${renderImages(p.image_keys)}
      <button type="button" class="btn btn-ghost btn-sm mark-solution-btn" data-reply-id="${esc(p.id)}" style="display:none;margin-top:8px">Mark as solution</button>
    </article>`;
  }).join('\n');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'QAPage',
    mainEntity: {
      '@type': 'Question',
      name: thread.title,
      text: descRaw,
      answerCount: posts.length,
      dateCreated: thread.created_at,
      author: { '@type': 'Person', name: thread.author },
      ...(solved && thread.accepted_reply_id
        ? {
            acceptedAnswer: (() => {
              const accepted = posts.find((p) => p.id === thread.accepted_reply_id);
              return accepted
                ? { '@type': 'Answer', text: accepted.body, dateCreated: accepted.created_at, author: { '@type': 'Person', name: accepted.author } }
                : undefined;
            })(),
          }
        : {}),
      suggestedAnswer: posts
        .filter((p) => p.id !== thread.accepted_reply_id)
        .slice(0, 20)
        .map((p) => ({ '@type': 'Answer', text: p.body, dateCreated: p.created_at, author: { '@type': 'Person', name: p.author } })),
    },
  };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titleTag)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
<meta name="robots" content="index,follow">
<meta name="theme-color" content="#1A1A1A">
<link rel="icon" href="/favicon.png" type="image/png">
<link rel="stylesheet" href="/css/site.css">
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
<style>
  .thread-badges{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}
  .badge{display:inline-flex;align-items:center;gap:6px;font-size:0.8em;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;padding:5px 12px;border-radius:999px}
  .badge-solved{background:rgba(46,158,79,0.16);color:#4CBE6E;border:1px solid rgba(46,158,79,0.4)}
  .badge-locked{background:rgba(201,151,44,0.12);color:#C9972C;border:1px solid rgba(201,151,44,0.35)}
  .badge-cat{background:rgba(255,255,255,0.04);color:#E8B84B;border:1px solid rgba(201,151,44,0.3)}
  .thread-actions{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0}
  textarea.forum-input,input.forum-input{width:100%;padding:14px 16px;border-radius:10px;border:1px solid #333;background:#111;color:#f2f2f2;font-family:inherit;font-size:1.05em;line-height:1.5;margin-bottom:10px}
  .held-note{color:#C9972C;font-size:0.85em}
  .post-images{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-top:10px;max-width:520px}
  .post-images img{width:100%;height:140px;object-fit:cover;border-radius:8px;border:1px solid #333;cursor:zoom-in}
  #lightbox-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;align-items:center;justify-content:center;padding:20px}
  #lightbox-overlay.is-open{display:flex}
  #lightbox-overlay img{max-width:100%;max-height:100%;border-radius:6px}
  #lightbox-close{position:absolute;top:16px;right:20px;background:none;border:none;color:#fff;font-size:2em;line-height:1;cursor:pointer;padding:6px 10px}
  .diag-prompt{background:linear-gradient(160deg, rgba(201,151,44,0.08) 0%, rgba(201,151,44,0.02) 100%);border:1px solid rgba(201,151,44,0.25);border-radius:14px;padding:16px 18px;margin:14px 0;font-size:0.92em}
  .diag-prompt ul{margin:8px 0 0;padding-left:20px}
  .btn-sm{padding:6px 12px;font-size:0.85em}
</style>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap nav-bar">
    <a class="brand" href="/"><img class="brand-logo" src="/assets/brand/umrt-logo.webp" alt="United Mobile RV" width="40" height="40"><span class="brand-text">United Mobile <span>RV</span></span></a>
    <button class="nav-toggle" type="button" aria-label="Menu" aria-expanded="false">☰</button>
    <ul class="nav-links">
      <li><a href="/">Home</a></li>
      <li><a href="/service/">Services</a></li>
      <li><a href="/pricing/">Pricing</a></li>
      <li><a href="/guide/">Guides</a></li>
      <li><a href="/service-areas/">Areas</a></li>
      <li><a href="/forum/" aria-current="page">Forum</a></li>
      <li><a href="/about/">About</a></li>
    </ul>
    <div class="nav-cta">
      <a class="nav-phone" href="tel:+16166065277">Prefer Text (616) 606-5277</a>
      <a class="btn btn-ghost" href="/book-service/">Book</a>
    </div>
  </div>
</header>
<main id="main">
<section class="page-hero">
  <div class="wrap">
    <p class="muted mb-0"><a class="text-link" href="/forum/">&larr; All threads</a></p>
    <h1>${esc(thread.title)}</h1>
    <div class="thread-badges">
      <span class="badge badge-cat">${esc(catLabel(thread.category))}</span>
      ${solved ? '<span class="badge badge-solved">&#10003; Solved</span>' : ''}
      ${thread.locked ? '<span class="badge badge-locked">&#128274; Locked</span>' : ''}
    </div>
    <p class="muted" style="font-size:13px">by <a class="text-link" href="/forum/member/${esc(thread.author_id)}">${esc(thread.author)}</a> &middot; <time datetime="${esc(thread.created_at)}">${esc(thread.created_at)}</time></p>
  </div>
</section>
<section class="band">
  <div class="wrap wrap-narrow">
    <article class="faq-item" id="op">
      <p>${esc(thread.body).replace(/\n/g, '<br>')}</p>
      ${renderImages(thread.image_keys)}
    </article>

    <div class="thread-actions" id="thread-actions"><span class="muted" style="font-size:13px">Loading…</span></div>

    <h2 style="margin-top:28px">${posts.length} ${posts.length === 1 ? 'Reply' : 'Replies'}</h2>
    <div id="replies-list">${repliesHtml || '<p class="muted">No replies yet.</p>'}</div>

    <div id="reply-section" style="margin-top:24px">
      <h2>Reply</h2>
      <p class="muted" id="reply-locked-note" style="display:none">This thread is locked — no new replies.</p>
      <div id="signin-prompt" style="display:none"><p class="muted">Sign in on the <a href="/forum/">main forum page</a> to reply.</p></div>
      <form id="reply-form" style="display:none">
        <textarea class="forum-input" id="rf-body" rows="4" placeholder="Write a reply…" maxlength="8000"></textarea>
        <div class="cf-turnstile" id="rf-turnstile" data-sitekey="0x4AAAAAAEvvXidVbXxlagxj" style="margin:10px 0"></div>
        <div class="btn-row">
          <button type="submit" class="btn btn-gold" id="rf-submit-btn">Post Reply</button>
        </div>
        <p class="held-note" id="rf-status"></p>
      </form>
    </div>
  </div>
</section>
</main>
<footer class="site-footer">
  <div class="wrap footer-grid">
    <div>
      <div class="footer-brand">United Mobile RV LLC</div>
      <p class="mb-0">Active MT · WY · ID · WA corridor. Case-by-case beyond.</p>
      <p class="mt-6 mb-0"><a href="tel:+16166065277">(616) 606-5277</a><br>
      <a href="mailto:unitedrvnetwork@gmail.com">unitedrvnetwork@gmail.com</a></p>
    </div>
    <div>
      <div class="micro">Navigate</div>
      <a href="/service/">Services</a>
      <a href="/pricing/">Pricing</a>
      <a href="/book-service/">Book a Service</a>
      <a href="/guide/">Guides</a>
      <a href="/forum/">Forum</a>
      <a href="/about/">About</a>
      <a href="/privacy-policy/">Privacy</a>
      <a href="/terms-of-use/">Terms of Use</a>
    </div>
  </div>
</footer>
<div id="lightbox-overlay">
  <button type="button" id="lightbox-close" aria-label="Close">&times;</button>
  <img id="lightbox-img" src="" alt="">
</div>
<div class="mobile-bar" aria-label="Quick actions">
  <a class="btn btn-ghost" href="tel:+16166065277">Text / Call</a>
  <a class="btn btn-gold" href="/book-service/">Book Now</a>
</div>
<script src="/js/site.js" defer></script>
<script>
(function () {
  var THREAD_ID = ${JSON.stringify(thread.id)};
  var IS_SOLVED = ${JSON.stringify(solved)};
  var IS_LOCKED = ${JSON.stringify(!!thread.locked)};
  var AUTHOR_ID = ${JSON.stringify(thread.author_id)};

  function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}

  var me = null;
  var isMod = false;

  async function loadMe() {
    try {
      var res = await fetch('/api/me');
      var data = await res.json();
      me = data.user;
    } catch { me = null; }
    renderActions();
  }

  function renderActions() {
    var el = document.getElementById('thread-actions');
    var parts = [];
    var isAuthor = me && AUTHOR_ID && me.provider; // best-effort; solve/reopen enforce real ownership server-side regardless
    if (me) {
      parts.push('<button type="button" class="btn btn-ghost btn-sm" id="save-btn">Save thread</button>');
      parts.push('<button type="button" class="btn btn-ghost btn-sm" id="report-btn">Report</button>');
      if (IS_SOLVED) {
        parts.push('<button type="button" class="btn btn-ghost btn-sm" id="reopen-btn">Reopen</button>');
      } else {
        parts.push('<button type="button" class="btn btn-gold btn-sm" id="solve-btn">Mark solved</button>');
      }
    }
    el.innerHTML = parts.length ? parts.join(' ') : '';

    var saveBtn = document.getElementById('save-btn');
    if (saveBtn) saveBtn.addEventListener('click', async function () {
      saveBtn.disabled = true;
      var r = await fetch('/api/forum/threads/' + encodeURIComponent(THREAD_ID) + '/save', { method: 'POST' });
      var d = await r.json().catch(function(){return {};});
      saveBtn.textContent = d.saved ? 'Saved ✓' : 'Save thread';
    });

    var reportBtn = document.getElementById('report-btn');
    if (reportBtn) reportBtn.addEventListener('click', async function () {
      var reason = prompt('Why are you reporting this thread? (spam / abuse / misinformation / inappropriate / dangerous_advice / other)', 'other');
      if (reason === null) return;
      await fetch('/api/forum/threads/' + encodeURIComponent(THREAD_ID) + '/report', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: reason.trim() })
      });
      reportBtn.textContent = 'Reported';
      reportBtn.disabled = true;
    });

    var solveBtn = document.getElementById('solve-btn');
    if (solveBtn) solveBtn.addEventListener('click', async function () {
      solveBtn.disabled = true;
      var r = await fetch('/api/forum/threads/' + encodeURIComponent(THREAD_ID) + '/solve', { method: 'POST' });
      var d = await r.json().catch(function(){return {};});
      if (d.success) location.reload(); else { alert(d.error === 'forbidden' ? 'Only the original poster or a moderator can mark this solved.' : 'Could not mark solved.'); solveBtn.disabled = false; }
    });

    var reopenBtn = document.getElementById('reopen-btn');
    if (reopenBtn) reopenBtn.addEventListener('click', async function () {
      reopenBtn.disabled = true;
      var r = await fetch('/api/forum/threads/' + encodeURIComponent(THREAD_ID) + '/reopen', { method: 'POST' });
      var d = await r.json().catch(function(){return {};});
      if (d.success) location.reload(); else { alert('Could not reopen.'); reopenBtn.disabled = false; }
    });

    document.querySelectorAll('.mark-solution-btn').forEach(function (btn) {
      if (!me) return;
      btn.style.display = IS_SOLVED ? 'none' : '';
      btn.addEventListener('click', async function () {
        var r = await fetch('/api/forum/threads/' + encodeURIComponent(THREAD_ID) + '/solve', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ replyId: btn.dataset.replyId })
        });
        var d = await r.json().catch(function(){return {};});
        if (d.success) location.reload(); else alert(d.error === 'forbidden' ? 'Only the original poster or a moderator can accept an answer.' : 'Could not mark as solution.');
      });
    });

    var replyForm = document.getElementById('reply-form');
    var signinPrompt = document.getElementById('signin-prompt');
    var lockedNote = document.getElementById('reply-locked-note');
    if (IS_LOCKED) {
      lockedNote.style.display = '';
    } else if (me) {
      replyForm.style.display = '';
    } else {
      signinPrompt.style.display = '';
    }
  }

  var replyForm = document.getElementById('reply-form');
  replyForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    var body = document.getElementById('rf-body').value.trim();
    var status = document.getElementById('rf-status');
    var submitBtn = document.getElementById('rf-submit-btn');
    if (!body) return;
    submitBtn.disabled = true;
    status.textContent = '';
    var turnstileToken = window.turnstile ? window.turnstile.getResponse('rf-turnstile') : '';
    if (!turnstileToken) { status.textContent = 'Please complete the security check.'; submitBtn.disabled = false; return; }
    var res = await fetch('/api/threads/' + encodeURIComponent(THREAD_ID), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: body, turnstileToken: turnstileToken })
    });
    var data = await res.json().catch(function(){return {};});
    submitBtn.disabled = false;
    if (window.turnstile) { try { window.turnstile.reset('rf-turnstile'); } catch (e) {} }
    if (!data.success) { status.textContent = data.message || 'Could not post reply.'; return; }
    if (data.held_for_review) { status.textContent = data.message; }
    else { location.reload(); }
  });

  document.querySelectorAll('.lightbox-img').forEach(function (img) {
    function open() {
      var overlay = document.getElementById('lightbox-overlay');
      document.getElementById('lightbox-img').src = img.src;
      overlay.classList.add('is-open');
    }
    img.addEventListener('click', open);
    img.addEventListener('keypress', function (e) { if (e.key === 'Enter' || e.key === ' ') open(); });
  });
  var lightboxOverlay = document.getElementById('lightbox-overlay');
  document.getElementById('lightbox-close').addEventListener('click', function () { lightboxOverlay.classList.remove('is-open'); });
  lightboxOverlay.addEventListener('click', function (e) { if (e.target === lightboxOverlay) lightboxOverlay.classList.remove('is-open'); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') lightboxOverlay.classList.remove('is-open'); });

  loadMe();
})();
</script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60' },
  });
}
