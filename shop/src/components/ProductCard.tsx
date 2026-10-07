import Link from "next/link";
import { categoryLabel, formatPrice, type Product } from "@/lib/data";

export function ProductCard({ product, was }: { product: Product; was?: number }) {
  const inStockShops = product.offers.filter((o) => o.inStock).length;
  return (
    <Link
      href={`/product/${product.id}`}
      className="flex flex-col rounded-xl border border-line bg-surface p-3 transition hover:border-brand"
    >
      <div className="mb-3 flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-bg">
        {product.image ? (
          // Shop images come from many domains, so a plain img avoids per-domain config.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image} alt="" className="h-full w-full object-contain" loading="lazy" />
        ) : (
          <span className="text-xs text-ink-3">{categoryLabel(product.category)}</span>
        )}
      </div>
      <p className="line-clamp-2 text-sm font-medium">{product.name}</p>
      <div className="mt-auto pt-2">
        <p className="flex flex-wrap items-baseline gap-x-2 text-lg font-bold">
          {formatPrice(product.lowestPrice)}
          {was !== undefined && (
            <span className="text-sm font-normal text-ink-3 line-through">{formatPrice(was)}</span>
          )}
        </p>
        <p className="text-xs text-ink-2">
          {product.offers.length === 1
            ? "1 shop"
            : `Cheapest of ${product.offers.length} shops`}
          {inStockShops === 0 && " · out of stock"}
        </p>
      </div>
    </Link>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
