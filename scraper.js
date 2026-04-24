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
  // Route through allorigins proxy — GitHub Actions IPs are blocked by PanicSelling directly
  const proxied = url.includes('panicselling.com')
    ? `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
    : url;
  try {
    const resp = await axios.get(proxied, { headers: HEADERS, timeout: 20000 });
    // allorigins wraps response in {contents: "..."}
    if (proxied.includes('allorigins')) {
      const data = resp.data;
      if (!data?.contents) throw new Error('allorigins: no contents');
      return data.contents;
    }
    return resp.data;
  } catch(e) {
    // Fallback: try alternate proxy
    if (url.includes('panicselling.com')) {
      try {
        const alt = `https://corsproxy.io/?${encodeURIComponent(url)}`;
        const r2 = await axios.get(alt, { headers: HEADERS, timeout: 20000 });
        return r2.data;
      } catch(e2) {}
    }
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

/* ══════════════════════════════════════════════════════════════════
   DLD API INTEGRATION — Dubai Pulse / Data Dubai iPaaS
   Credentials loaded from GitHub Secrets (env vars)
   Runs weekly, calculates real PSF by area from completed transactions
   ══════════════════════════════════════════════════════════════════ */

const BENCHMARKS_FILE = path.join(DATA_DIR, 'benchmarks.json');

// DDA API credentials from GitHub Secrets
const DDA_APP_ID      = process.env.DDA_APP_ID      || '';
const DDA_SECURITY_ID = process.env.DDA_SECURITY_ID || '';
const DDA_CLIENT_ID   = process.env.DDA_CLIENT_ID   || '';
const DDA_CLIENT_SECRET = process.env.DDA_CLIENT_SECRET || '';

const DLD_API_BASE = 'https://apis.data.dubai/open/dld';

// Base PSF benchmarks (Feb 2026 — E&V/DXB Analytics fallback)
const BASE_PSF = {
  'Downtown Dubai':2980,'Dubai Marina':2061,'Palm Jumeirah':3950,'Business Bay':2673,
  'Jumeirah Village Circle':1448,'Jumeirah Beach Residence':2450,'DIFC':3500,
  'Emaar Beachfront':3100,'Bluewaters Island':3400,'Dubai Hills Estate':2200,
  'Arabian Ranches':1850,'Arabian Ranches 2':1750,'Arabian Ranches 3':1650,
  'The Springs':1750,'The Meadows':2100,'The Lakes':1900,'Jumeirah Golf Estates':1900,
  'Tilal Al Ghaf':2000,'Dubai Creek Harbour':1900,'Jumeirah Lake Towers':1400,
  'Damac Hills':1450,'Damac Hills 2':920,'Meydan':1700,'Al Barsha':1150,
  'Dubai South':980,'Town Square':1020,'Mudon':1350,'Al Furjan':1250,
  'Motor City':1100,'City Walk':2800,'Jumeirah':2200,'Jumeirah Park':1600,
  'Dubai Land':1200,'Mohammed Bin Rashid City':1800,'Damac Lagoons':1100,
  'The Valley':1050,'Dubai Harbour':2800,'Dubai Sports City':1000,
  'Jumeirah Islands':2400,'Nad Al Sheba':1300,'Dubai Investment Park':850,
  'Dubai Islands':2600,'The Villa':1400,'Al Jaddaf':1600,'The Views':1800,
  'The Oasis by Emaar':2200,'Al Barari':2800,'Zabeel':2500,'Mina Rashid':2200,
  'Palm Jebel Ali':2800,'Maritime City':2000,'Jumeirah Village Triangle':1200,
  'Culture Village':1500,'Jebel Ali':950,'Arjan':1050,'Expo City':1150,
  'Falcon City':900,'Dubai Science Park':950,
  'Saadiyat Island':3200,'Al Reem Island':1800,'Yas Island':1600,'Al Raha Beach':2000,
};

// Base yields (Goldman Sachs Feb 2026: apts 7.1%, villas 4.6%)
const BASE_YIELDS = {
  apartment: {
    'Downtown Dubai':0.060,'Dubai Marina':0.066,'Palm Jumeirah':0.053,
    'Jumeirah Beach Residence':0.062,'Business Bay':0.070,'DIFC':0.060,
    'Emaar Beachfront':0.056,'Dubai Creek Harbour':0.062,'Dubai Hills Estate':0.059,
    'Jumeirah Village Circle':0.078,'Jumeirah Lake Towers':0.073,'Al Barsha':0.067,
    'Damac Hills':0.056,'Dubai South':0.082,'Mohammed Bin Rashid City':0.065,
    'Damac Lagoons':0.068,'The Valley':0.070,'Dubai Land':0.072,
    'Dubai Harbour':0.055,'Jumeirah':0.060,
    'Saadiyat Island':0.056,'Al Reem Island':0.065,'Yas Island':0.068,
    '_default': 0.071,
  },
  villa: {
    'Palm Jumeirah':0.042,'Dubai Hills Estate':0.051,'Arabian Ranches':0.049,
    'Arabian Ranches 2':0.050,'Arabian Ranches 3':0.052,'The Springs':0.059,
    'The Meadows':0.054,'The Lakes':0.053,'Jumeirah Golf Estates':0.050,
    'Tilal Al Ghaf':0.052,'Damac Hills':0.053,'The Valley':0.058,
    'Damac Lagoons':0.055,'Mohammed Bin Rashid City':0.052,
    'Saadiyat Island':0.048,'Yas Island':0.058,
    '_default': 0.046,
  },
};

// Maps dashboard area names to DLD area name patterns
const AREA_DLD_MAP = {
  'Downtown Dubai':          'DOWNTOWN DUBAI',
  'Dubai Marina':            'DUBAI MARINA',
  'Palm Jumeirah':           'PALM JUMEIRAH',
  'Business Bay':            'BUSINESS BAY',
  'Jumeirah Village Circle': 'JUMEIRAH VILLAGE CIRCLE',
  'Jumeirah Beach Residence':'JUMEIRAH BEACH RESIDENCE',
  'DIFC':                    'DIFC',
  'Dubai Hills Estate':      'DUBAI HILLS ESTATE',
  'Arabian Ranches':         'ARABIAN RANCHES',
  'Arabian Ranches 2':       'ARABIAN RANCHES 2',
  'Arabian Ranches 3':       'ARABIAN RANCHES 3',
  'The Springs':             'SPRINGS',
  'The Meadows':             'MEADOWS',
  'The Lakes':               'LAKES',
  'Jumeirah Golf Estates':   'JUMEIRAH GOLF ESTATES',
  'Tilal Al Ghaf':           'TILAL AL GHAF',
  'Dubai Creek Harbour':     'DUBAI CREEK HARBOUR',
  'Jumeirah Lake Towers':    'JUMEIRAH LAKE TOWERS',
  'Damac Hills':             'DAMAC HILLS',
  'Damac Hills 2':           'DAMAC HILLS 2',
  'Meydan':                  'MEYDAN',
  'Al Barsha':               'AL BARSHA',
  'Dubai South':             'DUBAI SOUTH',
  'Emaar Beachfront':        'EMAAR BEACHFRONT',
  'Bluewaters Island':       'BLUEWATERS ISLAND',
  'City Walk':               'CITY WALK',
  'Mohammed Bin Rashid City':'MOHAMMED BIN RASHID CITY',
  'Damac Lagoons':           'DAMAC LAGOONS',
  'The Valley':              'THE VALLEY',
  'Dubai Harbour':           'DUBAI HARBOUR',
  'Jumeirah':                'JUMEIRAH',
  'Jumeirah Islands':        'JUMEIRAH ISLANDS',
  'Al Furjan':               'AL FURJAN',
  'Town Square':             'TOWN SQUARE',
  'Mudon':                   'MUDON',
  'Motor City':              'MOTOR CITY',
  'Al Jaddaf':               'AL JADDAF',
  'Dubai Land':              'DUBAILAND',
  'Dubai Sports City':       'DUBAI SPORTS CITY',
  'Saadiyat Island':         'SAADIYAT ISLAND',
  'Al Reem Island':          'AL REEM ISLAND',
  'Yas Island':              'YAS ISLAND',
};

async function getDLDToken() {
  const tokenEndpoints = [
    'https://apis.data.dubai/auth/realms/ddads/protocol/openid-connect/token',
    'https://stg-apis.data.dubai/auth/token',
    'https://apis.data.dubai/auth/token',
    'https://ipaas.dubai.gov.ae/auth/token',
  ];
  const body = new URLSearchParams({
    grant_type:    'client_credentials',
    client_id:     DDA_CLIENT_ID,
    client_secret: DDA_CLIENT_SECRET,
  });
  for (const endpoint of tokenEndpoints) {
    try {
      log(`  Trying: ${endpoint.split('/').slice(2,4).join('/')}`);
      const resp = await axios.post(endpoint, body.toString(), {
        headers: {
          'Content-Type':                        'application/x-www-form-urlencoded',
          'x-DDA-SecurityApplicationIdentifier': DDA_SECURITY_ID,
          'ApplicationId':                       DDA_APP_ID,
        },
        timeout: 10000,
      });
      const token = resp.data?.access_token || resp.data?.token;
      if (token) { log(`  Token ✓ from ${endpoint.split('/')[2]}`); return token; }
    } catch(e) {
      log(`  ${endpoint.split('/')[2]}: ${e.response?.status||e.code||e.message}`);
    }
    await sleep(300);
  }
  log('  All token endpoints failed');
  return null;
}

async function fetchDLDTransactions(token, areaName, months = 3) {
  // Fetch last N months of completed residential transactions for an area
  const endDate   = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  const fmt = d => d.toISOString().split('T')[0];

  const endpoints = [
    `${DLD_API_BASE}/dld_transactions-open-api`,
    `${DLD_API_BASE}/transactions`,
    `https://apis.data.dubai/open/dld/dld_transactions-open-api`,
  ];

  const params = {
    area_name_en:   areaName,
    trans_group_en: 'Sales',
    prop_type_en:   'Unit',
    start_date:     fmt(startDate),
    end_date:       fmt(endDate),
    limit:          500,
  };

  for (const endpoint of endpoints) {
    try {
      const resp = await axios.get(endpoint, {
        headers: {
          'Authorization':                       `Bearer ${token}`,
          'x-DDA-SecurityApplicationIdentifier': DDA_SECURITY_ID,
          'ApplicationId':                       DDA_APP_ID,
          'Content-Type':                        'application/json',
        },
        params,
        timeout: 8000,
      });
      const data = resp.data;
      // Handle various response formats
      const rows = data?.result || data?.data || data?.transactions || data?.response || 
                   (Array.isArray(data) ? data : []);
      if (rows.length > 0) return rows;
    } catch(e) {
      log(`    ${endpoint.split('/').pop()}: ${e.response?.status || e.message}`);
    }
    await sleep(300);
  }
  return [];
}

function calcAreaPSF(transactions) {
  // Calculate median PSF from DLD transactions
  const valid = transactions.filter(t => {
    const price = parseFloat(t.trans_value || t.amount || t.price || 0);
    const area  = parseFloat(t.procedure_area || t.area_sqft || t.size || 0);
    return price > 100000 && area > 100;
  });
  if (!valid.length) return null;
  const psfs = valid
    .map(t => parseFloat(t.trans_value || t.amount || t.price) /
              parseFloat(t.procedure_area || t.area_sqft || t.size))
    .filter(p => p > 200 && p < 20000)
    .sort((a, b) => a - b);
  if (!psfs.length) return null;
  // Median
  const mid = Math.floor(psfs.length / 2);
  return Math.round(psfs.length % 2 ? psfs[mid] : (psfs[mid-1]+psfs[mid])/2);
}

async function updateBenchmarks() {
  log('\n-- BENCHMARK UPDATE (DLD API) --');

  // Check if update needed (weekly)
  let existing = null;
  if (fs.existsSync(BENCHMARKS_FILE)) {
    try { existing = JSON.parse(fs.readFileSync(BENCHMARKS_FILE, 'utf8')); } catch(e) {}
  }
  if (existing?.updatedAt) {
    const daysSince = (Date.now() - new Date(existing.updatedAt)) / 86400000;
    if (daysSince < 6) {
      log(`  Benchmarks current (updated ${daysSince.toFixed(1)}d ago) — skipping`);
      return;
    }
  }

  // Check credentials
  if (!DDA_CLIENT_ID || !DDA_CLIENT_SECRET) {
    log('  No DLD credentials — using fallback benchmarks');
    _writeFallbackBenchmarks();
    return;
  }

  // Get auth token
  const token = await getDLDToken();
  if (!token) {
    log('  Auth failed — using fallback benchmarks');
    _writeFallbackBenchmarks();
    return;
  }

  // Fetch PSF for top 20 areas (most impactful for NAV accuracy)
  const TOP_AREAS = [
    'Downtown Dubai','Dubai Marina','Palm Jumeirah','Business Bay',
    'Jumeirah Village Circle','Jumeirah Beach Residence','Dubai Hills Estate',
    'Arabian Ranches','The Springs','The Meadows',
  ];

  const livePSF = { ...BASE_PSF }; // start with base, override with live
  let successCount = 0;

  log(`  Fetching PSF for ${TOP_AREAS.length} areas...`);
  for (const area of TOP_AREAS) {
    const dldName = AREA_DLD_MAP[area];
    if (!dldName) continue;
    try {
      const txns = await fetchDLDTransactions(token, dldName, 3);
      if (txns.length >= 5) { // need at least 5 transactions for reliable median
        const psf = calcAreaPSF(txns);
        if (psf && psf > 500 && psf < 15000) {
          livePSF[area] = psf;
          successCount++;
          log(`  ✓ ${area}: AED ${psf}/sqft (${txns.length} txns)`);
        } else {
          log(`  ~ ${area}: PSF out of range (${psf}) — using base`);
        }
      } else {
        log(`  ~ ${area}: only ${txns.length} txns — using base`);
      }
    } catch(e) {
      log(`  ✗ ${area}: ${e.message}`);
    }
    await sleep(200);
  }

  log(`\n  DLD API: ${successCount}/${TOP_AREAS.length} areas updated with live data`);

  const benchmarks = {
    updatedAt:    new Date().toISOString(),
    source:       successCount > 0 ? 'DLD_API_LIVE' : 'FALLBACK',
    areasUpdated: successCount,
    psf:          livePSF,
    yields:       BASE_YIELDS,
    notes: {
      base:       'Feb 2026 E&V/DXB Analytics',
      live:       `${successCount} areas updated from DLD completed transactions (last 3 months)`,
      apartments: 'Gross yield 7.1% market avg (Goldman Sachs Feb 2026)',
      villas:     'Gross yield 4.6% market avg (Goldman Sachs Feb 2026)',
    },
  };

  fs.writeFileSync(BENCHMARKS_FILE, JSON.stringify(benchmarks, null, 2));
  log(`  Benchmarks saved ✓ — ${successCount} live areas, ${Object.keys(livePSF).length - successCount} fallback`);
}

function _writeFallbackBenchmarks() {
  // Write base benchmarks with monthly drift applied
  const monthsSince = Math.max(0, (Date.now() - new Date('2026-02-01')) / (30*86400000));
  const adj = Math.pow(1.007, monthsSince);
  const psf = {};
  Object.entries(BASE_PSF).forEach(([a, v]) => { psf[a] = Math.round(v * adj); });
  fs.writeFileSync(BENCHMARKS_FILE, JSON.stringify({
    updatedAt: new Date().toISOString(),
    source: 'FALLBACK_DRIFT',
    adjFactor: +adj.toFixed(4),
    psf, yields: BASE_YIELDS,
    notes: { base: 'Feb 2026 + 0.7% mom drift (Goldman/REIDIN)' },
  }, null, 2));
  log(`  Fallback benchmarks written (adj ${adj.toFixed(4)}x)`);
}



async function main() {
  // Update benchmarks weekly (skips if updated recently)
  await updateBenchmarks();
  await sleep(500);

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
