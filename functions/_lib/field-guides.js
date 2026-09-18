/**
 * Related WP guide URLs for shop *service* cards only.
 *
 * Authority is the live WordPress library at unitedmobilerv.com/guide/
 * (page 1724 + published children). Shop lockdown 301s relative /guide/
 * paths back to /shop/, so every href here is absolute on that host.
 *
 * Do not add these to MESH_LINKS / forum / book chrome. Product pages
 * must not render related-guide markup -- products and that chrome
 * are not for guides.
 *
 * Verified 2026-09-18 via wpcom pages.list (parent=1724, status=publish)
 * plus the hub slug `guide`. Do not add mothership-only slugs
 * (e.g. peplink-multi-wan-guide is not a WP page).
 */

export const FIELD_GUIDES_HREF = 'https://unitedmobilerv.com/guide/';

/** Published WP /guide/<slug>/ pages we are allowed to link. */
export const WP_FIELD_GUIDES = {
  '30-amp-vs-50-amp-guide': '30-amp vs 50-amp',
  'best-solar-panels-guide': 'Best solar panels',
  'brake-controller-wiring-guide': 'Brake controller wiring',
  'bms-explained-guide': 'BMS explained',
  'canbus-multiplex-systems-guide': 'CAN bus / multiplex',
  'coleman-mach-ac-guide': 'Coleman Mach A/C',
  'converter-inverter-charger-guide': 'Converter / inverter / charger',
  'dometic-appliance-guide': 'Dometic appliances',
  'electrical-troubleshooting': 'Electrical troubleshooting',
  'fresh-water-pump-guide': 'Fresh water pump',
  'generator-manufacturer-guide': 'Onan / Honda generators',
  'generator-troubleshooting': 'Generator troubleshooting',
  'lithium-agm-lead-acid-comparison': 'Lithium vs AGM vs lead-acid',
  'lithium-battery-buying-guide': 'Lithium battery buying guide',
  'norcold-refrigerator-guide': 'Norcold refrigerator',
  'off-grid-power-budget-guide': 'Off-grid power budget',
  'plumbing-troubleshooting': 'Plumbing troubleshooting',
  'ppi-guide': 'PPI guide',
  'roof-coating-guide': 'Roof coating',
  'roof-troubleshooting': 'Roof troubleshooting',
  'roof-vent-fan-install-guide': 'Roof vent / fan install',
  'rv-furnace-troubleshooting-guide': 'Furnace troubleshooting',
  'solar-battery-troubleshooting': 'Solar & battery troubleshooting',
  'solar-sizing-installation-guide': 'Solar sizing & installation',
  'spring-dewinterization-checklist': 'Spring de-winterization',
  'starlink-rv-guide': 'Starlink for RVs',
  'surge-protector-ems-guide': 'Surge protector / EMS',
  'victron-fault-code-guide': 'Victron fault codes',
  'water-heater-troubleshooting-guide': 'Water heater',
  'weboost-install-guide': 'weBoost install',
  'winterization-guide': 'Winterization',
};

const SERVICE_GUIDE_SLUGS = {
  'diagnostic-fee': ['electrical-troubleshooting'],
  consultation: ['off-grid-power-budget-guide', 'electrical-troubleshooting'],
  'ppi-travel-trailer': ['ppi-guide'],
  'ppi-fifth-wheel-motorhome': ['ppi-guide'],
  'winterization-travel-trailer': ['winterization-guide', 'spring-dewinterization-checklist'],
  'winterization-fifth-wheel-motorhome': ['winterization-guide', 'spring-dewinterization-checklist'],
  'solar-system-installation': ['solar-sizing-installation-guide', 'solar-battery-troubleshooting'],
  'victron-system-build': ['victron-fault-code-guide', 'solar-battery-troubleshooting'],
  'battery-system-installation': ['lithium-agm-lead-acid-comparison', 'solar-battery-troubleshooting'],
  'shore-power-inverter-setup': ['converter-inverter-charger-guide', 'electrical-troubleshooting'],
  'dc-electrical-repair': ['electrical-troubleshooting'],
  'ac-electrical-repair': ['electrical-troubleshooting', '30-amp-vs-50-amp-guide'],
  'trailer-wiring-electrical': ['brake-controller-wiring-guide', 'electrical-troubleshooting'],
  'appliance-diagnosis-repair': [
    'rv-furnace-troubleshooting-guide',
    'coleman-mach-ac-guide',
    'dometic-appliance-guide',
  ],
  'roof-seal-repair': ['roof-troubleshooting', 'roof-coating-guide'],
  'plumbing-repair': ['plumbing-troubleshooting', 'fresh-water-pump-guide'],
  'starlink-installation': ['starlink-rv-guide'],
  'cellular-booster-installation': ['weboost-install-guide'],
  'generator-maintenance': ['generator-troubleshooting', 'generator-manufacturer-guide'],
};

const PRODUCT_CATEGORY_GUIDE_SLUGS = {
  'rv-batteries': [
    'lithium-agm-lead-acid-comparison',
    'solar-battery-troubleshooting',
    'lithium-battery-buying-guide',
  ],
  'rv-solar': [
    'solar-sizing-installation-guide',
    'solar-battery-troubleshooting',
    'best-solar-panels-guide',
  ],
  'rv-power-protection': [
    'converter-inverter-charger-guide',
    'surge-protector-ems-guide',
    'electrical-troubleshooting',
  ],
  'rv-connectivity': ['starlink-rv-guide', 'weboost-install-guide'],
  'rv-climate': [
    'coleman-mach-ac-guide',
    'rv-furnace-troubleshooting-guide',
    'dometic-appliance-guide',
  ],
  'rv-refrigeration': ['dometic-appliance-guide', 'norcold-refrigerator-guide'],
  'rv-roof-ventilation': ['roof-vent-fan-install-guide', 'roof-troubleshooting'],
  'rv-precision-stack': ['canbus-multiplex-systems-guide', 'electrical-troubleshooting'],
};

const PRODUCT_MAKER_GUIDE_SLUGS = {
  victron: ['victron-fault-code-guide'],
  weboost: ['weboost-install-guide'],
  starlink: ['starlink-rv-guide'],
  dometic: ['dometic-appliance-guide'],
  norcold: ['norcold-refrigerator-guide'],
};

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export function wpGuideHref(slug) {
  const key = String(slug || '').trim();
  if (!WP_FIELD_GUIDES[key]) return '';
  return `${FIELD_GUIDES_HREF}${key}/`;
}

export function wpGuide(slug) {
  const key = String(slug || '').trim();
  const label = WP_FIELD_GUIDES[key];
  const href = wpGuideHref(key);
  return href && label ? { href, label, slug: key } : null;
}

function resolveSlugs(slugs, limit) {
  const seen = new Set();
  const out = [];
  for (const slug of slugs || []) {
    if (seen.has(slug)) continue;
    const guide = wpGuide(slug);
    if (!guide) continue;
    seen.add(slug);
    out.push(guide);
    if (limit && out.length >= limit) break;
  }
  return out;
}

export function relatedGuidesForService(service) {
  const id = String((service && service.id) || '').trim();
  return resolveSlugs(SERVICE_GUIDE_SLUGS[id] || [], 3);
}

export function relatedGuidesForProduct(product) {
  const slugs = [];
  const maker = String((product && product.manufacturer) || '').toLowerCase();
  for (const [key, extra] of Object.entries(PRODUCT_MAKER_GUIDE_SLUGS)) {
    if (maker.includes(key)) slugs.push(...extra);
  }
  const cat = product && product.category;
  if (cat && PRODUCT_CATEGORY_GUIDE_SLUGS[cat]) {
    slugs.push(...PRODUCT_CATEGORY_GUIDE_SLUGS[cat]);
  }
  return resolveSlugs(slugs, 3);
}

/**
 * Quiet single "Guide" text link for service cards. Empty string when
 * nothing maps. Not a button, not nav chrome, not "WP Field Guides".
 * Product pages must not call this -- Matt: products/chrome are not
 * for guides.
 */
function isWpGuideHref(href) {
  try {
    const u = new URL(String(href || ''));
    return u.origin + u.pathname === href
      && u.protocol === 'https:'
      && u.hostname === 'unitedmobilerv.com'
      && /^\/guide\/([a-z0-9-]+\/)?$/.test(u.pathname);
  } catch {
    return false;
  }
}

export function relatedGuidesMarkup(guides) {
  const items = (guides || []).filter((g) => g && g.label && isWpGuideHref(g.href));
  if (!items.length) return '';
  const first = items[0];
  return `<p class="shop-related-guides"><a href="${esc(first.href)}" target="_blank" rel="noopener">Guide</a></p>`;
}
