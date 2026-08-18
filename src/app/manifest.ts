import type { MetadataRoute } from "next";

const APP_BACKGROUND = "#070605";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Poker Nights",
    short_name: "Poker Nights",
    description: "Track buyins, cashouts, and payouts for home poker games",
    start_url: "/dashboard",
    display: "standalone",
    background_color: APP_BACKGROUND,
    theme_color: APP_BACKGROUND,
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
