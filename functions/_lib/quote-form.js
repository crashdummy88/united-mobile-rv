/**
 * Shop quote / request-info form -- the shop's unique ecommerce job.
 *
 * Customer configures a system and requests a quote. Matt checks price
 * by hand (never invent, Artek stays TBD). Payment is a Square invoice,
 * not a shop checkout. On-site install is a cross-link to book land.
 * Do not embed the booking suite UI here.
 */

import { BOOK_INSTALL_HREF, googleLoginHref } from './auth-return.js';

export { BOOK_INSTALL_HREF };

export const QUOTE_SUCCESS_MESSAGE =
  'Got it -- Matt reviews this by hand and follows up with a real quote. If the spec holds, you pay on a Square invoice (not a shop checkout). Hardware ships after that invoice. On-site install is scheduled separately.';

export function shopQuoteNavItem() {
  return `<li><a href="/shop/cart">Quote <span class="cart-badge-count" hidden></span></a></li>`;
}

export function quoteHowItWorksHtml() {
  return `<ol class="quote-steps">
    <li><strong>Configure the system.</strong> Pick the hardware your coach needs -- or describe the job if you are not sure which part.</li>
    <li><strong>Request a quote or request info.</strong> This is not a cart checkout. Nothing is charged on this page.</li>
    <li><strong>Matt quotes by hand.</strong> He checks current cost and availability. Artek and other dealer-cost items stay TBD until that check -- we do not invent a number.</li>
    <li><strong>Pay on a Square invoice.</strong> If the spec holds, you receive a Square invoice. That is the pay step. There is no shop checkout.</li>
    <li><strong>Hardware ships.</strong> After the invoice is paid, we ship. Want us on the coach? Schedule installation separately -- booking is its own land.</li>
  </ol>`;
}

export function quoteSsoBarHtml({ nextHref = '/shop/' } = {}) {
  const login = googleLoginHref(nextHref);
  return `<div class="umrt-sso-bar" id="umrt-sso-bar" data-next="${esc(nextHref)}" data-login="${esc(login)}">
    <p class="muted mb-0">Same Google sign-in as forum and book -- not a new shop account.</p>
  </div>`;
}

export function quoteSuccessHtml() {
  return `<div class="quote-success" id="quote-success" hidden>
    <h2>Request received</h2>
    <p>Matt reviews every shop request himself. We do not invent a price, and Artek stays TBD until he checks current dealer cost.</p>
    <p>If the spec holds, you will receive a <strong>Square invoice</strong> to pay. That invoice is the payment step -- there is no shop checkout and no card is charged here.</p>
    <p>Hardware ships after that Square invoice is paid.</p>
    <p>Need us to install it, commission Victron VRM, or meet the coach on the corridor? Scheduling a visit is a separate step on book land -- this page does not book a technician.</p>
    <div class="btn-row">
      <a class="btn btn-gold" href="${BOOK_INSTALL_HREF}" target="_blank" rel="noopener">Schedule installation</a>
      <a class="btn btn-ghost" href="/shop/">Back to parts</a>
    </div>
  </div>`;
}

/**
 * @param {'product'|'cart'|'system'} variant
 */
export function quoteFormHtml({ variant = 'system', productId = '', nextHref = '/shop/' } = {}) {
  const heading = {
    product: 'Request a quote for this item',
    cart: 'Request a quote for this system',
    system: 'Configure a system / request a quote',
  }[variant] || 'Request a quote';

  const lead = {
    product: 'Tell us how this part should work in the coach. Matt checks price and availability by hand, then sends a Square invoice if the spec holds -- not a shop checkout.',
    cart: 'One request covering every item in this quote list. Matt prices it by hand. Payment, if you proceed, is a Square invoice.',
    system: 'Describe the job even if you do not have a part number. We spec Victron, Artek, Dometic, Peplink, weBoost, and related hardware -- then quote what actually works together.',
  }[variant];

  const hiddenProduct = productId
    ? `<input type="hidden" id="qf-product-id" name="product_id" value="${esc(productId)}">`
    : '';

  return `<div class="shop-checkout-panel quote-request-panel">
    <h2>${heading}</h2>
    <p class="muted">${lead}</p>
    ${quoteSsoBarHtml({ nextHref })}
    ${quoteSuccessHtml()}
    <form id="quote-form" class="quote-form" data-variant="${esc(variant)}" novalidate>
      ${hiddenProduct}
      <input class="qf-honeypot" type="text" id="qf-website" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">

      <fieldset class="qf-fieldset">
        <legend class="qf-label">What should this system do?</legend>
        <label class="qf-check"><input type="checkbox" name="system_goal" value="house_power">House lithium / inverter power</label>
        <label class="qf-check"><input type="checkbox" name="system_goal" value="solar">Rooftop or portable solar</label>
        <label class="qf-check"><input type="checkbox" name="system_goal" value="climate">Climate / A/C</label>
        <label class="qf-check"><input type="checkbox" name="system_goal" value="connectivity">Connectivity (Peplink, weBoost, Starlink power)</label>
        <label class="qf-check"><input type="checkbox" name="system_goal" value="refrigeration">Refrigeration</label>
        <label class="qf-check"><input type="checkbox" name="system_goal" value="not_sure">Not sure -- request info and we will spec it</label>
      </fieldset>

      <fieldset class="qf-fieldset">
        <legend class="qf-label">How should we follow up?</legend>
        <label class="service-tier"><input type="radio" name="intent" value="quote" checked><span class="service-tier-text"><strong>Request a quote</strong><small>Matt checks current cost and sends a priced Square invoice if the spec holds.</small></span></label>
        <label class="service-tier"><input type="radio" name="intent" value="info"><span class="service-tier-text"><strong>Request info</strong><small>Spec and options first -- no invoice until you ask for one.</small></span></label>
      </fieldset>

      <fieldset class="qf-fieldset">
        <legend class="qf-label">How do you want the hardware handled?</legend>
        <label class="service-tier"><input type="radio" name="service_option" value="hardware_only" checked><span class="service-tier-text"><strong>Ship hardware</strong><small>We quote and ship. You install, or schedule us later.</small></span></label>
        <label class="service-tier"><input type="radio" name="service_option" value="hardware_plus_config"><span class="service-tier-text"><strong>Ship + remote configuration</strong><small>We configure Victron / Peplink / weBoost with you remotely.</small></span></label>
        <label class="service-tier"><input type="radio" name="service_option" value="hardware_plus_install"><span class="service-tier-text"><strong>Ship, then install on the coach</strong><small>Hardware quote first. On-site install is booked separately after the Square invoice -- this form does not schedule a visit.</small></span></label>
        <label class="service-tier"><input type="radio" name="service_option" value="full_design_install"><span class="service-tier-text"><strong>Full system design</strong><small>We spec the whole system around this coach. Install, if you want it, is scheduled on book land after the hardware quote.</small></span></label>
      </fieldset>

      <div class="qf-grid">
        <div class="qf-field"><label class="qf-label" for="qf-name">Your name</label><input class="forum-input" id="qf-name" name="name" autocomplete="name" placeholder="Jane Smith" maxlength="120" required></div>
        <div class="qf-field"><label class="qf-label" for="qf-phone">Phone</label><input class="forum-input" id="qf-phone" name="phone" autocomplete="tel" placeholder="(616) 606-5277" maxlength="40"></div>
        <div class="qf-field"><label class="qf-label" for="qf-email">Email</label><input class="forum-input" id="qf-email" name="email" type="email" autocomplete="email" placeholder="you@email.com" maxlength="160"></div>
        <div class="qf-field"><label class="qf-label" for="qf-location">City / State</label><input class="forum-input" id="qf-location" name="location" autocomplete="address-level2" placeholder="Missoula, MT" maxlength="160"></div>
      </div>
      <div class="qf-field"><label class="qf-label" for="qf-rig">RV year / make / model</label><input class="forum-input" id="qf-rig" name="rig" placeholder="2021 Forest River Cherokee" maxlength="160"></div>
      <div class="qf-field">
        <label class="qf-label" for="qf-use">How is this coach used?</label>
        <select class="forum-input" id="qf-use" name="use_case">
          <option value="">Select if you know</option>
          <option value="weekends">Weekends / vacation</option>
          <option value="seasonal">Seasonal</option>
          <option value="full_time">Full-time</option>
          <option value="work">Work / job site</option>
        </select>
      </div>
      <div class="qf-field"><label class="qf-label" for="qf-notes">Anything else we should know?</label><textarea class="forum-input" id="qf-notes" name="notes" rows="4" maxlength="1500" placeholder="Loads you need to run, existing Victron/Artek gear, roof space, 12V vs 48V, where the coach will be when hardware arrives."></textarea></div>
      <p class="muted quote-pay-note">Payment is a Square invoice after Matt's quote -- not a card form on this shop. After hardware ships, <a href="${BOOK_INSTALL_HREF}" target="_blank" rel="noopener">schedule installation</a> if you want us on site (VRM commissioning included when the system calls for it).</p>
      <div class="btn-row">
        <button type="submit" class="btn btn-gold" id="qf-submit" data-label-quote="Request quote" data-label-info="Request info">Request quote</button>
      </div>
      <p class="held-note" id="qf-status" role="status"></p>
      <div id="qf-turnstile"></div>
    </form>
  </div>`;
}

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
