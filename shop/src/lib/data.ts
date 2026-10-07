import productsJson from "../../data/products.json";
import historyJson from "../../data/history.json";
import statusJson from "../../data/status.json";
import shopsJson from "../../collector/shops.json";

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

export const products = productsJson as unknown as Product[];
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

export function search({
  q = "",
  category,
  inStock = false,
  sort = "relevance",
}: {
  q?: string;
  category?: string;
  inStock?: boolean;
  sort?: Sort;
}) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  let results = products.filter((p) => {
    if (category && p.category !== category) return false;
    if (inStock && !p.offers.some((o) => o.inStock)) return false;
    const text = [p.name, p.brand, p.material, p.colour, ...p.offers.map((o) => o.title)]
      .join(" ")
      .toLowerCase();
    return words.every((w) => text.includes(w));
  });
  if (sort === "price") results = [...results].sort((a, b) => a.lowestPrice - b.lowestPrice);
  if (sort === "shops") results = [...results].sort((a, b) => b.offers.length - a.offers.length);
  return results;
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
