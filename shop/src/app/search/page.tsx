import Link from "next/link";
import { ProductGrid } from "@/components/ProductCard";
import { SampleBanner } from "@/components/SampleBanner";
import {
  CATEGORIES,
  categoryLabel,
  facetOptions,
  search,
  type FacetKey,
  type Filters,
  type Sort,
} from "@/lib/data";

type Params = Partial<Record<"q" | "category" | "sort" | "instock" | FacetKey, string>>;

// Which filters make sense for each kind of product.
const FACETS_FOR: Record<string, FacetKey[]> = {
  filament: ["material", "weight", "colour", "brand", "diameter"],
  resin: ["brand", "colour", "weight"],
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const { q = "", category, sort = "relevance", instock } = params;
  const filters: Filters = {
    q,
    category,
    inStock: instock === "1",
    brand: params.brand,
    material: params.material,
    colour: params.colour,
    weight: params.weight,
    diameter: params.diameter,
  };
  const results = search({ ...filters, sort: sort as Sort });
  const shown = FACETS_FOR[category ?? ""] ?? ["brand"];
  const facets = facetOptions(filters).filter(
    (f) => shown.includes(f.key) && (f.options.length > 1 || filters[f.key]),
  );
  const active = facets.filter((f) => filters[f.key]);
  const heading = q ? `Results for “${q}”` : category ? categoryLabel(category) : "All products";
  const select = "min-w-0 rounded-lg border border-line bg-surface px-3 py-2";

  return (
    <>
      <SampleBanner />
      <h1 className="mb-4 text-xl font-bold">{heading}</h1>
      <form className="mb-5 grid grid-cols-2 gap-2 text-sm sm:flex sm:flex-wrap sm:items-center">
        {q && <input type="hidden" name="q" value={q} />}
        <select name="category" defaultValue={category ?? ""} className={select} aria-label="Category">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        {facets.map((f) => (
          <select key={f.key} name={f.key} defaultValue={filters[f.key] ?? ""} className={select} aria-label={f.label}>
            <option value="">Any {f.label.toLowerCase()}</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label} ({o.count})
              </option>
            ))}
          </select>
        ))}
        <select name="sort" defaultValue={sort} className={select} aria-label="Sort">
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
      {category && !FACETS_FOR[category] && (
        <p className="-mt-3 mb-4 text-xs text-ink-3">Pick Filament or Resin to filter by type, colour and roll size.</p>
      )}
      <p className="mb-3 flex flex-wrap items-center gap-2 text-sm text-ink-2">
        {results.length} {results.length === 1 ? "product" : "products"}
        {active.length > 0 && (
          <Link
            href={`/search?${new URLSearchParams({ ...(q && { q }), ...(category && { category }) })}`}
            className="text-brand underline"
          >
            Clear filters
          </Link>
        )}
      </p>
      {results.length ? (
        <ProductGrid products={results.slice(0, 200)} />
      ) : (
        <p className="text-ink-2">
          Nothing found. Try fewer words or filters, or{" "}
          <Link href="/search" className="text-brand underline">
            browse everything
          </Link>
          .
        </p>
      )}
    </>
  );
}
