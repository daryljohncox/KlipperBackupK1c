import Link from "next/link";
import { ProductCard, ProductGrid } from "@/components/ProductCard";
import { SampleBanner } from "@/components/SampleBanner";
import { CATEGORIES, priceDrops, products } from "@/lib/data";

export default function Home() {
  const drops = priceDrops();
  const mostCompared = [...products].sort((a, b) => b.offers.length - a.offers.length).slice(0, 8);

  return (
    <>
      <SampleBanner />
      <section className="mb-8">
        <h1 className="text-2xl font-bold">Find the cheapest 3D printing gear in NZ</h1>
        <p className="mt-1 text-ink-2">
          Compare filament, resin, printers and parts across New Zealand shops. Free, no sign-up.
        </p>
      </section>

      <section className="mb-8 grid grid-cols-3 gap-3 sm:grid-cols-6">
        {CATEGORIES.map((c) => (
          <Link
            key={c.id}
            href={`/search?category=${c.id}`}
            className="flex flex-col items-center gap-1 rounded-xl border border-line bg-surface p-3 text-center text-sm hover:border-brand"
          >
            <span className="text-2xl" aria-hidden>
              {c.emoji}
            </span>
            {c.label}
          </Link>
        ))}
      </section>

      {drops.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">Price drops this week</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {drops.map(({ product, was }) => (
              <ProductCard key={product.id} product={product} was={was} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Most compared</h2>
        <ProductGrid products={mostCompared} />
      </section>
    </>
  );
}
