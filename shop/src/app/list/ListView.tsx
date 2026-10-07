"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Offer, Product } from "@/lib/data";
import { clearList, relink, removeFromList, setQty, useList, type ListItem } from "@/lib/list";

type ApiOffer = Offer & { shopName: string };
type ApiProduct = Omit<Product, "offers"> & { offers: ApiOffer[] };

const nzd = new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD" });
const price = (n: number) => nzd.format(n);

function resolve(item: ListItem, found: ApiProduct[]) {
  return (
    found.find((p) => p.id === item.id) ??
    found.find((p) => p.offers.some((o) => item.listingIds.includes(o.listingId)))
  );
}

export function ListView() {
  const items = useList();
  const [found, setFound] = useState<ApiProduct[] | null>(null);
  const [failed, setFailed] = useState(false);
  const key = items.map((i) => i.id).join(",");

  useEffect(() => {
    if (!items.length) return setFound([]);
    const params = new URLSearchParams({
      ids: items.map((i) => i.id).join(","),
      listings: items.flatMap((i) => i.listingIds).join(","),
    });
    fetch(`/api/products?${params}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: ApiProduct[]) => {
        setFound(data);
        setFailed(false);
        for (const item of items) {
          const p = resolve(item, data);
          if (p && p.id !== item.id) relink(item.id, p.id, p.offers.map((o) => o.listingId));
        }
      })
      .catch(() => setFailed(true));
    // Only refetch when the set of items changes, not on quantity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const rows = useMemo(
    () => items.map((item) => ({ item, product: found ? resolve(item, found) : undefined })),
    [items, found],
  );

  const summary = useMemo(() => {
    const listed = rows.filter((r) => r.product);
    // Cheapest mix: every item from whichever shop has it cheapest.
    let mixTotal = 0;
    const mixByShop = new Map<string, { shopName: string; count: number; total: number }>();
    // Per shop: how many items it has in stock, and their total.
    const perShop = new Map<string, { shopName: string; count: number; total: number }>();
    for (const { item, product } of listed) {
      const offers = product!.offers.filter((o) => o.inStock);
      if (!offers.length) continue;
      const best = offers.reduce((a, b) => (b.price < a.price ? b : a));
      mixTotal += best.price * item.qty;
      const m = mixByShop.get(best.shopId) ?? { shopName: best.shopName, count: 0, total: 0 };
      mixByShop.set(best.shopId, { ...m, count: m.count + 1, total: m.total + best.price * item.qty });
      for (const o of offers) {
        const s = perShop.get(o.shopId) ?? { shopName: o.shopName, count: 0, total: 0 };
        perShop.set(o.shopId, { ...s, count: s.count + 1, total: s.total + o.price * item.qty });
      }
    }
    return {
      inStockCount: listed.filter((r) => r.product!.offers.some((o) => o.inStock)).length,
      mixTotal,
      mixByShop: [...mixByShop.values()].sort((a, b) => b.total - a.total),
      perShop: [...perShop.values()].sort((a, b) => b.count - a.count || a.total - b.total),
    };
  }, [rows]);

  if (!items.length) {
    return (
      <div className="rounded-xl border border-line bg-surface p-6 text-center">
        <p className="font-medium">Your list is empty</p>
        <p className="mt-1 text-sm text-ink-2">
          Tap <span className="font-bold text-brand">+</span> on any product to add it. Your list is saved on
          this device, so it&apos;s here next time you open the app.
        </p>
        <Link href="/search?category=filament" className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-ink">
          Browse filament
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_300px]">
      <section>
        {failed && <p className="mb-3 text-sm text-deal">Couldn&apos;t load the latest prices. Check your connection and refresh.</p>}
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {rows.map(({ item, product }) => {
            const best = product?.offers.find((o) => o.inStock) ?? product?.offers[0];
            return (
              <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1 basis-48">
                  {product ? (
                    <Link href={`/product/${product.id}`} className="line-clamp-2 font-medium hover:underline">
                      {product.name}
                    </Link>
                  ) : (
                    <p className="text-ink-3">{found ? "No longer listed by any shop" : "Loading…"}</p>
                  )}
                  {best && (
                    <p className="text-xs text-ink-2">
                      {best.inStock ? `Cheapest at ${best.shopName}` : "Out of stock everywhere"}
                      {product!.offers.length > 1 && ` · ${product!.offers.length} shops`}
                    </p>
                  )}
                </div>
                <div className="flex items-center rounded-lg border border-line">
                  <button type="button" onClick={() => setQty(item.id, item.qty - 1)} className="px-3 py-1" aria-label="One fewer">
                    −
                  </button>
                  <span className="w-6 text-center text-sm">{item.qty}</span>
                  <button type="button" onClick={() => setQty(item.id, item.qty + 1)} className="px-3 py-1" aria-label="One more">
                    +
                  </button>
                </div>
                <p className="w-24 text-right font-semibold">{best ? price(best.price * item.qty) : ""}</p>
                <button type="button" onClick={() => removeFromList(item.id)} className="text-xs text-ink-3 underline">
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
        <button type="button" onClick={() => confirm("Remove everything from your list?") && clearList()} className="mt-3 text-xs text-ink-3 underline">
          Clear list
        </button>
      </section>

      <aside className="space-y-4">
        <div className="rounded-xl border border-line bg-surface p-4">
          <h2 className="font-semibold">Cheapest way to buy</h2>
          <p className="mt-1 text-2xl font-bold text-brand">{price(summary.mixTotal)}</p>
          <p className="text-xs text-ink-2">
            {summary.inStockCount} of {items.length} items in stock, each from its cheapest shop
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            {summary.mixByShop.map((s) => (
              <li key={s.shopName} className="flex justify-between gap-2">
                <span>
                  {s.shopName} <span className="text-ink-3">({s.count} {s.count === 1 ? "item" : "items"})</span>
                </span>
                <span>{price(s.total)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-line bg-surface p-4">
          <h2 className="font-semibold">By shop</h2>
          <p className="text-xs text-ink-2">How much of your list each shop has in stock</p>
          <ul className="mt-3 space-y-1 text-sm">
            {summary.perShop.map((s) => (
              <li key={s.shopName} className="flex justify-between gap-2">
                <span>
                  {s.shopName}{" "}
                  <span className="text-ink-3">
                    {s.count}/{items.length}
                  </span>
                </span>
                <span>{price(s.total)}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-ink-3">
          Your list is saved on this device and browser. Prices update every day.
        </p>
      </aside>
    </div>
  );
}
