import { getProviderConfig } from '../../../_lib/oauth.js';
import { createCentralSessionCookie, randomId } from '../../../_lib/session.js';
import { createSsoCookie } from '../../../_lib/sso.js';

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
    return { id: existing.id, banned: false, centralUserId: existing.central_user_id || null };
  }

  const id = randomId();
  await db
    .prepare(
      'INSERT INTO users (id, provider, provider_id, email, display_name, avatar_url, tou_accepted_at, tou_version) VALUES (?, ?, ?, ?, ?, ?, datetime(\'now\'), ?)'
    )
    .bind(id, provider, mapped.provider_id, mapped.email, mapped.display_name, mapped.avatar_url, '1.0')
    .run();
  return { id, banned: false, centralUserId: null };
}

// Stage 3 of the auth-unification migration (2026-09-15). Upserts the
// CENTRAL identity (PORTAL_DB.users, already bound here) by (provider,
// provider_sub) first -- exact match, matches how the portal's own
// upsertOAuthUser resolves identity -- falling back to email only if
// that's unset (shouldn't happen for a real Google profile, but never
// assume). Also links the forum's own local user row to this central
// id so future logins (and Stage 2's read-side correlation) find it
// directly instead of re-deriving it by email every time.
export async function upsertCentralUser(portalDb, forumDb, forumUserId, provider, mapped) {
  let central = await portalDb
    .prepare('SELECT id FROM users WHERE provider = ? AND provider_sub = ?')
    .bind(provider, mapped.provider_id)
    .first();

  if (!central && mapped.email) {
    central = await portalDb.prepare('SELECT id FROM users WHERE email = ?').bind(mapped.email).first();
  }

  if (central) {
    await portalDb
      .prepare('UPDATE users SET name = ?, picture = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .bind(mapped.display_name, mapped.avatar_url, central.id)
      .run();
  } else {
    const id = randomId();
    await portalDb
      .prepare(
        'INSERT INTO users (id, email, name, picture, provider, provider_sub) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .bind(id, mapped.email || null, mapped.display_name, mapped.avatar_url, provider, mapped.provider_id)
      .run();
    central = { id };
  }

  await forumDb.prepare('UPDATE users SET central_user_id = ? WHERE id = ?').bind(central.id, forumUserId).run();
  return central.id;
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

    // Stage 3: link/create the central identity and issue a central,
    // Domain-wide session -- falls back to leaving the user logged out
    // (not to the old per-host cookie) if PORTAL_DB isn't reachable,
    // since silently issuing a host-only session here would just
    // recreate the fragmentation this migration exists to fix.
    if (!env.PORTAL_DB || !env.CENTRAL_SESSION_SECRET) {
      return new Response('Central identity store is not configured yet.', { status: 503 });
    }
    const centralUserId = await upsertCentralUser(env.PORTAL_DB, env.DB, user.id, provider, mapped);
    const cookie = await createCentralSessionCookie(centralUserId, env);

    const headers = new Headers({ Location: '/forum/' });
    headers.append('Set-Cookie', cookie);
    headers.append('Set-Cookie', 'umrt_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');

    // Cross-subdomain SSO recognition cookie, additive -- only meaningful
    // for Google (the only provider forum supports; provider_id is Google's
    // stable `sub`, shared identity space with portal/docs). Never blocks
    // login if the shared secret isn't configured yet.
    if (provider === 'google' && env.SSO_SHARED_SECRET) {
      const ssoCookie = await createSsoCookie(
        {
          sub: mapped.provider_id,
          email: mapped.email,
          name: mapped.display_name,
          avatar: mapped.avatar_url,
          provider: 'google',
        },
        env.SSO_SHARED_SECRET
      );
      headers.append('Set-Cookie', ssoCookie);
    }

    return new Response(null, { status: 302, headers });
  } catch (err) {
    return new Response('Login failed: unexpected error. Please try again.', { status: 500 });
  }
}
