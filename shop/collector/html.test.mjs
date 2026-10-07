import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSitemap, parseRobots, isAllowed, parseProductPage } from "./html.mjs";

test("parseSitemap reads indexes and url lists", () => {
  const index = parseSitemap(
    `<sitemapindex><sitemap><loc>https://s.nz/xmlsitemap.php?type=products&amp;page=1</loc></sitemap></sitemapindex>`,
  );
  assert.deepEqual(index, { sitemaps: ["https://s.nz/xmlsitemap.php?type=products&page=1"], pages: [] });
  const list = parseSitemap(`<urlset><url>  <loc>https://s.nz/a</loc>  <lastmod>x</lastmod></url><url><loc>https://s.nz/b</loc></url></urlset>`);
  assert.deepEqual(list.pages, ["https://s.nz/a", "https://s.nz/b"]);
});

test("parseRobots keeps only the rules for every crawler", () => {
  const r = parseRobots(`User-agent: GPTBot
Disallow: /

User-agent: *
Disallow: /cart.php
Disallow: /*?page=$
Crawl-delay: 2

Sitemap: https://s.nz/sitemap.xml`);
  assert.deepEqual(r, { sitemaps: ["https://s.nz/sitemap.xml"], disallow: ["/cart.php", "/*?page=$"], crawlDelay: 2 });
  assert.equal(isAllowed("https://s.nz/pla-1kg", r.disallow), true);
  assert.equal(isAllowed("https://s.nz/cart.php?x=1", r.disallow), false);
  assert.equal(isAllowed("https://s.nz/filament?page=", r.disallow), false);
  assert.equal(isAllowed("https://s.nz/filament?page=2", r.disallow), true);
});

test("parseProductPage reads JSON-LD", () => {
  const html = `<html><head><script type="application/ld+json">
    {"@context":"https://schema.org","@graph":[{"@type":"BreadcrumbList"},{"@type":"Product","name":"eSun PLA+ White 1kg",
     "image":["https://s.nz/a.jpg"],"offers":{"@type":"Offer","price":"34.90","priceCurrency":"NZD","availability":"https://schema.org/InStock"}}]}
  </script></head></html>`;
  assert.deepEqual(parseProductPage(html), { title: "eSun PLA+ White 1kg", price: 34.9, inStock: true, image: "https://s.nz/a.jpg" });
});

test("parseProductPage falls back to meta tags", () => {
  const html = `<meta property="og:title" content="NextShapes PETG-HF 1kg Refill" />
    <meta property="product:price:amount" content="19.9" />
    <meta property="og:availability" content="oos" /><meta property="product:availability" content="out of stock" />
    <meta property="og:image" content="https://s.nz/b.jpg" />`;
  assert.deepEqual(parseProductPage(html), { title: "NextShapes PETG-HF 1kg Refill", price: 19.9, inStock: false, image: "https://s.nz/b.jpg" });
  assert.equal(parseProductPage(`<title>About us</title>`), null);
});
