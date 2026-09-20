/**
 * Forum thread body display.
 *
 * Thread SSR escapes HTML, so raw URLs stay plain text unless we autolink
 * after escape. Only custom-domain https:// URLs (unitedmobilerv.com /
 * square.site) become <a> tags — never pages.dev.
 */

import { TROUBLESHOOTING_INDEX_HREF } from './forum-growth.js';

export { TROUBLESHOOTING_INDEX_HREF };

export function escForumText(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
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
