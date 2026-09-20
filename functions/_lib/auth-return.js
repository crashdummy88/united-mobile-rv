/**
 * Safe post-login landing for the shared Google OAuth flow.
 *
 * Shop and book do not get a third auth stack. They start the existing
 * forum Google login (`/api/auth/google/login`) and return here after
 * the existing callback sets umrt_session + umrt_sso.
 *
 * Open-redirect lock: only same-ecosystem shop / book / forum paths.
 */

const ALLOWED_HOSTS = new Set([
  'forum.unitedmobilerv.com',
  'shop.unitedmobilerv.com',
  'book.unitedmobilerv.com',
]);

const ALLOWED_RELATIVE = [
  /^\/$/,
  /^\/forum(\/|$)/,
  /^\/shop(\/|$)/,
  /^\/book-service(\/|$)/,
];

export const FORUM_GOOGLE_LOGIN = 'https://forum.unitedmobilerv.com/api/auth/google/login';
export const BOOK_INSTALL_HREF = 'https://book.unitedmobilerv.com/';
export const SHOP_HOME_HREF = 'https://shop.unitedmobilerv.com/shop/';
export const OAUTH_NEXT_COOKIE = 'umrt_oauth_next';

export function defaultAuthNext(request) {
  try {
    const host = new URL(request.url).hostname;
    if (host === 'shop.unitedmobilerv.com') return '/shop/';
    if (host === 'book.unitedmobilerv.com') return '/';
  } catch { /* fall through */ }
  return '/forum/';
}

export function sanitizeAuthNext(raw, request) {
  const fallback = defaultAuthNext(request);
  const value = String(raw || '').trim();
  if (!value || value.length > 400) return fallback;

  if (value.startsWith('/') && !value.startsWith('//')) {
    if (value.includes('\\') || value.includes('@')) return fallback;
    const path = value.split('?')[0].split('#')[0];
    if (ALLOWED_RELATIVE.some((re) => re.test(path))) return value;
    return fallback;
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    return fallback;
  }
  if (url.protocol !== 'https:') return fallback;
  if (!ALLOWED_HOSTS.has(url.hostname.toLowerCase())) return fallback;
  const path = url.pathname || '/';
  if (url.hostname === 'shop.unitedmobilerv.com' && !/^\/shop(\/|$)/.test(path) && path !== '/') {
    return fallback;
  }
  if (url.hostname === 'forum.unitedmobilerv.com' && !/^\/forum(\/|$)/.test(path) && path !== '/') {
    return fallback;
  }
  if (url.hostname === 'book.unitedmobilerv.com' && !/^\/$/.test(path) && !/^\/book-service(\/|$)/.test(path)) {
    return fallback;
  }
  return url.toString();
}

export function oauthNextCookie(next) {
  return `${OAUTH_NEXT_COOKIE}=${encodeURIComponent(next)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`;
}

export function clearOauthNextCookie() {
  return `${OAUTH_NEXT_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function readOauthNextCookie(request) {
  const header = (request && request.headers && request.headers.get('Cookie')) || '';
  const match = header.match(new RegExp(`${OAUTH_NEXT_COOKIE}=([^;]+)`));
  if (!match) return '';
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return '';
  }
}

export function googleLoginHref(nextAbsolute) {
  const next = String(nextAbsolute || '').trim();
  const q = next ? `?next=${encodeURIComponent(next)}` : '';
  return `${FORUM_GOOGLE_LOGIN}${q}`;
}
