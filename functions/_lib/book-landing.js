/**
 * Customer page for book.unitedmobilerv.com only.
 * Shop, forum, and /book-service/ on other hosts do not use this module.
 *
 * Square handles booking on its own site. This page does not embed it.
 * Questions reuse the existing #book-form fields and POST /api/book
 * handler (js/site.js on other pages). site.js is not loaded here: it
 * restamps every chrome Book link to Square and strips Guides.
 */

import {
  CALL_HREF,
  TEXT_NOW_HREF,
  SQUARE_BOOK_URL,
  MAIN_HOME_HREF,
  MAIN_HOME_LABEL,
  MAIN_SERVICES_HREF,
  MAIN_SERVICES_LABEL,
  FORUM_JOIN_HREF,
} from './mesh-chrome.js';

export const BOOK_LANDING_ORIGIN = 'https://book.unitedmobilerv.com/';
export const GUIDES_HREF = 'https://unitedmobilerv.com/guide/';
export const REMOTE_HELP_HREF = 'https://unitedmobilerv.com/remote/';

export const BOOK_LANDING_NAV = [
  { key: 'home', href: MAIN_HOME_HREF, label: MAIN_HOME_LABEL },
  { key: 'services', href: MAIN_SERVICES_HREF, label: MAIN_SERVICES_LABEL },
  { key: 'guides', href: GUIDES_HREF, label: 'Guides' },
  { key: 'shop', href: 'https://shop.unitedmobilerv.com/', label: 'Shop' },
  { key: 'book', href: BOOK_LANDING_ORIGIN, label: 'Book' },
  { key: 'forum', href: FORUM_JOIN_HREF, label: 'Forum' },
  { key: 'software', href: 'https://software.unitedmobilerv.com/', label: 'Software' },
  { key: 'docs', href: 'https://docs.unitedmobilerv.com/', label: 'Docs' },
];

export const BOOK_LANDING_CSS = `
  .book-landing { background: #0C0C0C; }
  .book-landing h1, .book-landing h2 { color: #fff; }
  .book-landing .book-intro { padding: 28px 0 8px; }
  .book-landing .book-intro h1 {
    font-size: clamp(1.75rem, 3vw, 2.5rem);
    margin-bottom: 12px;
  }
  .book-landing .book-intro p { color: #D6D6D6; max-width: 68ch; }
  .book-landing .book-square-row { margin: 22px 0 8px; }
  .book-landing .book-square {
    min-height: 56px;
    padding: 0 36px;
    border-radius: 8px;
    font-size: 14px;
  }
  .book-landing .book-square:hover { background: #E0B04A; color: #1A1A1A; }
  .book-contact {
    width: min(100% - 48px, 760px);
    margin: 28px auto 64px;
    background: #1A1A1A;
    border: 1px solid rgba(224, 176, 74, 0.28);
    border-radius: 12px;
    padding: 28px 28px 32px;
  }
  .book-contact h2 { font-size: 1.35rem; margin-bottom: 8px; }
  .book-contact .book-contact-lead { color: #D6D6D6; margin-bottom: 8px; }
  .book-contact .book-hp {
    position: absolute;
    left: -9999px;
    height: 0;
    overflow: hidden;
  }
  @media (max-width: 1280px) {
    .book-landing .nav-links { gap: 16px; }
  }
  @media (max-width: 480px) {
    .book-contact { width: calc(100% - 16px); padding: 22px 16px 28px; border-radius: 10px; }
    .book-landing .book-square { width: 100%; }
  }
`;

export function bookLandingMainHtml() {
  return `<main id="main">
<section class="book-intro">
  <div class="wrap">
    <h1>Book mobile RV repair</h1>
    <p>On-site booking is Washington only. Outside Washington, remote help is at <a href="${REMOTE_HELP_HREF}">unitedmobilerv.com/remote/</a>. <a href="${CALL_HREF}">Call</a> or <a href="${TEXT_NOW_HREF}">text</a> (616) 606-5277.</p>
    <p class="book-square-row"><a class="btn btn-gold book-square" href="${SQUARE_BOOK_URL}" target="_blank" rel="noopener">Book on Square</a></p>
  </div>
</section>
<section class="book-contact" aria-labelledby="contact-heading">
  <h2 id="contact-heading">Questions</h2>
  <p class="book-contact-lead">Booking is on Square. Send a question here.</p>
  <form id="book-form" class="form-grid" novalidate>
    <div class="book-hp" aria-hidden="true">
      <label for="website">Website</label>
      <input id="website" name="website" tabindex="-1" autocomplete="off">
    </div>
    <div>
      <label for="name">Name <span class="req">*</span></label>
      <input id="name" name="name" required autocomplete="name" placeholder="Your name">
    </div>
    <div>
      <label for="phone">Phone <span class="req">*</span></label>
      <input id="phone" name="phone" type="tel" required autocomplete="tel" placeholder="Best number">
    </div>
    <div>
      <label for="email">Email <span class="req">*</span></label>
      <input id="email" name="email" type="email" required autocomplete="email" placeholder="you@email.com">
    </div>
    <div>
      <label for="location">Where is the RV? <span class="req">*</span></label>
      <input id="location" name="location" required autocomplete="postal-code" placeholder="City or ZIP">
    </div>
    <div class="full">
      <label for="rig">RV / issue <span class="req">*</span></label>
      <input id="rig" name="rig" required placeholder="Year, make, model, and what's going on">
    </div>
    <div class="full">
      <label for="issue">Message <span class="req">*</span></label>
      <textarea id="issue" name="issue" required placeholder="Your question"></textarea>
    </div>
    <div class="full btn-row">
      <button class="btn btn-gold" type="submit">Send</button>
    </div>
    <div id="form-status" class="form-status full" role="status" aria-live="polite"></div>
    <div id="book-turnstile" class="full"></div>
  </form>
</section>
</main>`;
}

/* Same Turnstile site key and POST /api/book → thank-you path as js/site.js.
   Location stays because that handler rejects a submission without it. */
export const BOOK_LANDING_NAV_JS = `(function(){
  var header=document.querySelector('.site-header');
  var toggle=document.querySelector('.nav-toggle');
  if(toggle&&header){
    toggle.addEventListener('click',function(){
      var open=header.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded',open?'true':'false');
    });
  }
  var SITEKEY='0x4AAAAAAEvvXidVbXxlagxj';
  function ensureScript(){
    if(document.getElementById('cf-turnstile-script'))return;
    var s=document.createElement('script');
    s.id='cf-turnstile-script';
    s.src='https://challenges.cloudflare.com/turnstile/v0/api.js';
    s.async=true;s.defer=true;
    document.head.appendChild(s);
  }
  function token(){
    ensureScript();
    return new Promise(function(resolve){
      var tries=0,done=false;
      function finish(t){if(done)return;done=true;resolve(t||'');}
      (function wait(){
        if(window.turnstile){
          var el=document.getElementById('book-turnstile');
          if(!el)return finish('');
          var widgetId=window.turnstile.render(el,{
            sitekey:SITEKEY,size:'normal',appearance:'interaction-only',execution:'execute',
            callback:finish,
            'error-callback':function(){finish('');},
            'timeout-callback':function(){finish('');}
          });
          window.turnstile.execute(widgetId);
          setTimeout(function(){finish('');},5000);
          return;
        }
        tries+=1;
        if(tries>40)return finish('');
        setTimeout(wait,100);
      })();
    });
  }
  var form=document.getElementById('book-form');
  if(!form)return;
  form.addEventListener('submit',async function(e){
    e.preventDefault();
    var status=document.getElementById('form-status');
    var data=new FormData(form);
    data.append('subject','UMRT contact question');
    status.className='form-status';
    status.textContent='Sending...';
    try{
      data.append('cf-turnstile-response',await token());
      var res=await fetch('/api/book',{method:'POST',body:data});
      var json=await res.json();
      if(json.success){window.location.href='/book-service/thank-you/';}
      else{
        status.className='form-status err';
        status.textContent=json.message||'Could not send. Please call (616) 606-5277.';
      }
    }catch(err){
      status.className='form-status err';
      status.textContent='Network error. Please call (616) 606-5277.';
    }
  });
})();`;
