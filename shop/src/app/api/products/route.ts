import { NextResponse, type NextRequest } from "next/server";
import { products, shopName } from "@/lib/data";

// Looks up saved list items by product id, or by any of their shop listings
// when the product id has changed since the item was saved.
export function GET(req: NextRequest) {
  const split = (k: string) => (req.nextUrl.searchParams.get(k) ?? "").split(",").filter(Boolean).slice(0, 200);
  const ids = new Set(split("ids"));
  const listings = new Set(split("listings"));
  const found = products.filter(
    (p) => ids.has(p.id) || p.offers.some((o) => listings.has(o.listingId)),
  );
  return NextResponse.json(
    found.map((p) => ({
      ...p,
      offers: p.offers.map((o) => ({ ...o, shopName: shopName(o.shopId) })),
    })),
  );
}
