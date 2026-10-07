import Link from "next/link";
import { ProductGrid } from "@/components/ProductCard";
import { SampleBanner } from "@/components/SampleBanner";
import { CATEGORIES, categoryLabel, search, type Sort } from "@/lib/data";

type Params = { q?: string; category?: string; sort?: string; instock?: string };

export default async function SearchPage({ searchParams }: { searchParams: Promise<Params> }) {
  const { q = "", category, sort = "relevance", instock } = await searchParams;
  const results = search({ q, category, inStock: instock === "1", sort: sort as Sort });
  const heading = q ? `Results for “${q}”` : category ? categoryLabel(category) : "All products";

  return (
    <>
      <SampleBanner />
      <h1 className="mb-4 text-xl font-bold">{heading}</h1>
      <form className="mb-5 flex flex-wrap items-center gap-2 text-sm">
        {q && <input type="hidden" name="q" value={q} />}
        <select name="category" defaultValue={category ?? ""} className="rounded-lg border border-line bg-surface px-3 py-2">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <select name="sort" defaultValue={sort} className="rounded-lg border border-line bg-surface px-3 py-2">
          <option value="relevance">Best match</option>
          <option value="price">Lowest price</option>
          <option value="shops">Most shops</option>
        </select>
        <label className="flex items-center gap-2 px-2">
          <input type="checkbox" name="instock" value="1" defaultChecked={instock === "1"} />
          In stock only
        </label>
        <button className="rounded-lg bg-brand px-4 py-2 font-medium text-brand-ink">Apply</button>
      </form>
      <p className="mb-3 text-sm text-ink-2">
        {results.length} {results.length === 1 ? "product" : "products"}
      </p>
      {results.length ? (
        <ProductGrid products={results.slice(0, 200)} />
      ) : (
        <p className="text-ink-2">
          Nothing found. Try fewer words, or <Link href="/search" className="text-brand underline">browse everything</Link>.
        </p>
      )}
    </>
  );
}
