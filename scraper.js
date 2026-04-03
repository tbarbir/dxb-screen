/**
 * DXB RE Screen — Fast Scraper v2
 * - Sale + Rental drops
 * - 43 Dubai + Abu Dhabi areas
 * - Tracks: first_seen, drop_count, days_on_market, price_history
 * - Generates market_stats.json
 * Target: under 20 minutes on GitHub Actions free tier.
 */

const axios   = require('axios');
const cheerio = require('cheerio');
const fs      = require('fs');
const path    = require('path');

const DATA_DIR      = path.join(__dirname, 'data');
const LISTINGS_FILE = path.join(DATA_DIR, 'listings.json');
const DROPS_FILE    = path.join(DATA_DIR, 'drops.json');
const STATS_FILE    = path.join(DATA_DIR, 'stats.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const AREAS = [
  // High drop areas (top tier)
  { name:'Dubai Hills Estate',              slug:'dubai-hills-estate',                    purpose:'sale' },
  { name:'Downtown Dubai',                  slug:'downtown-dubai',                        purpose:'sale' },
  { name:'Dubai Marina',                    slug:'dubai-marina',                          purpose:'sale' },
  { name:'Dubai Land',                      slug:'dubailand',                             purpose:'sale' },
  { name:'Mohammed Bin Rashid City',        slug:'mohammed-bin-rashid-city',              purpose:'sale' },
  { name:'Damac Lagoons',                   slug:'damac-lagoons',                         purpose:'sale' },
  { name:'The Valley',                      slug:'the-valley',                            purpose:'sale' },
  { name:'Dubai South',                     slug:'dubai-south',                           purpose:'sale' },
  { name:'The Springs',                     slug:'the-springs',                           purpose:'sale' },
  { name:'Business Bay',                    slug:'business-bay',                          purpose:'sale' },
  { name:'Dubai Harbour',                   slug:'dubai-harbour',                         purpose:'sale' },
  { name:'Jumeirah Beach Residence',        slug:'jumeirah-beach-residence-jbr-',         purpose:'sale' },
  { name:'Jumeirah Golf Estates',           slug:'jumeirah-golf-estates',                 purpose:'sale' },
  { name:'Dubai Creek Harbour',             slug:'dubai-creek-harbour',                   purpose:'sale' },
  { name:'Arabian Ranches 3',               slug:'arabian-ranches-3',                     purpose:'sale' },
  { name:'Arabian Ranches',                 slug:'arabian-ranches',                       purpose:'sale' },
  { name:'Dubai Sports City',               slug:'dubai-sports-city',                     purpose:'sale' },
  { name:'Palm Jumeirah',                   slug:'palm-jumeirah',                         purpose:'sale' },
  { name:'Mudon',                           slug:'mudon',                                 purpose:'sale' },
  { name:'City Walk',                       slug:'city-walk',                             purpose:'sale' },
  { name:'Jumeirah',                        slug:'jumeirah',                              purpose:'sale' },
  { name:'Umm Suqeim',                      slug:'umm-suqeim',                            purpose:'sale' },
  { name:'Jumeirah Islands',                slug:'jumeirah-islands',                      purpose:'sale' },
  { name:'DAMAC Hills',                     slug:'damac-hills',                           purpose:'sale' },
  { name:'DIFC',                            slug:'difc',                                  purpose:'sale' },
  { name:'Nad Al Sheba',                    slug:'nad-al-sheba',                          purpose:'sale' },
  { name:'Dubai Investment Park',           slug:'dubai-investment-park-dip-',            purpose:'sale' },
  { name:'Al Furjan',                       slug:'al-furjan',                             purpose:'sale' },
  { name:'Town Square',                     slug:'town-square',                           purpose:'sale' },
  { name:'Dubai Islands',                   slug:'dubai-islands',                         purpose:'sale' },
  { name:'Bluewaters Island',               slug:'bluewaters-island',                     purpose:'sale' },
  { name:'The Villa',                       slug:'the-villa',                             purpose:'sale' },
  { name:'Tilal Al Ghaf',                   slug:'tilal-al-ghaf',                         purpose:'sale' },
  { name:'Al Jaddaf',                       slug:'al-jaddaf',                             purpose:'sale' },
  { name:'The Views',                       slug:'the-views',                             purpose:'sale' },
  { name:'The Lakes',                       slug:'the-lakes',                             purpose:'sale' },
  { name:'The Oasis by Emaar',              slug:'the-oasis-by-emaar',                    purpose:'sale' },
  { name:'Al Barari',                       slug:'al-barari',                             purpose:'sale' },
  { name:'Jumeirah Park',                   slug:'jumeirah-park',                         purpose:'sale' },
  { name:'Jumeirah Lake Towers',            slug:'jumeirah-lake-towers-jlt-',             purpose:'sale' },
  { name:'Zabeel',                          slug:'zabeel',                                purpose:'sale' },
  { name:'Mina Rashid',                     slug:'mina-rashid',                           purpose:'sale' },
  { name:'Palm Jebel Ali',                  slug:'palm-jebel-ali',                        purpose:'sale' },
  { name:'Maritime City',                   slug:'maritime-city',                         purpose:'sale' },
  { name:'Jumeirah Village Circle',         slug:'jumeirah-village-circle-jvc-',          purpose:'sale' },
  { name:'Jumeirah Village Triangle',       slug:'jumeirah-village-triangle-jvt-',        purpose:'sale' },
  { name:'Arabian Ranches 2',               slug:'arabian-ranches-2',                     purpose:'sale' },
  { name:'Culture Village',                 slug:'culture-village',                       purpose:'sale' },
  { name:'Jebel Ali',                       slug:'jebel-ali',                             purpose:'sale' },
  { name:'Arjan',                           slug:'arjan',                                 purpose:'sale' },
  { name:'Expo City',                       slug:'expo-city-dubai',                       purpose:'sale' },
  { name:'The Meadows',                     slug:'the-meadows',                           purpose:'sale' },
  { name:'Falcon City of Wonders',          slug:'falcon-city-of-wonders',                purpose:'sale' },
  { name:'Motor City',                      slug:'motor-city',                            purpose:'sale' },
  { name:'Dubai Science Park',              slug:'dubai-science-park',                    purpose:'sale' },
  { name:'Meydan',                          slug:'meydan',                                purpose:'sale' },
  { name:'Al Barsha',                       slug:'al-barsha',                             purpose:'sale' },
  { name:'Emaar Beachfront',                slug:'emaar-beachfront',                      purpose:'sale' },
  { name:'Damac Hills 2',                   slug:'damac-hills-2',                         purpose:'sale' },
  // Abu Dhabi — Sale
  { name:'Saadiyat Island',                 slug:'saadiyat-island',                       purpose:'sale' },
  { name:'Al Reem Island',                  slug:'al-reem-island',                        purpose:'sale' },
  { name:'Yas Island',                      slug:'yas-island',                            purpose:'sale' },
  { name:'Al Raha Beach',                   slug:'al-raha-beach',                         purpose:'sale' },
  // Rental drops (key areas)
  { name:'Downtown Dubai',                  slug:'downtown-dubai',                        purpose:'rent' },
  { name:'Dubai Marina',                    slug:'dubai-marina',                          purpose:'rent' },
  { name:'Jumeirah Village Circle',         slug:'jumeirah-village-circle-jvc-',          purpose:'rent' },
  { name:'Business Bay',                    slug:'business-bay',                          purpose:'rent' },
  { name:'Dubai Hills Estate',              slug:'dubai-hills-estate',                    purpose:'rent' },
  { name:'The Springs',                     slug:'the-springs',                           purpose:'rent' },
  { name:'Jumeirah Beach Residence',        slug:'jumeirah-beach-residence-jbr-',         purpose:'rent' },
  { name:'Mohammed Bin Rashid City',        slug:'mohammed-bin-rashid-city',              purpose:'rent' },
  { name:'Arabian Ranches',                 slug:'arabian-ranches',                       purpose:'rent' },
  { name:'Palm Jumeirah',                   slug:'palm-jumeirah',                         purpose:'rent' },
];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml',
};

const sleep = ms => new Promise(r => setTimeout(r, ms));
const log   = msg => console.log(`[${new Date().toISOString()}] ${msg}`);

function parsePrice(str) {
  if (!str) return 0;
  str = str.replace(/AED|,|\s/g, '').trim();
  if (str.includes('M')) return Math.round(parseFloat(str) * 1_000_000);
  if (str.includes('K')) return Math.round(parseFloat(str) * 1_000);
  return parseInt(str) || 0;
}

async function fetchPage(url) {
  try {
    const resp = await axios.get(url, { headers: HEADERS, timeout: 15000 });
    return resp.data;
  } catch(e) {
    log(`  fetch error: ${e.message}`);
    return null;
  }
}

function parseListings(html, areaName, purpose) {
  const $ = cheerio.load(html);
  const listings = [];
  $('table tbody tr').each((i, row) => {
    const tds = $(row).find('td');
    if (tds.length < 8) return;
    const dropMatch = $(tds[0]).text().trim().match(/([\d.]+)%/);
    if (!dropMatch) return;
    const drop    = -parseFloat(dropMatch[1]);
    const link    = $(tds[1]).find('a').first();
    const idMatch = (link.attr('href') || '').match(/for-sale_(\d+)|for-rent_(\d+)/);
    if (!idMatch) return;
    const listingId = idMatch[1] || idMatch[2];
    const title     = link.text().trim().slice(0, 100);
    const meta      = $(tds[1]).text().replace(title, '').trim();
    const bedsMatch = meta.match(/(\d+)BR/);
    const beds      = /Studio/i.test(meta) ? 0 : (bedsMatch ? parseInt(bedsMatch[1]) : 1);
    const rt        = (meta + title).toLowerCase();
    const type      = rt.includes('villa') ? 'Villa' : rt.includes('townhouse') ? 'Townhouse' : 'Apartment';
    const area      = $(tds[2]).text().trim().replace(/\(JBR\)|\(JVC\)|\(JLT\)/g, '').trim() || areaName;
    const ask       = parsePrice($(tds[3]).text());
    let   was       = parsePrice($(tds[4]).text());
    if (was === 0) was = Math.round(ask / (1 + Math.abs(drop) / 100));
    const sqftText  = $(tds[5]).text().replace(/,/g, '').trim();
    const sqft      = /^\d+$/.test(sqftText) ? parseInt(sqftText) : null;
    const agency    = $(tds[7]).text().trim().slice(0, 30);
    if (!listingId || ask < 10000) return;
    listings.push({
      listing_id: listingId, area, type, beds, purpose,
      current_price: ask, previous_price: was, first_price: was,
      drop_from_prev: drop, drop_from_first: drop, saved_aed: was - ask,
      sqft, psf: sqft ? Math.round(ask / sqft) : null,
      title, agency,
      portal_url: `https://www.bayut.com/property/details-${listingId}.html`,
      detected_at: new Date().toISOString(),
    });
  });
  return listings;
}

async function scrapeSearchPage(seen, allNew, purpose) {
  // Only hit URLs we know return data
  const urls = [
    `https://panicselling.com/list/?purpose=for-${purpose}&sort=drop`,
    `https://panicselling.com/list/?purpose=for-${purpose}&sort=saved`,
    `https://panicselling.com/list/?purpose=for-${purpose}&sort=newest`,
  ];
  let total = 0;
  for (const url of urls) {
    const html = await fetchPage(url);
    if (!html) { await sleep(300); continue; }
    const listings = parseListings(html, '', purpose);
    let n = 0;
    listings.forEach(l => {
      const key = l.listing_id + '_' + l.purpose;
      if (!seen.has(key)) { seen.add(key); allNew.push(l); n++; total++; }
    });
    if (n > 0) log(`  +${n} new from: ${url.split('panicselling.com')[1]}`);
    await sleep(400);
  }
  log(`  Total new (${purpose}): ${total}`);
}

async function main() {
  const runAt  = new Date().toISOString();
  const allNew = [];
  const seen   = new Set();

  log('DXB RE Screen v2 — Scrape starting');
  log(`Areas: ${AREAS.length} (including rentals and Abu Dhabi)`);

  // TIER 1: Paginated search — gets ALL listings not just top drops
  log('\n-- SEARCH PAGES (all listings) --');
  await scrapeSearchPage(seen, allNew, 'sale');
  await sleep(800);
  await scrapeSearchPage(seen, allNew, 'rent');
  await sleep(800);

  log(`\nAfter search pages: ${allNew.length} listings`);

  // TIER 2: Area pages — catches anything search missed
  log('\n-- AREA PAGES (supplemental) --');
  // Main page
  const mainHtml = await fetchPage('https://panicselling.com/list/?purpose=for-sale&sort=drop');
  if (mainHtml) {
    const main = parseListings(mainHtml, '', 'sale');
    let n = 0;
    main.forEach(l => { if (!seen.has(l.listing_id+'_'+l.purpose)) { seen.add(l.listing_id+'_'+l.purpose); allNew.push(l); n++; }});
    log(`Main page: ${main.length} parsed, ${n} new`);
  }
  await sleep(500);

  // Each area
  for (let i = 0; i < AREAS.length; i++) {
    const area = AREAS[i];
    const url  = `https://panicselling.com/list/?area=${area.slug}&purpose=for-${area.purpose}&sort=drop`;
    log(`[${i+1}/${AREAS.length}] ${area.name} (${area.purpose})`);
    const html = await fetchPage(url);
    if (html) {
      const listings = parseListings(html, area.name, area.purpose);
      let n = 0;
      listings.forEach(l => {
        const key = l.listing_id + '_' + l.purpose;
        if (!seen.has(key)) { seen.add(key); l.area = area.name; allNew.push(l); n++; }
      });
      if (n > 0) log(`  ${listings.length} listings, ${n} new`);
    }
    await sleep(400);
  }

  log(`\nTotal unique: ${allNew.length}`);

  // Load previous snapshot
  let prevMap = {};
  if (fs.existsSync(LISTINGS_FILE)) {
    try {
      const prev = JSON.parse(fs.readFileSync(LISTINGS_FILE, 'utf8'));
      (Array.isArray(prev) ? prev : Object.values(prev)).forEach(l => {
        const key = (l.listing_id || l.id) + '_' + (l.purpose || 'sale');
        prevMap[key] = l;
      });
      log(`Previous: ${Object.keys(prevMap).length} listings`);
    } catch(e) { log('First run'); }
  }

  const isFirstRun = Object.keys(prevMap).length === 0;
  const drops = [], snapshot = [];
  const today = new Date().toISOString().split('T')[0];

  for (const l of allNew) {
    const key  = l.listing_id + '_' + l.purpose;
    const prev = prevMap[key];
    if (prev) {
      l.first_price      = prev.first_price || prev.current_price;
      l.first_seen       = prev.first_seen  || prev.detected_at;
      l.drop_count       = (prev.drop_count || 0) + (l.current_price < prev.current_price ? 1 : 0);
      l.drop_from_first  = +((l.current_price - l.first_price) / l.first_price * 100).toFixed(2);
      l.saved_aed        = l.first_price - l.current_price;
      // Days on market
      if (l.first_seen) {
        const diffMs = Date.now() - new Date(l.first_seen).getTime();
        l.days_on_market = Math.round(diffMs / 86400000);
      }
      // Price history (last 10 data points)
      const hist = prev.price_history || [{ price: l.first_price, date: l.first_seen || prev.detected_at }];
      if (l.current_price !== prev.current_price) {
        hist.push({ price: l.current_price, date: l.detected_at });
      }
      l.price_history = hist.slice(-10);
    } else {
      l.first_price     = l.current_price;
      l.first_seen      = l.detected_at;
      l.drop_from_first = 0;
      l.saved_aed       = 0;
      l.drop_count      = 0;
      l.days_on_market  = 0;
      l.price_history   = [{ price: l.current_price, date: l.detected_at }];
    }
    snapshot.push(l);
    if (l.drop_from_first < 0) drops.push(l);
  }

  drops.sort((a, b) => a.drop_from_first - b.drop_from_first);

  const stats = {
    runAt, isFirstRun,
    totalListings:   snapshot.length,
    totalDrops:      drops.length,
    dropsGte1:       drops.filter(d => d.drop_from_first <= -1).length,
    dropsGte5:       drops.filter(d => d.drop_from_first <= -5).length,
    dropsGte10:      drops.filter(d => d.drop_from_first <= -10).length,
    biggestDrop:     drops.length ? drops[0].drop_from_first : null,
    avgDrop:         drops.length ? +(drops.reduce((s,d) => s+d.drop_from_first,0)/drops.length).toFixed(1) : null,
    totalSaved:      drops.reduce((s,d) => s+(d.saved_aed||0), 0),
    areasWithDrops:  [...new Set(drops.map(d => d.area))].length,
    saleDrops:       drops.filter(d => d.purpose==='sale').length,
    rentDrops:       drops.filter(d => d.purpose==='rent').length,
    areasScraped:    AREAS.length + 1,
  };

  fs.writeFileSync(LISTINGS_FILE, JSON.stringify(snapshot, null, 2));
  fs.writeFileSync(DROPS_FILE,    JSON.stringify(drops,    null, 2));
  fs.writeFileSync(STATS_FILE,    JSON.stringify(stats,    null, 2));

  log('='.repeat(50));
  log('SCRAPE COMPLETE');
  log(`Listings: ${stats.totalListings} | Drops: ${stats.totalDrops} (sale: ${stats.saleDrops}, rent: ${stats.rentDrops})`);
  if (drops.length) {
    drops.slice(0,5).forEach((d,i) =>
      log(`  ${i+1}. ${d.drop_from_first.toFixed(1)}% ${d.area} ${d.beds}BR ${d.type} [${d.purpose}] AED${(d.current_price/1e6).toFixed(2)}M ${d.days_on_market?d.days_on_market+'d':''}`)
    );
  }
  if (isFirstRun) log('FIRST RUN — baseline set. Run again in 1h+ for drops.');
  log('='.repeat(50));
}

main().catch(e => { console.error(e); process.exit(1); });
