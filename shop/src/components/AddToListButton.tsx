"use client";

import { addToList, removeFromList, useList } from "@/lib/list";

export function AddToListButton({
  id,
  listingIds,
  compact = false,
}: {
  id: string;
  listingIds: string[];
  compact?: boolean;
}) {
  const inList = useList().some((i) => i.id === id);
  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inList) removeFromList(id);
    else addToList(id, listingIds);
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-pressed={inList}
        aria-label={inList ? "Remove from my list" : "Add to my list"}
        title={inList ? "Remove from my list" : "Add to my list"}
        className={`flex h-9 w-9 items-center justify-center rounded-full border text-lg font-bold shadow-sm ${
          inList ? "border-brand bg-brand text-brand-ink" : "border-line bg-surface text-brand"
        }`}
      >
        {inList ? "✓" : "+"}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={inList}
      className={`rounded-lg border px-4 py-2 text-sm font-medium ${
        inList ? "border-brand bg-brand-soft text-brand" : "border-brand bg-brand text-brand-ink"
      }`}
    >
      {inList ? "✓ In my list (tap to remove)" : "+ Add to my list"}
    </button>
  );
}
