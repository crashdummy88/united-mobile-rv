/**
 * Email alert to Matt on new forum activity, via Web3Forms (same free
 * account already used by /api/book — reuses Pages env PUBLIC_WEB3FORMS_KEY,
 * no new secrets/billing). Fails silently — never blocks a post.
 */
export async function notifyForumActivity(env, { subject, message }) {
  const key = (env.PUBLIC_WEB3FORMS_KEY || env.WEB3FORMS_ACCESS_KEY || '').trim();
  if (!key || key === 'PUBLIC_WEB3FORMS_KEY' || key.includes('REPLACE')) return;
  try {
    const form = new FormData();
    form.append('access_key', key);
    form.append('subject', subject);
    form.append('message', message);
    form.append('from_name', 'UMRT Forum Bot');
    await fetch('https://api.web3forms.com/submit', { method: 'POST', body: form });
  } catch {
    // best-effort only
  }
}
