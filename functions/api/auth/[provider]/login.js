import { getProviderConfig } from '../../../_lib/oauth.js';
import { randomId } from '../../../_lib/session.js';

export async function onRequestGet(context) {
  const { params, request, env } = context;
  const provider = params.provider;
  const url = new URL(request.url);
  const redirectUri = `${url.origin}/api/auth/${provider}/callback`;

  const cfg = getProviderConfig(provider, env, redirectUri);
  if (!cfg || !cfg.clientId) {
    return new Response(`Login provider "${provider}" is not configured yet.`, { status: 503 });
  }

  const state = randomId();
  const authUrl = new URL(cfg.authorizeUrl);
  authUrl.searchParams.set('client_id', cfg.clientId);
  authUrl.searchParams.set('redirect_uri', cfg.redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', cfg.scope);
  authUrl.searchParams.set('state', state);
  for (const [k, v] of Object.entries(cfg.extraAuthParams || {})) {
    authUrl.searchParams.set(k, v);
  }

  const headers = new Headers({ Location: authUrl.toString() });
  headers.append(
    'Set-Cookie',
    `umrt_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
  );
  return new Response(null, { status: 302, headers });
}
