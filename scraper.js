/**
 * Gulf Price Intelligence — GitHub Actions Scraper
 *
 * Runs on GitHub's free Ubuntu runners every 6 hours.
 * Scrapes Bayut across all Dubai areas.
 * Compares against data/listings.json (previous run).
 * Writes:
 *   data/listings.json  — all tracked listings (current prices)
 *   data/drops.json     — all detected price drops
 *   data/stats.json     — summary stats
 */

const puppeteer = require('puppeteer');
const fs        = require('fs');
const path      = require('path');

const DATA_DIR      = path.join(__dirname, 'data');
const LISTINGS_FILE = path.join(DATA_DIR, 'listings.json');
const DROPS_FILE    = path.join(DATA_DIR, 'drops.json');
const STATS_FILE    = path.join(DATA_DIR, 'stats.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ─── ALL DUBAI AREAS ──────────────────────────────────────────────────────────
const AREAS = [
  { name: 'Downtown Dubai',           slug: 'downtown-dubai' },
  { name: 'Dubai Marina',             slug: 'dubai-marina' },
  { name: 'Palm Jumeirah',            slug: 'palm-jumeirah' },
  { name: 'Jumeirah Beach Residence', slug: 'jumeirah-beach-residence-jbr' },
  { name: 'Business Bay',             slug: 'business-bay' },
  { name: 'Dubai Hills Estate',       slug: 'dubai-hills-estate' },
  { name: 'Jumeirah Village Circle',  slug: 'jumeirah-village-circle-jvc' },
  { name: 'The Springs',              slug: 'the-springs' },
  { name: 'The Meadows',              slug: 'the-meadows' },
  { name: 'Arabian Ranches',          slug: 'arabian-ranches' },
  { name: 'Arabian Ranches 2',        slug: 'arabian-ranches-2' },
  { name: 'Arabian Ranches 3',        slug: 'arabian-ranches-3' },
  { name: 'Damac Hills',              slug: 'damac-hills' },
  { name: 'Damac Hills 2',            slug: 'damac-hills-2' },
  { name: 'Jumeirah Lake Towers',     slug: 'jumeirah-lake-towers-jlt' },
  { name: 'Emaar Beachfront',         slug: 'emaar-beachfront' },
  { name: 'Dubai Creek Harbour',      slug: 'dubai-creek-harbour' },
  { name: 'DIFC',                     slug: 'difc' },
  { name: 'Meydan',                   slug: 'meydan' },
  { name: 'Al Barsha',                slug: 'al-barsha' },
  { name: 'Dubai South',              slug: 'dubai-south' },
  { name: 'The Lakes',                slug: 'the-lakes' },
  { name: 'Mudon',                    slug: 'mudon' },
  { name: 'Jumeirah Golf Estates',    slug: 'jumeirah-golf-estates' },
  { name: 'Jumeirah Park',            slug: 'jumeirah-park' },
  { name: 'Al Furjan',                slug: 'al-furjan' },
  { name: 'Town Square',              slug: 'town-square' },
  { name: 'Tilal Al Ghaf',            slug: 'tilal-al-ghaf' },
  { name: 'Motor City',               slug: 'motor-city' },
  { name: 'Sports City',              slug: 'dubai-sports-city' },
  { name: 'Discovery Gardens',        slug: 'discovery-gardens' },
  { name: 'International City',       slug: 'international-city' },
  { name: 'Bluewaters Island',        slug: 'bluewaters-island' },
  { name: 'City Walk',                slug: 'city-walk' },
  { name: 'Jumeirah',                 slug: 'jumeirah' },
  { name: 'Al Jaddaf',                slug: 'al-jaddaf' },
  { name: 'Culture Village',          slug: 'culture-village-jaddaf-waterfront' },
  { name: 'Al Karama',                slug: 'al-karama' },
  { name: 'Deira',                    slug: 'deira' },
  { name: 'Silicon Oasis',            slug: 'dubai-silicon-oasis' },
];

const MAX_PAGES  = 8;     // up to 8 pages × 25 listings = 200 per area
const PAGE_DELAY = 1500;  // ms between pages
const AREA_DELAY = 2500;  // ms between areas

// ─── LOAD PREVIOUS DATA ───────────────────────────────────────────────────────
function loadPrev() {
  try {
    return JSON.parse(fs.readFileSync(LISTINGS_FILE, 'utf8'));
  } catch(e) {
    log('No previous listings.json — first run, establishing baseline');
    return {};
  }
}

// ─── PRICE PARSER ─────────────────────────────────────────────────────────────
function parsePrice(raw) {
  if (!raw) return null;
  const s = String(raw).replace(/[^0-9.]/g, '');
  const n = parseFloat(s);
  return isNaN(n) || n < 50000 ? null : Math.round(n);
}

// ─── LOG ──────────────────────────────────────────────────────────────────────
function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

// ─── SCRAPE ONE AREA ──────────────────────────────────────────────────────────
async function scrapeArea(page, area) {
  const listings = [];
  let pageNum = 1;

  while (pageNum <= MAX_PAGES) {
    const url = `https://www.bayut.com/for-sale/property/dubai/${area.slug}/${pageNum > 1 ? `?page=${pageNum}` : ''}`;

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await sleep(PAGE_DELAY);

      // Primary method: extract from Next.js __NEXT_DATA__
      const fromNextData = await page.evaluate(() => {
        const el = document.getElementById('__NEXT_DATA__');
        if (!el) return [];
        try {
          const data = JSON.parse(el.textContent);
          const hits =
            data?.props?.pageProps?.searchResult?.hits ||
            data?.props?.pageProps?.hits ||
            [];
          return hits.map(h => ({
            id:       String(h.externalID || h.id || ''),
            price:    h.price,
            title:    (h.title || h.titleL1 || '').slice(0, 120),
            beds:     h.rooms ?? h.beds ?? null,
            type:     h.type  || h.category || '',
            sqft:     h.area  || null,
            psf:      h.price && h.area ? Math.round(h.price / h.area) : null,
          })).filter(h => h.id && h.price > 0);
        } catch(e) { return []; }
      });

      if (fromNextData.length > 0) {
        listings.push(...fromNextData.map(h => ({ ...h, areaName: area.name })));
        log(`  ${area.name} p${pageNum}: ${fromNextData.length} listings (Next.js data)`);

        if (fromNextData.length < 20) break; // last page
        pageNum++;
        continue;
      }

      // Fallback: DOM scraping of listing cards
      const fromDOM = await page.evaluate(() => {
        const results = [];
        const cards = document.querySelectorAll(
          '[class*="listingCard"], [data-testid*="listing-card"], article[class*="card"], [class*="PropertyCard"]'
        );
        cards.forEach(card => {
          try {
            const link = card.querySelector('a[href*="/property/"]');
            if (!link) return;
            const idMatch = (link.href || '').match(/details-(\d+)/);
            if (!idMatch) return;

            const priceEl = card.querySelector('[class*="price"] strong, [aria-label*="price"], [class*="Price"]');
            const rawPrice = priceEl?.textContent?.replace(/[^0-9]/g, '') || '';
            const price = rawPrice ? parseInt(rawPrice) : null;
            if (!price || price < 50000) return;

            const titleEl = card.querySelector('h2, h3, [class*="title"], [aria-label*="title"]');
            const title   = (titleEl?.textContent || '').trim().slice(0, 120);

            const bedsEl  = card.querySelector('[aria-label*="bed"], [class*="bed"]');
            const bedsText = bedsEl?.textContent || '';
            const bedsMatch = bedsText.match(/(\d+)/);
            const beds = bedsText.toLowerCase().includes('studio') ? 0 : (bedsMatch ? parseInt(bedsMatch[1]) : null);

            const typeText = (card.textContent || '').toLowerCase();
            const type = typeText.includes('villa') ? 'Villa'
              : typeText.includes('townhouse') ? 'Townhouse'
              : typeText.includes('penthouse') ? 'Penthouse'
              : 'Apartment';

            results.push({ id: idMatch[1], price, title, beds, type });
          } catch(e) {}
        });
        return results;
      });

      if (fromDOM.length > 0) {
        listings.push(...fromDOM.map(h => ({ ...h, areaName: area.name })));
        log(`  ${area.name} p${pageNum}: ${fromDOM.length} listings (DOM)`);
        if (fromDOM.length < 15) break;
        pageNum++;
        continue;
      }

      log(`  ${area.name} p${pageNum}: no listings — stopping`);
      break;

    } catch(e) {
      log(`  ${area.name} p${pageNum} error: ${e.message}`);
      break;
    }
  }

  return listings;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  const prevListings = loadPrev();
  const isFirstRun   = Object.keys(prevListings).length === 0;
  const runAt        = new Date().toISOString();

  log(`Starting scrape — ${isFirstRun ? 'FIRST RUN (establishing baseline)' : Object.keys(prevListings).length + ' listings in previous snapshot'}`);

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1280,800',
      '--disable-blink-features=AutomationControlled',
    ],
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  );
  await page.setViewport({ width: 1280, height: 800 });
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  // current snapshot: { listingId: { price, area, type, beds, title, sqft, psf } }
  const currentSnapshot = {};
  const allDrops        = [];
  let   totalListings   = 0;

  for (let i = 0; i < AREAS.length; i++) {
    const area = AREAS[i];
    log(`[${i+1}/${AREAS.length}] Scraping ${area.name}…`);

    try {
      const listings = await scrapeArea(page, area);
      totalListings += listings.length;

      for (const l of listings) {
        const price = typeof l.price === 'number' ? l.price : parsePrice(l.price);
        if (!price) continue;

        // Normalise type
        const rawType = (l.type || '').toLowerCase();
        const propType = rawType.includes('villa') ? 'Villa'
          : rawType.includes('townhouse') ? 'Townhouse'
          : rawType.includes('penthouse') ? 'Penthouse'
          : 'Apartment';

        currentSnapshot[l.id] = {
          id:         l.id,
          area:       area.name,
          title:      l.title || '',
          type:       propType,
          beds:       l.beds ?? null,
          price,
          sqft:       l.sqft  || null,
          psf:        l.psf   || (l.sqft ? Math.round(price / l.sqft) : null),
          portalUrl:  `https://www.bayut.com/property/details-${l.id}.html`,
          lastSeen:   runAt,
        };
      }

      log(`  ✓ ${listings.length} listings\n`);
    } catch(e) {
      log(`  ✗ ${area.name} failed: ${e.message}\n`);
    }

    if (i < AREAS.length - 1) await sleep(AREA_DELAY);
  }

  await browser.close();

  // ── DETECT DROPS ────────────────────────────────────────────────────────────
  if (!isFirstRun) {
    for (const [id, curr] of Object.entries(currentSnapshot)) {
      const prev = prevListings[id];
      if (!prev) continue; // new listing, no baseline yet

      const firstPrice = prev.firstPrice || prev.price;
      const prevPrice  = prev.price;

      if (curr.price < prevPrice) {
        const dropFromFirst = ((curr.price - firstPrice) / firstPrice) * 100;
        const dropFromPrev  = ((curr.price - prevPrice)  / prevPrice)  * 100;
        const savedAed      = firstPrice - curr.price;

        allDrops.push({
          listing_id:     id,
          area:           curr.area,
          title:          curr.title,
          type:           curr.type,
          beds:           curr.beds,
          current_price:  curr.price,
          previous_price: prevPrice,
          first_price:    firstPrice,
          drop_from_first: +dropFromFirst.toFixed(2),
          drop_from_prev:  +dropFromPrev.toFixed(2),
          saved_aed:      savedAed,
          sqft:           curr.sqft,
          psf:            curr.psf,
          portal_url:     curr.portalUrl,
          detected_at:    runAt,
        });
      }

      // Carry forward first_price
      currentSnapshot[id].firstPrice = firstPrice;
    }

    // Also carry forward first_price for listings we didn't see this run
    // (might be temporarily de-listed or slow page)
    for (const [id, prev] of Object.entries(prevListings)) {
      if (!currentSnapshot[id]) {
        // Keep in snapshot with is_active=false so we don't lose history
        currentSnapshot[id] = { ...prev, is_active: false };
      }
    }
  } else {
    // First run — record first_price for everything
    for (const id of Object.keys(currentSnapshot)) {
      currentSnapshot[id].firstPrice = currentSnapshot[id].price;
    }
    log('First run complete — baseline established. Drops will be detected from next run.');
  }

  // Sort drops: biggest total drop first
  allDrops.sort((a, b) => a.drop_from_first - b.drop_from_first);

  // ── STATS ───────────────────────────────────────────────────────────────────
  const activeListings = Object.values(currentSnapshot).filter(l => l.is_active !== false);
  const areaDropCounts = {};
  for (const d of allDrops) {
    areaDropCounts[d.area] = (areaDropCounts[d.area] || 0) + 1;
  }

  const stats = {
    runAt,
    isFirstRun,
    totalListings:  activeListings.length,
    totalDrops:     allDrops.length,
    dropsGte1:      allDrops.filter(d => d.drop_from_first <= -1).length,
    dropsGte5:      allDrops.filter(d => d.drop_from_first <= -5).length,
    dropsGte10:     allDrops.filter(d => d.drop_from_first <= -10).length,
    dropsGte15:     allDrops.filter(d => d.drop_from_first <= -15).length,
    biggestDrop:    allDrops.length ? allDrops[0].drop_from_first : null,
    avgDrop:        allDrops.length ? +(allDrops.reduce((s,d) => s+d.drop_from_first, 0) / allDrops.length).toFixed(1) : null,
    totalSaved:     allDrops.reduce((s,d) => s+d.saved_aed, 0),
    areasWithDrops: Object.keys(areaDropCounts).length,
    areaBreakdown:  Object.entries(areaDropCounts).map(([area,cnt]) => ({ area, cnt })).sort((a,b) => b.cnt-a.cnt),
    areasScraped:   AREAS.length,
  };

  // ── SAVE ────────────────────────────────────────────────────────────────────
  fs.writeFileSync(LISTINGS_FILE, JSON.stringify(currentSnapshot, null, 2));
  fs.writeFileSync(DROPS_FILE,    JSON.stringify(allDrops,        null, 2));
  fs.writeFileSync(STATS_FILE,    JSON.stringify(stats,           null, 2));

  log('\n' + '═'.repeat(60));
  log('SCRAPE COMPLETE');
  log(`Areas scraped:   ${AREAS.length}`);
  log(`Listings found:  ${totalListings}`);
  log(`Total tracked:   ${activeListings.length}`);
  log(`Drops detected:  ${allDrops.length}`);
  if (allDrops.length > 0) {
    log(`Biggest drop:    ${allDrops[0].drop_from_first.toFixed(1)}% — ${allDrops[0].area} ${allDrops[0].type}`);
    log('\nTop 10 drops:');
    allDrops.slice(0, 10).forEach((d, i) => {
      log(`  ${i+1}. ${d.drop_from_first.toFixed(1)}% — ${d.area} ${d.beds != null ? d.beds+'BR ' : ''}${d.type} — AED ${(d.current_price/1e6).toFixed(2)}M (saved AED ${Math.round(d.saved_aed/1000)}K)`);
    });
  }
  log('═'.repeat(60));

  if (isFirstRun) {
    log('\nNEXT STEP: Wait for the next scheduled run (or re-trigger workflow).');
    log('Drops will appear after 2 runs as prices are compared between snapshots.\n');
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

main().catch(e => { console.error(e); process.exit(1); });
