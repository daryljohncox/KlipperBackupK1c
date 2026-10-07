import { status } from "@/lib/data";

export function SampleBanner() {
  if (!status.sample) return null;
  return (
    <p className="mb-4 rounded-lg border border-line bg-deal-soft px-4 py-2 text-sm">
      These are sample prices so you can see how the app works. Real prices from each shop
      appear after the first daily price collection runs.
    </p>
  );
}
