#!/usr/bin/env node
/**
 * Manual price-check checklist + search hints.
 *
 * Does NOT look up, scrape, or invent a price. Prints the standard fields
 * and where Matt should look. See SHOP-QUOTE-MODEL.md.
 *
 *   npm run price-check -- <sku|brand>
 *   node scripts/price-check.js <sku|brand>
 */

const LINE = ['amazon', 'artek', 'dometic', 'victron', 'peplink', 'weboost'];

const HINTS = {
  amazon: [
    'Search Amazon for the manufacturer part number you already have — do not guess an ASIN.',
    'If Amazon is the buy path, record the ASIN as sku_kind=amazon and supplier_id=amazon.',
    'Do not call Amazon PA-API to price this shop or Square.',
  ],
  artek: [
    'Log into the Artek dealer account. They have NO CSV and no bulk feed.',
    'Use the locked supply/demand grid. Do not scrape /account.',
    'Copy the grid number onto Matt\'s side by hand (retail_price / cost / a price_checks row).',
    'Family / "starting price" rows need a real model (Ah, wattage, MPPT amperage) before they are quotable.',
  ],
  dometic: [
    'No UMRT Dometic fulfillment account is confirmed. Do not publish from a street midpoint.',
    'When a real buy path exists, check that source and set supplier_id — not before.',
  ],
  victron: [
    'Current shop Victron SKUs are sourced via Artek. Check the Artek grid first.',
    'SmartSolar / GX Touch seed rows are starting-price families — pick the real Victron part number.',
    'Do not invent a Victron-direct dealer price.',
  ],
  peplink: [
    'Peplink does not publish direct retail on peplink.com. No UMRT account confirmed.',
    'Do not guess a reseller markup. Leave unpublished until a real dealer quote exists.',
  ],
  weboost: [
    'Two rows already have manufacturer SKUs: RV20, 471410. Use those — do not invent ASINs.',
    'No UMRT weBoost fulfillment account confirmed. Public weboost.com cites are not dealer cost.',
  ],
};

// Identity + gap notes only. No live or invented prices.
const CATALOG = [
  { id: 'artek-alpha2pro-200', sku: 'ARTEK-ALPHA2PRO-200', sku_kind: 'internal', brand: 'artek', supplier: 'artek', title: 'ALPHA 2 PRO 12V 200Ah LiFePO4 Battery', active: true, gap: 'Re-check Artek locked grid. Public cite is not dealer cost. cost NULL.' },
  { id: 'artek-epoch-eco-12v', sku: 'ARTEK-EPOCH-ECO-12V', sku_kind: 'internal', brand: 'epoch', supplier: 'artek', title: 'Epoch 12V Eco Series LiFePO4 Battery', active: true, gap: 'Starting-price family — pick a real capacity on the Artek grid.' },
  { id: 'artek-epoch-elite-v2', sku: 'ARTEK-EPOCH-ELITE-V2', sku_kind: 'internal', brand: 'epoch', supplier: 'artek', title: 'Epoch Elite V2 Series LiFePO4 Battery', active: true, gap: 'Starting-price family — pick a real capacity on the Artek grid.' },
  { id: 'artek-epoch-v2t', sku: 'ARTEK-EPOCH-V2T', sku_kind: 'internal', brand: 'epoch', supplier: 'artek', title: 'Epoch V2-T Series LiFePO4 Battery', active: true, gap: 'Starting-price family — pick a real capacity on the Artek grid.' },
  { id: 'artek-flex-210w', sku: 'ARTEK-FLEX-210W', sku_kind: 'internal', brand: 'artek', supplier: 'artek', title: 'Artek 210W Flexible Solar Panel', active: true, gap: 'Re-check Artek locked grid. Public cite is not dealer cost.' },
  { id: 'artek-flex-170w', sku: 'ARTEK-FLEX-170W', sku_kind: 'internal', brand: 'artek', supplier: 'artek', title: 'Artek 170W Slim Flexible Solar Panel', active: true, gap: 'Re-check Artek locked grid. Public cite is not dealer cost.' },
  { id: 'artek-ja440w-kit', sku: 'ARTEK-JA440W-KIT', sku_kind: 'internal', brand: 'artek', supplier: 'artek', title: '3-Panel Solar Kit for Premium Systems (JA 440W)', active: true, gap: 'Re-check Artek locked grid. Kit contents may move with the grid.' },
  { id: 'richsolar-mega-100w', sku: 'RICHSOLAR-MEGA-100W', sku_kind: 'internal', brand: 'rich-solar', supplier: 'artek', title: 'Rich Solar MEGA 12V 100W Monocrystalline Panel', active: true, gap: 'Artek-sourced. Re-check grid. Internal SKU is not a Rich Solar part number.' },
  { id: 'richsolar-mega-150w', sku: 'RICHSOLAR-MEGA-150W', sku_kind: 'internal', brand: 'rich-solar', supplier: 'artek', title: 'Rich Solar MEGA 12V 150W Monocrystalline Panel', active: true, gap: 'Artek-sourced. Re-check grid. Internal SKU is not a Rich Solar part number.' },
  { id: 'victron-smartsolar-mppt', sku: 'VICTRON-SMARTSOLAR-MPPT', sku_kind: 'internal', brand: 'victron', supplier: 'artek', title: 'Victron SmartSolar MPPT Charge Controller', active: true, gap: 'Starting-price family — pick amperage / real Victron SKU on the Artek grid.' },
  { id: 'victron-lynx-distributor', sku: 'VICTRON-LYNX-DISTRIBUTOR', sku_kind: 'internal', brand: 'victron', supplier: 'artek', title: 'Victron Energy Lynx Distributor', active: true, gap: 'Seed used a GBP conversion. Re-check Artek grid in USD. Internal SKU ≠ Victron part number.' },
  { id: 'victron-gxtouch50', sku: 'VICTRON-GXTOUCH50', sku_kind: 'internal', brand: 'victron', supplier: 'artek', title: 'Victron GX Touch 50 System Monitor', active: true, gap: 'Starting-price cite. Confirm the exact GX Touch SKU on the Artek grid.' },
  { id: 'maxxair-7500k', sku: 'MAXXAIR-7500K', sku_kind: 'internal', brand: 'maxxair', supplier: 'artek', title: 'Maxxair Fan 7500K', active: true, gap: 'Artek-sourced. Re-check grid.' },
  { id: 'dometic-rtx2000', sku: 'DOMETIC-RTX2000', sku_kind: 'internal', brand: 'dometic', supplier: null, title: 'Dometic RTX 2000 Head Unit (12V DC)', active: false, gap: 'Unpublished. No fulfillment account. Do not invent a Dometic or Artek price.' },
  { id: 'dometic-freshjet-48v', sku: 'DOMETIC-FRESHJET-48V', sku_kind: 'internal', brand: 'dometic', supplier: null, title: '48V FreshJet DC-Powered Rooftop A/C + Heat Pump', active: false, gap: 'Unpublished. No fulfillment account.' },
  { id: 'dometic-rtx-installkit', sku: 'DOMETIC-RTX-INSTALLKIT', sku_kind: 'internal', brand: 'dometic', supplier: null, title: 'Dometic RTX Premium Install Kit', active: false, gap: 'Unpublished. No fulfillment account.' },
  { id: 'dometic-rtx-wiringkit', sku: 'DOMETIC-RTX-WIRINGKIT', sku_kind: 'internal', brand: 'dometic', supplier: null, title: 'Dometic RTX 4AWG Wiring Kit (26 ft)', active: false, gap: 'Unpublished. No fulfillment account.' },
  { id: 'dometic-penguin2', sku: 'DOMETIC-PENGUIN2', sku_kind: 'internal', brand: 'dometic', supplier: null, title: 'Dometic Penguin II Rooftop A/C', active: false, gap: 'Unpublished. Seed was a street midpoint — not a quote.' },
  { id: 'dometic-smartstart', sku: 'DOMETIC-SMARTSTART', sku_kind: 'internal', brand: 'dometic', supplier: null, title: 'Dometic SmartStart Soft Starter', active: false, gap: 'Unpublished. Seed was a street midpoint — not a quote.' },
  { id: 'dometic-dm2672', sku: 'DOMETIC-DM2672', sku_kind: 'internal', brand: 'dometic', supplier: null, title: 'Dometic Americana II DM2672 (6 cu ft, 2-way)', active: false, gap: 'Unpublished. Street midpoint — not a quote.' },
  { id: 'dometic-crx80u', sku: 'DOMETIC-CRX80U', sku_kind: 'internal', brand: 'dometic', supplier: null, title: 'Dometic CRX 80U Fridge/Freezer', active: false, gap: 'Unpublished. No fulfillment account.' },
  { id: 'dometic-crx1080s', sku: 'DOMETIC-CRX1080S', sku_kind: 'internal', brand: 'dometic', supplier: null, title: 'Dometic CRX 1080S Stainless Steel (2.6 cu ft)', active: false, gap: 'Unpublished. No fulfillment account.' },
  { id: 'dometic-nrx130e', sku: 'DOMETIC-NRX130E', sku_kind: 'internal', brand: 'dometic', supplier: null, title: 'Dometic NRX 130E Compressor Refrigerator', active: false, gap: 'Unpublished. No fulfillment account.' },
  { id: 'dometic-coolmatic-cd30', sku: 'DOMETIC-COOLMATIC-CD30', sku_kind: 'internal', brand: 'dometic', supplier: null, title: 'Dometic CoolMatic CD 30 Drawer Refrigerator', active: false, gap: 'Unpublished. No fulfillment account.' },
  { id: 'dometic-cfx5-25', sku: 'DOMETIC-CFX5-25', sku_kind: 'internal', brand: 'dometic', supplier: null, title: 'Dometic CFX5 25 Electric Cooler (25L)', active: false, gap: 'Unpublished. Public cite is not a dealer cost.' },
  { id: 'dometic-cfx5-55im', sku: 'DOMETIC-CFX5-55IM', sku_kind: 'internal', brand: 'dometic', supplier: null, title: 'Dometic CFX5 55IM Electric Cooler (with Ice Maker)', active: false, gap: 'Unpublished. Public cite is not a dealer cost.' },
  { id: 'peplink-maxbr1pro5g', sku: 'PEPLINK-MAXBR1PRO5G', sku_kind: 'internal', brand: 'peplink', supplier: null, title: 'Peplink MAX BR1 Pro 5G Cellular Router', active: false, gap: 'Unpublished. One reseller cite only. Internal SKU ≠ Peplink ordering code.' },
  { id: 'weboost-rv20-drivereach2', sku: 'RV20', sku_kind: 'manufacturer', brand: 'weboost', supplier: null, title: 'weBoost Drive Reach RV II Cell Signal Booster', active: false, gap: 'Real manufacturer SKU RV20. Unpublished. Public weBoost cite is not dealer cost.' },
  { id: 'weboost-drivex-rv', sku: '471410', sku_kind: 'manufacturer', brand: 'weboost', supplier: null, title: 'weBoost Drive X RV Cell Signal Booster', active: false, gap: 'Real manufacturer SKU 471410. Unpublished. Public weBoost cite is not dealer cost.' },
  { id: 'precision-wakespeed-ws500', sku: 'PRECISION-WAKESPEED-WS500', sku_kind: 'internal', brand: 'wakespeed', supplier: null, title: 'Wakespeed WS500 Alternator Regulator', active: false, gap: 'No price on purpose. Do not invent one.' },
  { id: 'precision-arco-zeus', sku: 'PRECISION-ARCO-ZEUS', sku_kind: 'internal', brand: 'arco', supplier: null, title: 'ARCO Zeus Alternator Regulator', active: false, gap: 'No price on purpose. Do not invent one.' },
  { id: 'precision-24v-conversion', sku: 'PRECISION-24V-CONVERSION', sku_kind: 'internal', brand: 'victron', supplier: null, title: '24V/48V House Architecture Conversion', active: false, gap: 'Configured labor/design. No price on purpose.' },
  { id: 'precision-ruuvitag-cerbo', sku: 'PRECISION-RUUVITAG-CERBO', sku_kind: 'internal', brand: 'ruuvi', supplier: null, title: 'RuuviTag Wireless Sensors -> Cerbo GX', active: false, gap: 'No price on purpose. Do not invent one.' },
  { id: 'precision-starlink-mini-flatroof', sku: 'PRECISION-STARLINK-MINI-FLATROOF', sku_kind: 'internal', brand: 'starlink', supplier: null, title: 'Starlink Mini Flat-Roof DC Integration Kit', active: false, gap: 'No price on purpose. Mounting source still undecided.' },
];

function norm(value) {
  return String(value || '').trim().toLowerCase();
}

function printChecklist() {
  console.log('PRICE-CHECK STANDARD (manual — no auto-filled prices)');
  console.log('  SKU:');
  console.log('  Supplier:');
  console.log('  Date checked:');
  console.log('  Source URL/ref:');
  console.log('  UMRV list price:        (leave blank until you looked it up)');
  console.log('  Notes:');
  console.log('');
  console.log('Shop model: request info → Matt arranges payment → Matt orders shipment → upsell install/VRM.');
  console.log('Never invent a price. Never scrape a locked grid. Unknown stays blank.');
  console.log('');
}

function printHints(key) {
  const lines = HINTS[key];
  if (!lines) return;
  console.log(`Search hints (${key}):`);
  for (const line of lines) console.log(`  - ${line}`);
  console.log('');
}

function printRow(row) {
  console.log(`${row.id}`);
  console.log(`  title:      ${row.title}`);
  console.log(`  sku:        ${row.sku}  [${row.sku_kind}]`);
  console.log(`  brand:      ${row.brand}`);
  console.log(`  supplier:   ${row.supplier || '(none — no confirmed buy path)'}`);
  console.log(`  published:  ${row.active ? 'yes' : 'no'}`);
  console.log(`  gap:        ${row.gap}`);
  console.log('');
}

function main(argv) {
  const raw = argv.filter((a) => a !== '--' && !a.startsWith('--')).join(' ').trim();
  const q = norm(raw);

  printChecklist();

  if (!q) {
    console.log('Usage: npm run price-check -- <sku|brand>');
    console.log('Brands: ' + LINE.join(', '));
    console.log('Pass a catalog id, SKU, or brand to list matching rows and hints.');
    console.log('');
    console.log('Artek-sourced SKUs that still need a grid check:');
    for (const row of CATALOG.filter((r) => r.supplier === 'artek')) printRow(row);
    return;
  }

  if (LINE.includes(q)) {
    printHints(q);
    const rows = CATALOG.filter((r) => r.brand === q || r.supplier === q);
    if (!rows.length) {
      console.log(`No catalog rows tagged ${q} yet. Do not invent SKUs or prices.`);
      console.log('');
      return;
    }
    console.log(`Matching catalog rows (${rows.length}) — identity only, no prices:`);
    console.log('');
    for (const row of rows) printRow(row);
    return;
  }

  const rows = CATALOG.filter((r) => {
    return norm(r.id) === q || norm(r.sku) === q
      || norm(r.id).includes(q) || norm(r.sku).includes(q)
      || norm(r.title).includes(q) || norm(r.brand) === q;
  });

  if (!rows.length) {
    console.log(`No catalog match for "${raw}".`);
    console.log('Do not invent a SKU or a price. Add the product first (SHOP-QUOTE-MODEL.md), then check.');
    console.log('');
    printHints(LINE.find((b) => q.includes(b)) || '');
    return;
  }

  const hintKeys = new Set();
  for (const row of rows) {
    if (HINTS[row.brand]) hintKeys.add(row.brand);
    if (HINTS[row.supplier]) hintKeys.add(row.supplier);
  }
  for (const key of hintKeys) printHints(key);

  console.log(`Matching catalog rows (${rows.length}) — identity only, no prices:`);
  console.log('');
  for (const row of rows) printRow(row);
}

main(process.argv.slice(2));
