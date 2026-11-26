import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Uchibatake · our family's field",
    short_name: "Uchibatake",
    description: "Grow a little food for the people you love.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F4F0E6",
    theme_color: "#F4F0E6",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
