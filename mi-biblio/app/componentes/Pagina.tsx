import type { ReactNode } from "react";
import { plexMono } from "@/lib/fuentes";

// Fondo de papel a pantalla completa. `centrarVertical` es para pantallas de
// una sola tarjeta (formularios, mensajes); el listado arranca arriba.
export function Pagina({
  children,
  centrarVertical = true,
}: {
  children: ReactNode;
  centrarVertical?: boolean;
}) {
  return (
    <div
      className={`${plexMono.className} flex flex-1 justify-center bg-fondo px-4 py-12 ${
        centrarVertical ? "items-center" : ""
      }`}
    >
      {children}
    </div>
  );
}

export function Mensaje({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return <p className={`text-xs ${error ? "text-rojo" : "text-apagado"}`}>{children}</p>;
}
