import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mi biblioteca",
    short_name: "Mi biblioteca",
    description: "Listado y gestión de tu colección de libros.",
    start_url: "/",
    display: "standalone",
    background_color: "#E3DFD3",
    theme_color: "#8C3B2E",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
