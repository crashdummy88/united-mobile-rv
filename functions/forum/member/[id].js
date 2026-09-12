/**
 * GET /forum/member/:id — real, server-rendered member profile.
 * Only real data (join date, thread/reply/solved counts, recent threads) --
 * no invented points/badges/reputation, per the P4 no-fake-community rule.
 */
function esc(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export async function onRequestGet(context) {
  const { env, params, request } = context;
  const base = new URL(request.url).origin;
  const notFound = () => new Response(
    `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Member not found | United Mobile RV Forum</title><meta name="robots" content="noindex,follow"><link rel="stylesheet" href="/css/site.css"></head><body><main id="main"><section class="page-hero"><div class="wrap"><h1>Member not found</h1><p class="lead"><a href="/forum/">Back to the forum</a>.</p></div></section></main></body></html>`,
    { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );

  if (!env.DB) return notFound();

  const user = await env.DB.prepare(
    `SELECT id, display_name, avatar_url, created_at FROM users WHERE id = ? AND banned = 0`
  ).bind(params.id).first();
  if (!user) return notFound();

  const threadCount = await env.DB.prepare(`SELECT COUNT(*) AS n FROM threads WHERE author_id = ? AND hidden = 0`).bind(params.id).first();
  const replyCount = await env.DB.prepare(`SELECT COUNT(*) AS n FROM posts WHERE author_id = ? AND hidden = 0`).bind(params.id).first();
  const solvedCount = await env.DB.prepare(`SELECT COUNT(*) AS n FROM threads WHERE author_id = ? AND hidden = 0 AND solved_at IS NOT NULL`).bind(params.id).first();
  const { results: recentThreads } = await env.DB.prepare(
    `SELECT id, title, category, created_at, solved_at FROM threads WHERE author_id = ? AND hidden = 0 ORDER BY created_at DESC LIMIT 15`
  ).bind(params.id).all();

  const threadsHtml = recentThreads.length
    ? recentThreads.map((t) => `<div class="faq-item"><a class="text-link" href="${base}/forum/t/${esc(t.id)}"><strong>${esc(t.title)}</strong></a>${t.solved_at ? ' <span class="held-note" style="color:#4CBE6E">&#10003; Solved</span>' : ''}</div>`).join('\n')
    : '<p class="muted">No public threads yet.</p>';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(user.display_name)} | United Mobile RV Forum</title>
<meta name="description" content="${esc(user.display_name)}'s activity on the United Mobile RV community forum.">
<link rel="canonical" href="${base}/forum/member/${esc(user.id)}">
<meta name="robots" content="index,follow">
<link rel="icon" href="/favicon.png" type="image/png">
<link rel="stylesheet" href="/css/site.css">
</head>
<body>
<header class="site-header">
  <div class="wrap nav-bar">
    <a class="brand" href="/"><img class="brand-logo" src="/assets/brand/umrt-logo.webp" alt="United Mobile RV" width="40" height="40"><span class="brand-text">United Mobile <span>RV</span></span></a>
    <ul class="nav-links"><li><a href="/forum/">Back to Forum</a></li></ul>
  </div>
</header>
<main id="main">
<section class="page-hero">
  <div class="wrap">
    <h1>${esc(user.display_name)}</h1>
    <p class="lead">Member since ${esc(String(user.created_at).slice(0, 10))}</p>
    <div class="stats-bar" style="display:flex;gap:28px;margin-top:18px">
      <div><span style="font-size:1.6em;font-weight:800;color:#E8B84B">${threadCount.n || 0}</span><br><span class="muted" style="font-size:0.8em;text-transform:uppercase">Threads</span></div>
      <div><span style="font-size:1.6em;font-weight:800;color:#E8B84B">${replyCount.n || 0}</span><br><span class="muted" style="font-size:0.8em;text-transform:uppercase">Replies</span></div>
      <div><span style="font-size:1.6em;font-weight:800;color:#E8B84B">${solvedCount.n || 0}</span><br><span class="muted" style="font-size:0.8em;text-transform:uppercase">Solved</span></div>
    </div>
  </div>
</section>
<section class="band">
  <div class="wrap wrap-narrow">
    <h2>Recent threads</h2>
    ${threadsHtml}
  </div>
</section>
</main>
</body>
</html>`;

  return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
}
