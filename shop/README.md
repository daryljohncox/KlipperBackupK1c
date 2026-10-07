# 3dPriceCompareNZ

A free price comparison app for 3D printers, filament, resin and parts across New Zealand shops, in the style of Grocer. It does not sell anything: each price links to the shop's own website.

## How it works

- `collector/shops.json` lists the shops. `platform` is `shopify`, `woocommerce`, `auto` (try both) or `custom` (needs its own reader, not built yet).
- `collector/collect.mjs` reads each shop's public product data, keeps 3D printing items, sorts them into categories and matches the same product across shops (`collector/normalize.mjs`).
- Results go to `data/products.json`, `data/history.json` (price changes per listing) and `data/status.json` (which shops worked).
- The **Collect prices** GitHub Action runs this every morning NZ time and commits the new data, which redeploys the site.
- The web app (Next.js) reads those files. The data in the repo starts as clearly marked sample data until the first collection runs.

## Commands

```bash
npm install
npm run dev       # http://localhost:3000
npm run collect   # fetch real prices from the shops
npm test          # matching and categorising tests
npm run build
```

## Hosting

Import the repository on Vercel and set **Root Directory** to `shop`. The free tier is enough.
