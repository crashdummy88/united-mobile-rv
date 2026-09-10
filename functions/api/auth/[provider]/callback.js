import { getProviderConfig } from '../../../_lib/oauth.js';
import { createSessionCookie, randomId } from '../../../_lib/session.js';

async function upsertUser(db, provider, mapped) {
  const existing = await db
    .prepare('SELECT * FROM users WHERE provider = ? AND provider_id = ?')
    .bind(provider, mapped.provider_id)
    .first();

  if (existing) {
    if (existing.banned) return { banned: true };
    await db
      .prepare('UPDATE users SET display_name = ?, avatar_url = ?, email = ? WHERE id = ?')
      .bind(mapped.display_name, mapped.avatar_url, mapped.email, existing.id)
      .run();
    return { id: existing.id, banned: false };
  }

  const id = randomId();
  await db
    .prepare(
      'INSERT INTO users (id, provider, provider_id, email, display_name, avatar_url, tou_accepted_at, tou_version) VALUES (?, ?, ?, ?, ?, ?, datetime(\'now\'), ?)'
    )
    .bind(id, provider, mapped.provider_id, mapped.email, mapped.display_name, mapped.avatar_url, '1.0')
    .run();
  return { id, banned: false };
}

export async function onRequestGet(context) {
  const { params, request, env } = context;
  const provider = params.provider;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  const cookieHeader = request.headers.get('Cookie') || '';
  const stateMatch = cookieHeader.match(/umrt_oauth_state=([^;]+)/);
  if (!code || !state || !stateMatch || stateMatch[1] !== state) {
    return new Response('Login failed: invalid or expired state. Please try again.', { status: 400 });
  }

  const redirectUri = `${url.origin}/api/auth/${provider}/callback`;
  const cfg = getProviderConfig(provider, env, redirectUri);
  if (!cfg || !cfg.clientId || !cfg.clientSecret) {
    return new Response(`Login provider "${provider}" is not configured yet.`, { status: 503 });
  }
  if (!env.DB) {
    return new Response('Forum database is not configured yet.', { status: 503 });
  }
  if (!env.SESSION_SECRET) {
    return new Response('Session signing secret is not configured yet.', { status: 503 });
  }

  try {
    const tokenRes = await fetch(cfg.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        code,
        redirect_uri: cfg.redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      return new Response('Login failed: no access token returned by provider.', { status: 502 });
    }

    const profileRes = await fetch(cfg.userinfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': cfg.userAgent || 'umrt-forum',
      },
    });
    const profile = await profileRes.json();
    const mapped = cfg.mapUser(profile);

    if (!mapped.provider_id) {
      return new Response('Login failed: could not read profile from provider.', { status: 502 });
    }

    const user = await upsertUser(env.DB, provider, mapped);
    if (user.banned) {
      return new Response('This account has been banned from the forum.', { status: 403 });
    }

    const cookie = await createSessionCookie(
      { uid: user.id, name: mapped.display_name, avatar: mapped.avatar_url, provider },
      env.SESSION_SECRET
    );

    const headers = new Headers({ Location: '/forum/' });
    headers.append('Set-Cookie', cookie);
    headers.append('Set-Cookie', 'umrt_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
    return new Response(null, { status: 302, headers });
  } catch (err) {
    return new Response('Login failed: unexpected error. Please try again.', { status: 500 });
  }
}
