import type { Metadata } from "next";
import { APP_NAME } from "@/lib/data";
import { ListView } from "./ListView";

export const metadata: Metadata = { title: `My list · ${APP_NAME}` };

export default function ListPage() {
  return (
    <>
      <h1 className="mb-4 text-xl font-bold">My list</h1>
      <ListView />
    </>
  );
}
