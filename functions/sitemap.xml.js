/**
 * GET /sitemap.xml — host-specific.
 *
 * shop.unitedmobilerv.com lists the shop hub (/shop/) and every active
 * /shop/p/:id page. Marketing paths on that host 301 to /shop/, so they
 * do not belong here.
 *
 * forum.unitedmobilerv.com lists /forum/, /forum-live/, and public
 * threads only. Shared marketing HTML on that host is canonicalized to
 * the WordPress apex, so those copies are not listed.
 *
 * Other hosts (apex, pages.dev) keep the mothership STATIC_PAGES inventory
 * plus the forum index and public threads.
 *
 * / versus /shop/ and / versus /forum/ stay internal rewrites
 * (functions/index.js HOST_HOME_REWRITES). This file does not add a
 * redirect or change those canonicals — that decision is still open.
 *
 * /book-service/thank-you/ is omitted on shop and forum. Apex still
 * lists it; those hosts noindex the path in functions/_middleware.js.
 */
import { STATIC_PAGES } from './_lib/static-pages.js';
import { publicThreadSql } from './_lib/forum-growth.js';

const SHOP_HOST = 'shop.unitedmobilerv.com';
const FORUM_HOST = 'forum.unitedmobilerv.com';

function xmlEscape(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function xmlResponse(urls, indexLastmod) {
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(
        (u) =>
          `  <url>\n    <loc>${xmlEscape(u.loc)}</loc>\n    <lastmod>${u.lastmod || indexLastmod}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
      )
      .join('\n') +
    `\n</urlset>\n`;

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=1800',
    },
  });
}

async function activeProducts(env) {
  if (!env.DB) return [];
  try {
    const { results } = await env.DB.prepare(
      `SELECT id, updated_at FROM products WHERE active = 1 ORDER BY id`
    ).all();
    return results || [];
  } catch {
    try {
      const { results } = await env.DB.prepare(
        `SELECT id FROM products WHERE active = 1 ORDER BY id`
      ).all();
      return results || [];
    } catch {
      return [];
    }
  }
}

async function publicThreads(env) {
  if (!env.DB) return { indexLastmod: null, threads: [] };
  let indexLastmod = null;
  try {
    const row = await env.DB.prepare(
      `SELECT MAX(updated_at) AS t FROM threads t WHERE ${publicThreadSql('t')}`
    ).first();
    if (row && row.t) indexLastmod = String(row.t).slice(0, 10);
  } catch {
    // fall back to today's date if D1 isn't reachable
  }

  try {
    const { results } = await env.DB.prepare(
      `SELECT id, updated_at, solved_at FROM threads t WHERE ${publicThreadSql('t')} ORDER BY t.updated_at DESC LIMIT 1000`
    ).all();
    return { indexLastmod, threads: results || [] };
  } catch {
    return { indexLastmod, threads: [] };
  }
}

function threadUrls(base, threads, indexLastmod) {
  return threads.map((t) => ({
    loc: `${base}/forum/t/${encodeURIComponent(t.id)}`,
    lastmod: String(t.updated_at || indexLastmod).slice(0, 10),
    changefreq: 'weekly',
    priority: t.solved_at ? '0.8' : '0.6',
  }));
}

async function shopUrls(env, base) {
  const urls = [{ loc: `${base}/shop/`, changefreq: 'daily', priority: '0.9' }];
  for (const product of await activeProducts(env)) {
    if (!product || !product.id) continue;
    urls.push({
      loc: `${base}/shop/p/${encodeURIComponent(product.id)}`,
      lastmod: product.updated_at ? String(product.updated_at).slice(0, 10) : undefined,
      changefreq: 'weekly',
      priority: '0.7',
    });
  }
  return urls;
}

function forumUrls(base, threads, lastmod) {
  return [
    { loc: `${base}/forum/`, changefreq: 'hourly', priority: '0.9' },
    { loc: `${base}/forum-live/`, changefreq: 'hourly', priority: '0.7' },
    ...threadUrls(base, threads, lastmod),
  ];
}

export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const base = url.origin;
  const host = url.hostname.toLowerCase();
  const indexLastmod = today();

  if (host === SHOP_HOST) {
    return xmlResponse(await shopUrls(env, base), indexLastmod);
  }
  if (host === FORUM_HOST) {
    const { indexLastmod: threadLastmod, threads } = await publicThreads(env);
    const lastmod = threadLastmod || indexLastmod;
    return xmlResponse(forumUrls(base, threads, lastmod), lastmod);
  }

  const urls = [
    ...STATIC_PAGES.map((p) => ({ loc: `${base}${p.loc}`, changefreq: p.changefreq, priority: p.priority })),
    { loc: `${base}/forum/`, changefreq: 'hourly', priority: '0.9' },
    { loc: `${base}/forum-live/`, changefreq: 'hourly', priority: '0.7' },
  ];
  const { indexLastmod: threadLastmod, threads } = await publicThreads(env);
  const lastmod = threadLastmod || indexLastmod;
  urls.push(...threadUrls(base, threads, lastmod));
  return xmlResponse(urls, lastmod);
}
