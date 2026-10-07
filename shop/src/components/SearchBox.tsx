export function SearchBox({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <form action="/search" role="search" className="flex">
      <label htmlFor="q" className="sr-only">
        Search products
      </label>
      <input
        id="q"
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="Search filament, printers, nozzles…"
        className="w-full rounded-l-full border border-line bg-bg px-4 py-2 text-sm outline-none focus:border-brand"
      />
      <button
        type="submit"
        className="rounded-r-full bg-brand px-4 text-sm font-medium text-brand-ink"
      >
        Search
      </button>
    </form>
  );
}
