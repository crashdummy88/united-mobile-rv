/**
 * Forum thread body display (BUG-F2).
 *
 * Pinned index bodies were authored as plain text because the SSR thread
 * page escaped HTML. Autolink custom-domain https:// URLs after escape so
 * the Field Guide destination is a real <a>. Also rewrite the live D1 pin
 * if it still names the dead WP /troubleshoot/ hub (404) — locked target
 * is https://unitedmobilerv.com/guide/electrical-troubleshooting/
 */

export const ELECTRICAL_TS_GUIDE_URL = 'https://unitedmobilerv.com/guide/electrical-troubleshooting/';
export const PIN_TROUBLESHOOT_INDEX_ID = 'pin-troubleshoot-index';

export const PIN_TROUBLESHOOT_INDEX_BODY =
  'Before opening a new thread, check the Field Guide — Electrical troubleshooting (' +
  ELECTRICAL_TS_GUIDE_URL +
  '). If your symptom isn\'t covered there, or you\'ve already been through it and something\'s still off, post the details here: rig, symptom, what you\'ve already checked. If it turns out to need hands-on diagnosis, Book a Service (unitedmobilerv.com/book-service/) and we\'ll get a trip fee + diagnostic quoted upfront.';

export function escForumText(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

export function canonicalPinTroubleshootBody(id, body) {
  const text = String(body || '');
  if (id !== PIN_TROUBLESHOOT_INDEX_ID) return text;
  if (!/unitedmobilerv\.com\/troubleshoot\/?/.test(text)) return text;
  return PIN_TROUBLESHOOT_INDEX_BODY;
}

const CUSTOM_URL_RE =
  /https:\/\/(?:[a-z0-9-]+\.)?unitedmobilerv\.com\/[^\s<&]*|https:\/\/united-mobile-rv-llc\.square\.site\/[^\s<&]*/gi;

function linkifyEscapedUrls(escaped) {
  return escaped.replace(CUSTOM_URL_RE, (raw) => {
    if (/pages\.dev/i.test(raw)) return raw;
    const clean = raw.replace(/[).,;:]+$/g, '');
    const trailing = raw.slice(clean.length);
    const label = clean.replace(/^https:\/\//, '');
    return `<a class="text-link" href="${clean}" target="_blank" rel="noopener">${label}</a>${trailing}`;
  });
}

/** Escape + autolink custom-domain https:// URLs + newlines → <br>. */
export function renderForumBodyHtml(text) {
  const escaped = escForumText(text);
  return linkifyEscapedUrls(escaped).replace(/\n/g, '<br>');
}

export function renderThreadBodyHtml(id, body) {
  return renderForumBodyHtml(canonicalPinTroubleshootBody(id, body));
}
