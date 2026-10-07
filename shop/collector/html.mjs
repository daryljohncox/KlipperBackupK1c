// Pure helpers for shops without a product feed: read their sitemap and the
// product details that most shop websites embed for Google (JSON-LD and meta tags).

const decode = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#8211;|&ndash;/g, "-")
    .replace(/&nbsp;/g, " ")
    .trim();

// Returns { sitemaps, pages } listed in a sitemap or sitemap index.
export function parseSitemap(xml) {
  const locs = (tag) =>
    [...xml.matchAll(new RegExp(`<${tag}>[\\s\\S]*?<loc>\\s*(?:<!\\[CDATA\\[)?\\s*([^<\\]]+?)\\s*(?:\\]\\]>)?\\s*</loc>`, "g"))].map((m) => decode(m[1]));
  return { sitemaps: locs("sitemap"), pages: locs("url") };
}

// The "User-agent: *" rules of a robots.txt, as { sitemaps, disallow, crawlDelay }.
export function parseRobots(text) {
  const sitemaps = [];
  const disallow = [];
  let crawlDelay = 0;
  let agents = [];
  let inRules = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const [, key, value] = m;
    const k = key.toLowerCase();
    if (k === "sitemap") {
      sitemaps.push(value);
      continue;
    }
    if (k === "user-agent") {
      if (inRules) agents = [];
      inRules = false;
      agents.push(value.toLowerCase());
      continue;
    }
    inRules = true;
    if (!agents.includes("*")) continue;
    if (k === "disallow" && value) disallow.push(value);
    if (k === "crawl-delay") crawlDelay = Math.max(crawlDelay, parseFloat(value) || 0);
  }
  return { sitemaps, disallow, crawlDelay };
}

export function isAllowed(url, disallow) {
  const u = new URL(url);
  const path = u.pathname + u.search;
  return !disallow.some((rule) => {
    const anchored = rule.endsWith("$");
    const body = (anchored ? rule.slice(0, -1) : rule)
      .split("*")
      .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join(".*");
    return new RegExp(`^${body}${anchored ? "$" : ""}`).test(path);
  });
}

function jsonLdBlocks(html) {
  const out = [];
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      out.push(JSON.parse(m[1].trim()));
    } catch {
      // Some shops publish broken JSON-LD; the meta tags below are the fallback.
    }
  }
  return out;
}

function findProduct(node) {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const n of node) {
      const p = findProduct(n);
      if (p) return p;
    }
    return null;
  }
  const type = [].concat(node["@type"] ?? []).map(String);
  if (type.includes("Product")) return node;
  if (type.includes("ProductGroup")) return { ...node, offers: node.hasVariant?.map((v) => v.offers).flat() };
  return findProduct(node["@graph"]) ?? findProduct(node.mainEntity);
}

function meta(html, name) {
  const re = new RegExp(
    `<meta[^>]+(?:property|name|itemprop)=["']${name}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name|itemprop)=["']${name}["']`,
    "i",
  );
  const m = html.match(re);
  return m ? decode(m[1] ?? m[2]) : null;
}

const toPrice = (v) => {
  const n = parseFloat(String(v ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};

const inStockText = (v) => (v == null ? null : !/out ?of ?stock|outofstock|soldout|discontinued/i.test(String(v)));

// Reads a product page. Returns { title, price, inStock, image } or null.
// htmlPrice: also look for a visible "price" element, for shops that publish no
// structured data (only safe on pages that are known to be product pages).
export function parseProductPage(html, { htmlPrice = false } = {}) {
  let title = null;
  let price = null;
  let inStock = null;
  let image = null;

  const product = findProduct(jsonLdBlocks(html));
  if (product) {
    title = product.name ? decode(String(product.name)) : null;
    const offers = [].concat(product.offers ?? []).flatMap((o) => (o?.offers ? [].concat(o.offers) : [o])).filter(Boolean);
    const priced = offers
      .map((o) => ({ price: toPrice(o.price ?? o.lowPrice ?? o.priceSpecification?.price), stock: inStockText(o.availability) }))
      .filter((o) => o.price);
    const best = priced.filter((o) => o.stock !== false).sort((a, b) => a.price - b.price)[0] ?? priced.sort((a, b) => a.price - b.price)[0];
    if (best) {
      price = best.price;
      inStock = priced.some((o) => o.stock !== false);
    }
    const img = [].concat(product.image ?? [])[0];
    image = typeof img === "string" ? img : (img?.url ?? null);
  }

  title ??= meta(html, "og:title") ?? decode(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? "") ?? null;
  price ??= toPrice(meta(html, "product:price:amount") ?? meta(html, "og:price:amount") ?? meta(html, "price"));
  inStock ??= inStockText(meta(html, "product:availability") ?? meta(html, "og:availability") ?? meta(html, "availability")) ?? true;
  image ??= meta(html, "og:image");
  if (htmlPrice) {
    const m = html.match(/class=["'][^"']*\bprice(?:-new)?\b[^"']*["'][^>]*>\s*(?:<[^>]+>\s*)*\$\s?([\d,]+(?:\.\d{2})?)/i);
    price ??= m ? toPrice(m[1]) : null;
    const stock = html.match(/Availability:\s*(?:<[^>]+>\s*)*([^<]+)/i);
    if (stock) inStock = inStockText(stock[1]);
  }

  if (!title || !price) return null;
  return { title, price, inStock, image };
}
