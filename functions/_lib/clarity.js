/**
 * Microsoft Clarity (project yl6ovtkj2p) — site-wide head snippet.
 *
 * Shop / forum / book islands include this via mesh-chrome
 * (`clarityHeadSnippet()`). Pages middleware also injects it before
 * </head> on any other text/html response that does not already have it,
 * so static mothership pages pick it up without a homepage-only paste.
 * Async is part of the official loader (`t.async=1`); keep it that way.
 */

export const CLARITY_PROJECT_ID = 'yl6ovtkj2p';

export const CLARITY_HEAD_SNIPPET = `<script type="text/javascript">
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");
</script>`;

export function clarityHeadSnippet() {
  return CLARITY_HEAD_SNIPPET;
}

export function htmlHasClarity(html) {
  return typeof html === 'string'
    && html.includes(CLARITY_PROJECT_ID)
    && html.includes('clarity.ms/tag');
}

export function injectClarityOnce(html) {
  if (typeof html !== 'string' || htmlHasClarity(html)) return html;
  const close = html.match(/<\/head>/i);
  if (!close) return html;
  return html.slice(0, close.index) + CLARITY_HEAD_SNIPPET + '\n' + html.slice(close.index);
}
