import { test } from "node:test";
import assert from "node:assert/strict";
import {
  categorize, detectBrand, detectMaterial, detectWeightGrams, detectColour,
  matchKey, groupProducts, updateHistory,
} from "./normalize.mjs";

test("categorize", () => {
  assert.equal(categorize("Sandstone WoolyFil rPLA, Recycled PLA with NZ wool, 1kg"), "filament");
  assert.equal(categorize("Bambu Lab PETG HF Black 1kg"), "filament");
  assert.equal(categorize("Elegoo Standard Resin 2.0 Grey 1kg"), "resin");
  assert.equal(categorize("Formlabs Resin Pump (Form 4)"), "parts");
  assert.equal(categorize("Hardened Steel Nozzle 0.4mm for Bambu Lab"), "parts");
  assert.equal(categorize("Bambu Lab P1S Combo"), "printer");
  assert.equal(categorize("Creality Ender-3 V3 SE"), "printer");
  assert.equal(categorize("Elegoo Mercury Plus Wash and Cure 2.0"), "post-processing");
  assert.equal(categorize("Sunlu Filament Dryer S2"), "accessories");
  assert.equal(categorize("Arduino Uno R3"), null);
});

test("attribute detection", () => {
  assert.equal(detectMaterial("Polymaker PLA-CF Black 500g"), "PLA-CF");
  assert.equal(detectMaterial("eSun PLA+ White 1kg"), "PLA+");
  assert.equal(detectMaterial("Bambu Lab PETG HF Black 1kg"), "PETG");
  assert.equal(detectWeightGrams("Polymaker PLA 1kg"), 1000);
  assert.equal(detectWeightGrams("Polymaker PLA 750 g"), 750);
  assert.equal(detectColour("eSun PLA+ Gray 1kg"), "grey");
  assert.equal(detectBrand("eSun PLA+ White 1kg", "Makershop", "Makershop"), "eSun");
  assert.equal(detectBrand("PLA White 1kg", "Makershop", "Makershop"), null);
  assert.equal(detectBrand("PLA White 1kg", "esun", "Makershop"), "eSun");
});

test("same spool from two shops shares a match key", () => {
  const a = matchKey({ title: "eSun PLA+ Filament 1.75mm White 1kg", brand: "eSun", category: "filament" });
  const b = matchKey({ title: "ESUN PLA+ 1KG - White", brand: "eSun", category: "filament" });
  assert.equal(a, b);
  const c = matchKey({ title: "ESUN PLA+ 1KG - Black", brand: "eSun", category: "filament" });
  assert.notEqual(a, c);
});

test("groupProducts keeps the cheapest in-stock offer per shop, cheapest first", () => {
  const base = { category: "filament", brand: "eSun", matchKey: "k", image: null };
  const products = groupProducts([
    { ...base, id: "a:1", shopId: "a", title: "eSun PLA+ White 1kg", price: 40, inStock: true, url: "u1" },
    { ...base, id: "a:2", shopId: "a", title: "eSun PLA+ White 1kg (2)", price: 35, inStock: false, url: "u2" },
    { ...base, id: "b:1", shopId: "b", title: "eSun PLA+ 1kg White", price: 37, inStock: true, url: "u3" },
  ]);
  assert.equal(products.length, 1);
  assert.deepEqual(products[0].offers.map((o) => o.listingId), ["b:1", "a:1"]);
  assert.equal(products[0].lowestPrice, 37);
});

test("updateHistory records only changes", () => {
  let h = updateHistory({}, [{ id: "a:1", price: 40 }], "2026-10-01");
  h = updateHistory(h, [{ id: "a:1", price: 40 }], "2026-10-02");
  h = updateHistory(h, [{ id: "a:1", price: 35 }], "2026-10-03");
  assert.deepEqual(h["a:1"], [["2026-10-01", 40], ["2026-10-03", 35]]);
});
