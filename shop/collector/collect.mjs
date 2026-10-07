// Collects prices from every shop in shops.json and writes data/*.json for the app.
// Run with: npm run collect
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { categorize, detectBrand, matchKey, groupProducts, updateHistory, hashId } from "./normalize.mjs";
import { parseSitemap, parseRobots, isAllowed, parseProductPage } from "./html.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(here, "..", "data");
const USER_AGENT = "3dPriceCompareNZ/0.1 (price comparison; +https://github.com/daryljohncox/klipperbackupk1c)";
const MAX_PAGES = 40;
const MAX_PRODUCT_PAGES = 2500;
const MAX_SHOP_MINUTES = 90;

// Test runs can limit the work: COLLECT_ONLY=3dshop,3dea COLLECT_LIMIT=20 COLLECT_DRY_RUN=1
const ONLY = process.env.COLLECT_ONLY?.split(",").filter(Boolean);
const LIMIT = Number(process.env.COLLECT_LIMIT) || Infinity;
const DRY_RUN = Boolean(process.env.COLLECT_DRY_RUN);
const DEBUG = Boolean(process.env.COLLECT_DEBUG);

async function getJson(url) {
  const res = await fetch(url, {
    headers: { "user-agent": USER_AGENT, accept: "application/json" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("json")) throw new Error(`Not JSON (${type}) from ${url}`);
  return res.json();
}

async function getText(url) {
  const res = await fetch(url, {
    headers: { "user-agent": USER_AGENT, accept: "text/html,application/xml,text/xml,*/*" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.text();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Shopify stores publish their catalogue at /products.json.
async function readShopify(shop) {
  const raw = [];
  for (let page = 1; page <= (LIMIT < Infinity ? 1 : MAX_PAGES); page++) {
    const { products } = await getJson(`${shop.url}/products.json?limit=250&page=${page}`);
    if (!products?.length) break;
    for (const p of products) {
      for (const v of p.variants ?? []) {
        raw.push({
          id: `${shop.id}:${v.id}`,
          title: v.title && v.title !== "Default Title" ? `${p.title} - ${v.title}` : p.title,
          vendor: p.vendor,
          productType: p.product_type,
          price: parseFloat(v.price),
          inStock: Boolean(v.available),
          url: `${shop.url}/products/${p.handle}?variant=${v.id}`,
          image: (v.featured_image ?? p.images?.[0])?.src ?? null,
        });
      }
    }
    await sleep(1000);
  }
  return raw;
}

// WooCommerce stores publish their catalogue through the public Store API.
async function readWooCommerce(shop) {
  const raw = [];
  for (let page = 1; page <= (LIMIT < Infinity ? 1 : MAX_PAGES); page++) {
    const products = await getJson(`${shop.url}/wp-json/wc/store/v1/products?per_page=100&page=${page}`);
    if (!products?.length) break;
    for (const p of products) {
      const minor = p.prices?.currency_minor_unit ?? 2;
      raw.push({
        id: `${shop.id}:${p.id}`,
        title: p.name.replace(/&amp;/g, "&").replace(/&#8211;/g, "-"),
        vendor: null,
        productType: (p.categories ?? []).map((c) => c.name).join(" "),
        price: parseInt(p.prices?.price ?? "0", 10) / 10 ** minor,
        inStock: Boolean(p.is_in_stock),
        url: p.permalink,
        image: p.images?.[0]?.src ?? null,
      });
    }
    await sleep(1000);
  }
  return raw;
}

// Shops without a product feed: find product pages in the sitemap, then read the
// product details each page publishes for Google. Follows robots.txt.
async function readSitemap(shop) {
  const origin = new URL(shop.url).origin;
  const host = (u) => new URL(u).hostname.replace(/^www\./, "");
  let robots = { sitemaps: [], disallow: [], crawlDelay: 0 };
  try {
    robots = parseRobots(await getText(`${origin}/robots.txt`));
  } catch {
    // No robots.txt: nothing is disallowed.
  }
  const delay = Math.max(1000, robots.crawlDelay * 1000);
  const pending = shop.sitemap ? [shop.sitemap] : robots.sitemaps.length ? robots.sitemaps : [`${origin}/sitemap.xml`];
  const followSitemap = shop.sitemapFilter ? new RegExp(shop.sitemapFilter, "i") : null;
  const productUrl = shop.productUrl ? new RegExp(shop.productUrl, "i") : null;
  const include = shop.include ? new RegExp(shop.include, "i") : null;

  const pages = new Set();
  for (let i = 0; i < pending.length && i < 60; i++) {
    const { sitemaps, pages: found } = parseSitemap(await getText(pending[i]));
    pending.push(...sitemaps.filter((u) => !followSitemap || followSitemap.test(u)));
    for (const url of found) {
      if (host(url) !== host(origin)) continue;
      if (productUrl && !productUrl.test(url)) continue;
      if (include && !include.test(url)) continue;
      if (!isAllowed(url, robots.disallow)) continue;
      pages.add(url);
    }
    await sleep(delay);
  }
  if (DEBUG) console.log(`[debug] ${shop.id}: ${pages.size} pages from ${pending.length} sitemaps, e.g. ${[...pages].slice(0, 5).join(" ")} / sitemaps ${pending.slice(0, 5).join(" ")}`);
  if (!pages.size) throw new Error("No product pages found in the sitemap");

  const raw = [];
  const errors = [];
  const stopAt = Date.now() + MAX_SHOP_MINUTES * 60_000;
  let debugged = false;
  for (const url of [...pages].slice(0, Math.min(MAX_PRODUCT_PAGES, LIMIT))) {
    try {
      const html = await getText(url);
      const p = parseProductPage(html, { htmlPrice: shop.htmlPrice });
      if (!p && DEBUG && !debugged) {
        debugged = true;
        console.log(`[debug] ${shop.id} ${url} (${html.length} chars)`);
        for (const line of html.split("\n").filter((l) => /price|ld\+json|availab/i.test(l)).slice(0, 25)) {
          console.log(`[debug]   ${line.trim().slice(0, 300)}`);
        }
      }
      if (p) raw.push({ id: `${shop.id}:${hashId(url)}`, vendor: null, productType: "", url, ...p });
    } catch (e) {
      errors.push(e.message);
      // Stop early when the shop is refusing us rather than hammering it.
      if (!raw.length && errors.length >= 5) throw new Error(errors[0]);
    }
    if (Date.now() > stopAt) break;
    await sleep(delay);
  }
  if (!raw.length) throw new Error(errors[0] ?? `Read ${pages.size} pages but found no prices`);
  return raw;
}

const READERS = { shopify: readShopify, woocommerce: readWooCommerce, sitemap: readSitemap };

async function readShop(shop) {
  if (shop.platform === "custom") throw new Error("Needs a custom reader (not built yet)");
  const platforms = shop.platform === "auto" ? ["shopify", "woocommerce"] : [shop.platform];
  const errors = [];
  for (const platform of platforms) {
    try {
      return { platform, raw: await READERS[platform](shop) };
    } catch (e) {
      errors.push(`${platform}: ${e.message}`);
    }
  }
  throw new Error(errors.join("; "));
}

function toListing(shop, r) {
  if (!Number.isFinite(r.price) || r.price <= 0) return null;
  const category = categorize(r.title, r.productType ?? "");
  if (!category) return null;
  const brand = detectBrand(r.title, r.vendor, shop.name);
  const listing = { ...r, shopId: shop.id, category, brand };
  delete listing.vendor;
  delete listing.productType;
  listing.matchKey = matchKey(listing);
  return listing;
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(path.join(dataDir, file), "utf8"));
  } catch {
    return fallback;
  }
}

async function main() {
  const shops = JSON.parse(await readFile(path.join(here, "shops.json"), "utf8"));
  const listings = [];
  const status = [];

  // Shops are different websites, so read them at the same time; each reader
  // still waits between its own requests.
  const selected = ONLY ? shops.filter((s) => ONLY.includes(s.id)) : shops;
  const results = await Promise.all(
    selected.map(async (shop) => {
      try {
        const { platform, raw } = await readShop(shop);
        const kept = raw.map((r) => toListing(shop, r)).filter(Boolean);
        console.log(`✓ ${shop.name}: ${kept.length} listings (${platform}, ${raw.length} read)`);
        return { kept, status: { id: shop.id, ok: true, platform, listings: kept.length } };
      } catch (e) {
        console.log(`✗ ${shop.name}: ${e.message}`);
        return { kept: [], status: { id: shop.id, ok: false, error: e.message } };
      }
    }),
  );
  for (const r of results) {
    listings.push(...r.kept);
    status.push(r.status);
  }

  if (DRY_RUN) {
    for (const l of listings.slice(0, 40)) console.log(`  ${l.shopId} | ${l.category} | ${l.price} | ${l.inStock ? "in" : "out"} | ${l.title}`);
    return;
  }

  const collectedAt = new Date().toISOString();
  const today = collectedAt.slice(0, 10);
  const history = updateHistory(await readJson("history.json", {}), listings, today);
  const products = groupProducts(listings);

  await writeFile(path.join(dataDir, "products.json"), JSON.stringify(products));
  await writeFile(path.join(dataDir, "history.json"), JSON.stringify(history));
  await writeFile(
    path.join(dataDir, "status.json"),
    JSON.stringify({ collectedAt, sample: false, shops: status }, null, 2),
  );
  console.log(`Wrote ${products.length} products from ${listings.length} listings.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
