import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { SearchBox } from "@/components/SearchBox";
import { APP_NAME } from "@/lib/data";

export const metadata: Metadata = {
  title: `${APP_NAME}: compare 3D printing prices across NZ`,
  description:
    "Free price comparison for 3D printers, filament, resin and parts across New Zealand shops.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-NZ">
      <body className="min-h-screen antialiased">
        <header className="sticky top-0 z-10 border-b border-line bg-surface">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
            <Link href="/" className="text-lg font-bold text-brand">
              {APP_NAME}
            </Link>
            <div className="order-last w-full sm:order-none sm:w-auto sm:flex-1">
              <SearchBox />
            </div>
            <nav className="ml-auto flex gap-4 text-sm text-ink-2">
              <Link href="/search">Browse</Link>
              <Link href="/shops">Shops</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 pb-10 pt-4 text-xs text-ink-3">
          Prices in NZD including GST, collected daily from each shop&apos;s website. Always check
          the final price on the shop&apos;s site before buying.
        </footer>
      </body>
    </html>
  );
}
