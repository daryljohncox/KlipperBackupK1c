import productsJson from "../../data/products.json";
import historyJson from "../../data/history.json";
import statusJson from "../../data/status.json";
import shopsJson from "../../collector/shops.json";
import {
  detectColour,
  detectDiameter,
  detectMaterial,
  detectWeightGrams,
} from "../../collector/normalize.mjs";

export const APP_NAME = "3dPriceCompareNZ";

export type Offer = {
  listingId: string;
  shopId: string;
  title: string;
  price: number;
  inStock: boolean;
  url: string;
};

export type Product = {
  id: string;
  name: string;
  category: Category;
  brand: string | null;
  material: string | null;
  colour: string | null;
  weightGrams: number | null;
  diameter: string | null;
  image: string | null;
  lowestPrice: number;
  offers: Offer[];
};

export type Shop = { id: string; name: string; url: string; platform: string };
export type ShopStatus = { id: string; ok: boolean; platform?: string; listings?: number; error?: string };
export type Status = { collectedAt: string; sample: boolean; shops: ShopStatus[] };

export const CATEGORIES = [
  { id: "filament", label: "Filament", emoji: "🧵" },
  { id: "resin", label: "Resin", emoji: "🧪" },
  { id: "printer", label: "Printers", emoji: "🖨️" },
  { id: "parts", label: "Spare parts", emoji: "🔧" },
  { id: "accessories", label: "Accessories", emoji: "🧰" },
  { id: "post-processing", label: "Post-processing", emoji: "🧽" },
] as const;
export type Category = (typeof CATEGORIES)[number]["id"];

// Re-read attributes from every shop's title, so detection improvements apply
// without waiting for the next price collection.
function withAttributes(p: Product): Product {
  const titles = [p.name, ...p.offers.map((o) => o.title)];
  const first = <T,>(detect: (t: string) => T | null) =>
    titles.map(detect).find((v) => v !== null && v !== undefined) ?? null;
  return {
    ...p,
    material: first(detectMaterial),
    colour: first(detectColour),
    weightGrams: first(detectWeightGrams),
    diameter: first(detectDiameter),
  };
}

export const products = (productsJson as unknown as Product[]).map(withAttributes);
export const history = historyJson as unknown as Record<string, [string, number][]>;
export const status = statusJson as unknown as Status;
export const shops = shopsJson as Shop[];

const shopById = new Map(shops.map((s) => [s.id, s]));
export const shopName = (id: string) => shopById.get(id)?.name ?? id;

export function categoryLabel(id: string) {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export function getProduct(id: string) {
  return products.find((p) => p.id === id);
}

export type Sort = "relevance" | "price" | "shops";

export type Filters = {
  q?: string;
  category?: string;
  inStock?: boolean;
  brand?: string;
  material?: string;
  colour?: string;
  weight?: string;
  diameter?: string;
};

export const FACETS = [
  { key: "brand", label: "Brand" },
  { key: "material", label: "Type" },
  { key: "colour", label: "Colour" },
  { key: "weight", label: "Roll size" },
  { key: "diameter", label: "Diameter" },
] as const;
export type FacetKey = (typeof FACETS)[number]["key"];

function facetValue(p: Product, key: FacetKey): string | null {
  if (key === "weight") return p.weightGrams ? String(p.weightGrams) : null;
  return p[key];
}

export function facetLabel(key: FacetKey, value: string) {
  if (key === "weight") {
    const g = Number(value);
    return g >= 1000 ? `${g / 1000} kg` : `${g} g`;
  }
  if (key === "diameter") return `${value} mm`;
  if (key === "colour") return value[0].toUpperCase() + value.slice(1);
  return value;
}

function matches(p: Product, f: Filters, skip?: FacetKey) {
  if (f.category && p.category !== f.category) return false;
  if (f.inStock && !p.offers.some((o) => o.inStock)) return false;
  for (const { key } of FACETS) {
    if (key === skip) continue;
    const want = f[key];
    if (want && facetValue(p, key) !== want) return false;
  }
  const words = (f.q ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const text = [p.name, p.brand, p.material, p.colour, ...p.offers.map((o) => o.title)]
    .join(" ")
    .toLowerCase();
  return words.every((w) => text.includes(w));
}

export function search(f: Filters & { sort?: Sort }) {
  let results = products.filter((p) => matches(p, f));
  if (f.sort === "price") results = [...results].sort((a, b) => a.lowestPrice - b.lowestPrice);
  if (f.sort === "shops") results = [...results].sort((a, b) => b.offers.length - a.offers.length);
  return results;
}

// Options for each filter, counted against the other active filters.
export function facetOptions(f: Filters) {
  return FACETS.map(({ key, label }) => {
    const counts = new Map<string, number>();
    for (const p of products) {
      if (!matches(p, f, key)) continue;
      const v = facetValue(p, key);
      if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    const options = [...counts]
      .sort((a, b) =>
        key === "weight" || key === "diameter" ? Number(a[0]) - Number(b[0]) : b[1] - a[1] || a[0].localeCompare(b[0]),
      )
      .map(([value, count]) => ({ value, count, label: facetLabel(key, value) }));
    return { key, label, options };
  });
}

// Lowest price across all shops for each day we have data, for the chart.
export function lowestPriceHistory(product: Product): [string, number][] {
  const byDate = new Map<string, number>();
  const dates = new Set<string>();
  for (const o of product.offers) for (const [d] of history[o.listingId] ?? []) dates.add(d);
  for (const d of [...dates].sort()) {
    let low = Infinity;
    for (const o of product.offers) {
      // Price on day d = the latest recorded price on or before d.
      const points = history[o.listingId] ?? [];
      let price: number | undefined;
      for (const [pd, pp] of points) if (pd <= d) price = pp;
      if (price !== undefined) low = Math.min(low, price);
    }
    if (low !== Infinity) byDate.set(d, low);
  }
  return [...byDate];
}

// Products whose cheapest offer dropped the most (in %) over the last week.
export function priceDrops(limit = 6) {
  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);
  const drops: { product: Product; was: number; pct: number }[] = [];
  for (const p of products) {
    const series = lowestPriceHistory(p);
    if (series.length < 2) continue;
    const before = series.filter(([d]) => d <= weekAgo).at(-1) ?? series[0];
    const was = before[1];
    const now = series.at(-1)![1];
    if (now < was) drops.push({ product: p, was, pct: (was - now) / was });
  }
  return drops.sort((a, b) => b.pct - a.pct).slice(0, limit);
}

const nzd = new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD" });
export const formatPrice = (n: number) => nzd.format(n);
