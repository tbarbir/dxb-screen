# Gulf Price Intelligence — Free Edition
### GitHub Actions + GitHub Pages. Zero cost. Forever.

Scrapes all Dubai areas on Bayut every 6 hours using GitHub's free CI servers.
Detects any price drop, even 1%. Stores data as JSON in this repo.
Dashboard served free via GitHub Pages.

---

## Setup (10 minutes, completely free)

### Step 1 — Fork or create this repo on GitHub
Go to github.com → New Repository → upload these files.
Make it **public** (GitHub Pages is free for public repos).

### Step 2 — Enable GitHub Pages
Repo → Settings → Pages → Source: **Deploy from a branch** → Branch: **main** → Folder: **/ (root)**

Your dashboard will be live at:
`https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/`

### Step 3 — Trigger the first scrape
Repo → Actions → "Dubai Property Price Drop Tracker" → **Run workflow**

This takes 20–40 minutes. It scrapes all 40+ Dubai areas on Bayut and saves every listing with its current price as a baseline.

### Step 4 — Wait for the second run
6 hours later, the workflow runs again automatically. It compares current prices to the baseline. Any listing that dropped in price — even AED 1 — appears as a drop.

**After 2 runs, The Springs, The Meadows, Arabian Ranches and every other area will show drops if any listings changed price.**

---

## How drops work

| Run 1 | Scrapes all areas, saves every listing price as `first_price` |
| Run 2+ | Compares current price to `first_price`. Any reduction = drop recorded |

A 3% drop on a Springs villa appears. A 1% drop on a JVC apartment appears. Everything.

---

## GitHub Actions free tier

| What | Free allowance |
|---|---|
| Minutes per month | 2,000 (public repos: unlimited) |
| Minutes per scrape run | ~30–45 minutes |
| Runs per day | 4× (every 6 hours) |
| Cost | **AED 0** |

Public repo = unlimited Actions minutes. This scraper costs nothing.

---

## Files

```
├── .github/
│   └── workflows/
│       └── scrape.yml      — GitHub Actions cron job
├── scraper.js              — Puppeteer scraper (all 40+ Dubai areas)
├── index.html              — Dashboard (GitHub Pages)
├── package.json
└── data/
    ├── listings.json       — All tracked listings with prices (updated each run)
    ├── drops.json          — All detected price drops (updated each run)
    └── stats.json          — Summary stats (updated each run)
```

---

## Manual scrape for a specific area

Add this to the workflow or run locally:
```bash
AREA_FILTER="the-springs" node scraper.js
```

---

## Why this beats LuxuryPriceDrops for institutional use

| Feature | LuxuryPriceDrops | Gulf Price Intelligence |
|---|---|---|
| All Dubai areas including Springs/Meadows | ✓ | ✓ |
| Any % drop (even 1%) | ✓ | ✓ |
| DLD benchmark comparison | ✗ | ✓ |
| Gross yield estimate | ✗ | ✓ |
| Bid target price | ✗ | ✓ |
| Deal score /10 | ✗ | ✓ |
| Full deal analysis | ✗ | ✓ |
| API access to raw data | ✗ | ✓ (JSON files) |
| Cost | Free / paid tiers | **Free forever** |
