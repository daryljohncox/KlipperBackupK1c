// Pure helpers that turn a raw shop listing into something comparable across shops.
// Kept free of network code so they can be unit tested.

const BRANDS = [
  "Bambu Lab", "Polymaker", "eSun", "Elegoo", "Creality", "Sunlu", "Prusament", "KiwiFil",
  "Anycubic", "Overture", "Jayo", "Kingroon", "Siraya Tech", "Formlabs", "Phrozen", "Flashforge",
  "Fiberlogy", "ColorFabb", "Spectrum", "Eryone", "Prusa", "Qidi", "Snapmaker", "Voron", "Sovol",
  "Artillery", "Geeetech", "Hatchbox", "Inland", "Raise3D", "Ultimaker", "Elas", "WoolyFil",
];

// Longest names first so "PLA-CF" wins over "PLA".
const MATERIALS = [
  "PETG-CF", "PLA-CF", "PA-CF", "PET-CF", "ABS-GF", "Silk PLA", "Matte PLA", "PLA+", "PLA Pro", "rPLA",
  "PETG", "PLA", "ABS", "ASA", "TPU", "PVA", "HIPS", "PC", "PA", "Nylon", "PEEK",
];

const COLOURS = [
  "black", "white", "grey", "gray", "silver", "red", "orange", "yellow", "green", "blue", "purple",
  "pink", "brown", "beige", "gold", "bronze", "copper", "transparent", "clear", "natural", "cyan",
  "magenta", "teal", "navy", "olive", "ivory", "sandstone", "marble", "rainbow", "glow",
];

export const CATEGORIES = ["filament", "resin", "printer", "parts", "post-processing", "accessories"];

const RE = {
  filament: /filament|\bpla\b|pla\+|\brpla\b|\bpetg\b|\babs\b|\basa\b|\btpu\b|\bpva\b|\bhips\b|nylon|-cf\b/i,
  spoolSize: /\d+(\.\d+)?\s?(kg|g)\b|1\.75|2\.85/i,
  resin: /\bresin\b/i,
  resinNotConsumable: /\b(vat|tank|pump|printer|cartridge holder)\b/i,
  parts: /nozzle|hot ?end|extruder|\bbelt|\bfan\b|thermistor|heater|build plate|\bplate\b|\bpei\b|\bfep\b|\blcd\b|screen|bearing|spring|stepper|motor|mainboard|sensor|wheel|\bptfe\b|bowden|heat ?break|\bvat\b|resin tank|pump|spare|replacement|cutter|wiper/i,
  printer: /printer|\bx1c?\b|\bx1e\b|\bp1[sp]\b|\bp2s\b|\bh2d\b|\ba1( mini)?\b|ender[- ]?\d|\bk1\b|\bk2\b|form [34]\b|\bmars\b|saturn|photon|adventurer|\bmk4s?\b|core one/i,
  post: /wash|cure|\bipa\b|isopropyl|sandpaper|\bglue\b|\bpaint\b|primer/i,
  accessory: /3d|print|filament|spool|dryer|enclosure|\bams\b|\bcfs\b|nozzle|build/i,
};

export function categorize(title, productType = "") {
  const text = `${title} ${productType}`;
  if (RE.filament.test(text) && RE.spoolSize.test(text) && !RE.parts.test(title)) return "filament";
  if (RE.resin.test(text) && !RE.resinNotConsumable.test(title)) return "resin";
  if (RE.post.test(title)) return "post-processing";
  if (RE.parts.test(title)) return "parts";
  if (RE.printer.test(title)) return "printer";
  if (RE.accessory.test(text)) return "accessories";
  return null;
}

export function detectBrand(title, vendor, shopName) {
  const t = title.toLowerCase();
  const found = BRANDS.find((b) => t.includes(b.toLowerCase()));
  if (found) return found;
  if (vendor && vendor.toLowerCase() !== shopName.toLowerCase()) {
    const v = BRANDS.find((b) => b.toLowerCase() === vendor.toLowerCase());
    return v ?? vendor.trim();
  }
  return null;
}

export function detectMaterial(title) {
  for (const m of MATERIALS) {
    const pattern = new RegExp(`(^|[^a-z])${m.replace(/[+]/g, "\\+").replace(/ /g, "[ -]?")}($|[^a-z])`, "i");
    if (pattern.test(title)) return m;
  }
  return null;
}

export function detectWeightGrams(title) {
  const m = title.match(/(\d+(?:\.\d+)?)\s?(kg|g)\b/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return Math.round(m[2].toLowerCase() === "kg" ? n * 1000 : n);
}

export function detectColour(title) {
  const t = title.toLowerCase();
  const found = COLOURS.find((c) => new RegExp(`\\b${c}\\b`).test(t));
  if (!found) return null;
  return found === "gray" ? "grey" : found === "clear" ? "transparent" : found;
}

const STOPWORDS = new Set(["the", "and", "for", "with", "a", "of", "in", "nz", "new", "-", "–", "|"]);

export function titleKey(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9.+ ]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !STOPWORDS.has(w))
    .sort()
    .join(" ");
}

// Listings with the same key are treated as the same product sold by different shops.
export function matchKey({ title, brand, category }) {
  if (category === "filament" || category === "resin") {
    const material = detectMaterial(title);
    const colour = detectColour(title);
    const weight = detectWeightGrams(title);
    if (brand && material && colour && weight) {
      return [category, brand.toLowerCase(), material.toLowerCase(), colour, weight].join("|");
    }
  }
  return `${category}|${titleKey(title)}`;
}

export function attributes(title) {
  return {
    material: detectMaterial(title),
    colour: detectColour(title),
    weightGrams: detectWeightGrams(title),
  };
}

// FNV-1a: short, stable ids for URLs.
export function hashId(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

// Groups listings from every shop into comparable products, cheapest offer first.
export function groupProducts(listings) {
  const groups = new Map();
  for (const l of listings) {
    const key = l.matchKey;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(l);
  }
  const products = [];
  for (const [key, items] of groups) {
    // One offer per shop: the cheapest in-stock one, else the cheapest.
    const byShop = new Map();
    for (const l of items) {
      const cur = byShop.get(l.shopId);
      const better =
        !cur ||
        (l.inStock && !cur.inStock) ||
        (l.inStock === cur.inStock && l.price < cur.price);
      if (better) byShop.set(l.shopId, l);
    }
    const offers = [...byShop.values()].sort(
      (a, b) => Number(b.inStock) - Number(a.inStock) || a.price - b.price,
    );
    // Prefer a normally-cased title, then the shortest.
    const shouty = (t) => (t.replace(/[^A-Z]/g, "").length > t.replace(/[^a-z]/g, "").length ? 1 : 0);
    const name = items.map((l) => l.title).sort((a, b) => shouty(a) - shouty(b) || a.length - b.length)[0];
    const first = offers[0];
    products.push({
      id: hashId(key),
      name,
      category: first.category,
      brand: first.brand,
      ...attributes(name),
      image: offers.find((o) => o.image)?.image ?? null,
      lowestPrice: Math.min(...offers.filter((o) => o.inStock).map((o) => o.price), Infinity),
      offers: offers.map(({ id, shopId, title, price, inStock, url }) => ({
        listingId: id, shopId, title, price, inStock, url,
      })),
    });
  }
  for (const p of products) {
    if (p.lowestPrice === Infinity) p.lowestPrice = Math.min(...p.offers.map((o) => o.price));
  }
  return products.sort((a, b) => b.offers.length - a.offers.length || a.name.localeCompare(b.name));
}

// Appends today's price for each listing when it changed, keeping a year of points.
export function updateHistory(history, listings, date) {
  const next = { ...history };
  for (const l of listings) {
    const points = next[l.id] ? [...next[l.id]] : [];
    const last = points[points.length - 1];
    if (!last || last[1] !== l.price) {
      if (last && last[0] === date) points.pop();
      points.push([date, l.price]);
    }
    next[l.id] = points.slice(-365);
  }
  return next;
}
