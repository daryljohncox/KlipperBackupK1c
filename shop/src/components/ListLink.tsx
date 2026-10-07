"use client";

import Link from "next/link";
import { useList } from "@/lib/list";

export function ListLink() {
  const count = useList().length;
  return (
    <Link href="/list" className="font-medium text-brand">
      My list{count > 0 && ` (${count})`}
    </Link>
  );
}
