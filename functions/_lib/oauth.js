/**
 * OAuth provider config for Google, GitHub, and Meta (Facebook) login.
 * Each needs a client id/secret pair set as Pages env vars — see README_OAUTH.md.
 */

export function getProviderConfig(provider, env, redirectUri) {
  switch (provider) {
    case 'google':
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
    case 'github':
      return {
        authorizeUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        userinfoUrl: 'https://api.github.com/user',
        clientId: env.GITHUB_OAUTH_CLIENT_ID,
        clientSecret: env.GITHUB_OAUTH_CLIENT_SECRET,
        scope: 'read:user user:email',
        extraAuthParams: {},
        redirectUri,
        userAgent: 'umrt-forum',
        mapUser(profile) {
          return {
            provider_id: String(profile.id),
            email: profile.email || null,
            display_name: profile.name || profile.login,
            avatar_url: profile.avatar_url || null,
          };
        },
      };
    case 'meta':
      return {
        authorizeUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
        tokenUrl: 'https://graph.facebook.com/v19.0/oauth/access_token',
        userinfoUrl: 'https://graph.facebook.com/me?fields=id,name,email,picture',
        clientId: env.META_APP_ID,
        clientSecret: env.META_APP_SECRET,
        scope: 'email public_profile',
        extraAuthParams: {},
        redirectUri,
        mapUser(profile) {
          return {
            provider_id: profile.id,
            email: profile.email || null,
            display_name: profile.name,
            avatar_url: profile.picture?.data?.url || null,
          };
        },
      };
    default:
      return null;
  }
}
