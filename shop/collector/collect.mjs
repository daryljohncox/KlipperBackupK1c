// Collects prices from every shop in shops.json and writes data/*.json for the app.
// Run with: npm run collect
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { categorize, detectBrand, matchKey, groupProducts, updateHistory } from "./normalize.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(here, "..", "data");
const USER_AGENT = "PrintPriceNZ/0.1 (price comparison; +https://github.com/daryljohncox/klipperbackupk1c)";
const MAX_PAGES = 40;

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Shopify stores publish their catalogue at /products.json.
async function readShopify(shop) {
  const raw = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
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
  for (let page = 1; page <= MAX_PAGES; page++) {
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

const READERS = { shopify: readShopify, woocommerce: readWooCommerce };

async function readShop(shop) {
  if (shop.platform === "custom") throw new Error("Needs a custom reader (not built yet)");
  const platforms = shop.platform === "auto" ? Object.keys(READERS) : [shop.platform];
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

  for (const shop of shops) {
    try {
      const { platform, raw } = await readShop(shop);
      const kept = raw.map((r) => toListing(shop, r)).filter(Boolean);
      listings.push(...kept);
      status.push({ id: shop.id, ok: true, platform, listings: kept.length });
      console.log(`✓ ${shop.name}: ${kept.length} listings (${platform})`);
    } catch (e) {
      status.push({ id: shop.id, ok: false, error: e.message });
      console.log(`✗ ${shop.name}: ${e.message}`);
    }
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
