/**
 * DXB RE Screen — Fast Scraper
 * Uses axios + cheerio. No browser needed.
 * Target: under 15 minutes on GitHub Actions.
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
  { name: 'Downtown Dubai',           slug: 'downtown-dubai' },
  { name: 'Dubai Marina',             slug: 'dubai-marina' },
  { name: 'Palm Jumeirah',            slug: 'palm-jumeirah' },
  { name: 'Jumeirah Beach Residence', slug: 'jumeirah-beach-residence-jbr-' },
  { name: 'Business Bay',             slug: 'business-bay' },
  { name: 'Dubai Hills Estate',       slug: 'dubai-hills-estate' },
  { name: 'Jumeirah Village Circle',  slug: 'jumeirah-village-circle-jvc-' },
  { name: 'The Springs',              slug: 'the-springs' },
  { name: 'The Meadows',              slug: 'the-meadows' },
  { name: 'Arabian Ranches',          slug: 'arabian-ranches' },
  { name: 'Arabian Ranches 2',        slug: 'arabian-ranches-2' },
  { name: 'Damac Hills',              slug: 'damac-hills' },
  { name: 'Jumeirah Lake Towers',     slug: 'jumeirah-lake-towers-jlt-' },
  { name: 'Emaar Beachfront',         slug: 'emaar-beachfront' },
  { name: 'Dubai Creek Harbour',      slug: 'dubai-creek-harbour' },
  { name: 'DIFC',                     slug: 'difc' },
  { name: 'Meydan',                   slug: 'meydan' },
  { name: 'Al Barsha',                slug: 'al-barsha' },
  { name: 'Dubai South',              slug: 'dubai-south' },
  { name: 'Tilal Al Ghaf',            slug: 'tilal-al-ghaf' },
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
  if (str.includes('M')) return Math.round(parseFloat(str) * 1000000);
  if (str.includes('K')) return Math.round(parseFloat(str) * 1000);
  return parseInt(str) || 0;
}

async function fetchPage(url) {
  try {
    const resp = await axios.get(url, { headers: HEADERS, timeout: 15000 });
    return resp.data;
  } catch(e) {
    log('  fetch error: ' + e.message);
    return null;
  }
}

function parseListings(html, areaName) {
  const $ = cheerio.load(html);
  const listings = [];
  $('table tbody tr').each((i, row) => {
    const tds = $(row).find('td');
    if (tds.length < 8) return;
    const dropMatch = $(tds[0]).text().trim().match(/([\d.]+)%/);
    if (!dropMatch) return;
    const drop      = -parseFloat(dropMatch[1]);
    const link      = $(tds[1]).find('a').first();
    const idMatch   = (link.attr('href') || '').match(/for-sale_(\d+)/);
    if (!idMatch) return;
    const listingId = idMatch[1];
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
    if (!listingId || ask < 50000) return;
    listings.push({
      listing_id:      listingId,
      area:            area,
      type:            type,
      beds:            beds,
      current_price:   ask,
      previous_price:  was,
      first_price:     was,
      drop_from_prev:  drop,
      drop_from_first: drop,
      saved_aed:       was - ask,
      sqft:            sqft,
      psf:             sqft ? Math.round(ask / sqft) : null,
      title:           title,
      agency:          agency,
      portal_url:      'https://www.bayut.com/property/details-' + listingId + '.html',
      detected_at:     new Date().toISOString(),
    });
  });
  return listings;
}

async function main() {
  const runAt  = new Date().toISOString();
  const allNew = [];
  const seen   = new Set();

  log('DXB RE Screen — Fast Scrape starting');

  const mainHtml = await fetchPage('https://panicselling.com/list/?purpose=for-sale&sort=drop');
  if (mainHtml) {
    const main = parseListings(mainHtml, '');
    log('Main page: ' + main.length + ' listings');
    main.forEach(l => {
      if (!seen.has(l.listing_id)) {
        seen.add(l.listing_id);
        allNew.push(l);
      }
    });
  }
  await sleep(500);

  for (let i = 0; i < AREAS.length; i++) {
    const area = AREAS[i];
    const url  = 'https://panicselling.com/list/?area=' + area.slug + '&purpose=for-sale&sort=drop';
    log('[' + (i + 1) + '/' + AREAS.length + '] ' + area.name);
    const html = await fetchPage(url);
    if (html) {
      const listings = parseListings(html, area.name);
      let n = 0;
      listings.forEach(l => {
        if (!seen.has(l.listing_id)) {
          seen.add(l.listing_id);
          l.area = area.name;
          allNew.push(l);
          n++;
        }
      });
      log('  ' + listings.length + ' listings, ' + n + ' new');
    }
    await sleep(500);
  }

  log('Total unique: ' + allNew.length);

  let prevMap = {};
  if (fs.existsSync(LISTINGS_FILE)) {
    try {
      const prev = JSON.parse(fs.readFileSync(LISTINGS_FILE, 'utf8'));
      (Array.isArray(prev) ? prev : Object.values(prev)).forEach(l => {
        prevMap[l.listing_id] = l;
      });
      log('Previous: ' + Object.keys(prevMap).length + ' listings');
    } catch(e) {
      log('First run');
    }
  }

  const isFirstRun = Object.keys(prevMap).length === 0;
  const drops      = [];
  const snapshot   = [];

  for (const l of allNew) {
    const prev = prevMap[l.listing_id];
    if (prev) {
      l.first_price     = prev.first_price || prev.current_price;
      l.drop_from_first = parseFloat(((l.current_price - l.first_price) / l.first_price * 100).toFixed(2));
      l.saved_aed       = l.first_price - l.current_price;
    } else {
      l.first_price     = l.current_price;
      l.drop_from_first = 0;
      l.saved_aed       = 0;
    }
    snapshot.push(l);
    if (l.drop_from_first < 0) drops.push(l);
  }

  drops.sort((a, b) => a.drop_from_first - b.drop_from_first);

  const stats = {
    runAt:          runAt,
    isFirstRun:     isFirstRun,
    totalListings:  snapshot.length,
    totalDrops:     drops.length,
    dropsGte5:      drops.filter(d => d.drop_from_first <= -5).length,
    dropsGte10:     drops.filter(d => d.drop_from_first <= -10).length,
    biggestDrop:    drops.length ? drops[0].drop_from_first : null,
    areasWithDrops: new Set(drops.map(d => d.area)).size,
    areasScraped:   AREAS.length + 1,
  };

  fs.writeFileSync(LISTINGS_FILE, JSON.stringify(snapshot, null, 2));
  fs.writeFileSync(DROPS_FILE,    JSON.stringify(drops,    null, 2));
  fs.writeFileSync(STATS_FILE,    JSON.stringify(stats,    null, 2));

  log('==================================================');
  log('SCRAPE COMPLETE');
  log('Listings: ' + stats.totalListings + ' | Drops: ' + stats.totalDrops);
  if (drops.length) {
    drops.slice(0, 5).forEach((d, i) => {
      log('  ' + (i+1) + '. ' + d.drop_from_first.toFixed(1) + '% ' + d.area + ' ' + d.beds + 'BR ' + d.type + ' AED' + (d.current_price / 1000000).toFixed(2) + 'M');
    });
  }
  if (isFirstRun) log('FIRST RUN — baseline set. Run again in 1h+ for drops.');
  log('==================================================');
}

main().catch(e => { console.error(e); process.exit(1); });
