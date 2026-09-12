/**
 * OAuth provider config — Google only. The forum intentionally supports a
 * single sign-in method; GitHub/Meta were scaffolded early on but never
 * configured with real client credentials and are removed here to keep
 * the auth surface minimal.
 */

export function getProviderConfig(provider, env, redirectUri) {
  if (provider !== 'google') return null;
  return {
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userinfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    scope: 'openid email profile',
    extraAuthParams: { access_type: 'online', prompt: 'select_account' },
    redirectUri,
    mapUser(profile) {
      return {
        provider_id: profile.sub,
        email: profile.email,
        display_name: profile.name || profile.email,
        avatar_url: profile.picture || null,
      };
    },
  };
}
