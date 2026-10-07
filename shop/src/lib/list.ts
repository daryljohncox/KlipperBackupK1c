"use client";

import { useSyncExternalStore } from "react";

// The list lives in this browser's storage, so it is still there next time
// on the same phone or computer. No account needed.
export type ListItem = { id: string; listingIds: string[]; qty: number };

const KEY = "3dpc-list-v1";
const EVENT = "3dpc-list-change";
const EMPTY: ListItem[] = [];

let cachedRaw: string | null = null;
let cached: ListItem[] = EMPTY;

function read(): ListItem[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  if (raw === cachedRaw) return cached;
  cachedRaw = raw;
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    cached = Array.isArray(parsed) ? parsed : EMPTY;
  } catch {
    cached = EMPTY;
  }
  return cached;
}

function write(items: ListItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // Storage blocked (private mode): the list just won't be kept.
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useList() {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function addToList(id: string, listingIds: string[]) {
  const items = read();
  if (items.some((i) => i.id === id)) return;
  write([...items, { id, listingIds, qty: 1 }]);
}

export function removeFromList(id: string) {
  write(read().filter((i) => i.id !== id));
}

export function setQty(id: string, qty: number) {
  if (qty < 1) return removeFromList(id);
  write(read().map((i) => (i.id === id ? { ...i, qty } : i)));
}

// Product ids can change when matching improves; keep the saved item pointing at
// the product that now holds one of its shop listings.
export function relink(oldId: string, newId: string, listingIds: string[]) {
  write(read().map((i) => (i.id === oldId ? { ...i, id: newId, listingIds } : i)));
}

export function clearList() {
  write([]);
}
