import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToListButton } from "@/components/AddToListButton";
import { PriceChart } from "@/components/PriceChart";
import { SampleBanner } from "@/components/SampleBanner";
import { categoryLabel, formatPrice, getProduct, lowestPriceHistory, shopName } from "@/lib/data";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = getProduct(id);
  if (!product) notFound();
  const cheapest = product.offers[0];
  const specs = [
    ["Brand", product.brand],
    ["Material", product.material],
    ["Colour", product.colour && product.colour[0].toUpperCase() + product.colour.slice(1)],
    ["Diameter", product.diameter ? `${product.diameter} mm` : null],
    ["Weight", product.weightGrams ? (product.weightGrams >= 1000 ? `${product.weightGrams / 1000} kg` : `${product.weightGrams} g`) : null],
  ].filter(([, v]) => v);

  return (
    <>
      <SampleBanner />
      <p className="mb-2 text-sm text-ink-2">
        <Link href={`/search?category=${product.category}`} className="hover:underline">
          {categoryLabel(product.category)}
        </Link>
      </p>
      <div className="grid gap-6 md:grid-cols-[280px_1fr]">
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-line bg-surface">
          {product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image} alt={product.name} className="h-full w-full object-contain" />
          ) : (
            <span className="text-sm text-ink-3">No photo</span>
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{product.name}</h1>
          <p className="mt-2 text-3xl font-bold text-brand">{formatPrice(product.lowestPrice)}</p>
          <p className="text-sm text-ink-2">
            {cheapest.inStock ? `Cheapest at ${shopName(cheapest.shopId)}` : "Out of stock everywhere"}
          </p>
          <div className="mt-4">
            <AddToListButton id={product.id} listingIds={product.offers.map((o) => o.listingId)} />
          </div>
          {specs.length > 0 && (
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              {specs.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-ink-2">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Prices at {product.offers.length} {product.offers.length === 1 ? "shop" : "shops"}</h2>
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {product.offers.map((o, i) => (
            <li key={o.listingId} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {shopName(o.shopId)}
                  {i === 0 && o.inStock && product.offers.length > 1 && (
                    <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand">Cheapest</span>
                  )}
                </p>
                <p className="truncate text-xs text-ink-3">{o.title}</p>
              </div>
              <p className={o.inStock ? "text-xs text-ink-2" : "text-xs text-deal"}>{o.inStock ? "In stock" : "Out of stock"}</p>
              <p className="w-24 text-right font-semibold">{formatPrice(o.price)}</p>
              <a
                href={o.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-brand-ink"
              >
                Go to shop
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 rounded-xl border border-line bg-surface p-4">
        <h2 className="mb-2 text-lg font-semibold">Lowest price over time</h2>
        <PriceChart series={lowestPriceHistory(product)} />
      </section>
    </>
  );
}
