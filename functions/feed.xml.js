function esc(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export async function onRequestGet(context) {
  const { env } = context;
  if (!env.DB) return new Response('Feed not configured', { status: 503 });

  const { results } = await env.DB.prepare(
    `SELECT t.id, t.title, t.body, t.category, t.created_at, u.display_name AS author
     FROM threads t JOIN users u ON u.id = t.author_id
     WHERE t.hidden = 0 ORDER BY t.created_at DESC LIMIT 20`
  ).all();

  const items = (results || []).map((t) => {
    const link = `https://united-mobile-rv.pages.dev/forum/t/${t.id}`;
    const snippet = String(t.body || '').slice(0, 300);
    return `    <item>
      <title>${esc(t.title)}</title>
      <link>${esc(link)}</link>
      <guid>${esc(link)}</guid>
      <pubDate>${new Date(t.created_at + 'Z').toUTCString()}</pubDate>
      <dc:creator>${esc(t.author)}</dc:creator>
      <category>${esc(t.category)}</category>
      <description>${esc(snippet)}…</description>
    </item>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>United Mobile RV Community Forum</title>
    <link>https://united-mobile-rv.pages.dev/forum/</link>
    <atom:link href="https://united-mobile-rv.pages.dev/feed.xml" rel="self" type="application/rss+xml"/>
    <description>RV repair, off-grid power, connectivity, and route talk from a certified mobile RV tech.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=600' },
  });
}
