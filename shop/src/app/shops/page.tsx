import { shops, status } from "@/lib/data";

export default function ShopsPage() {
  const byId = new Map(status.shops.map((s) => [s.id, s]));
  const when = new Date(status.collectedAt).toLocaleString("en-NZ", { dateStyle: "medium", timeStyle: "short" });
  return (
    <>
      <h1 className="mb-1 text-xl font-bold">Shops we compare</h1>
      <p className="mb-4 text-sm text-ink-2">
        {status.sample ? "Prices have not been collected yet." : `Prices last collected ${when}.`}
      </p>
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
        {shops.map((shop) => {
          const s = byId.get(shop.id);
          const state = !s
            ? shop.platform === "custom" ? "Coming soon" : "Waiting for first collection"
            : s.ok ? `${s.listings} products` : "Couldn't read prices last time";
          return (
            <li key={shop.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <a href={shop.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">
                {shop.name}
              </a>
              <span className={s && !s.ok ? "text-sm text-deal" : "text-sm text-ink-2"}>{state}</span>
            </li>
          );
        })}
      </ul>
    </>
  );
}
