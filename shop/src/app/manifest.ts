import type { MetadataRoute } from "next";
import { APP_NAME } from "@/lib/data";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: `${APP_NAME}: 3D printing prices in NZ`,
    short_name: APP_NAME,
    description:
      "Compare prices on 3D printers, filament, resin and parts across New Zealand shops.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f7f5",
    theme_color: "#0f7a4a",
    lang: "en-NZ",
    categories: ["shopping", "utilities"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
