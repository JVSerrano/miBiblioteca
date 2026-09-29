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
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
