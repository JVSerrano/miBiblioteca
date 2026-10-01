import type { InputHTMLAttributes } from "react";

export const claseInput =
  "w-full border-b border-borde bg-transparent py-1 text-sm text-tinta outline-none focus:border-azul";

// Etiqueta + input subrayado. `pequeno` es la variante de las cajas de ubicación.
export function Campo({
  id,
  etiqueta,
  pequeno = false,
  ...resto
}: { id: string; etiqueta: string; pequeno?: boolean } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label
        className={`mb-1 block ${pequeno ? "text-[10px] text-apagado" : "text-xs text-tinta-suave"}`}
        htmlFor={id}
      >
        {etiqueta}
      </label>
      <input id={id} type="text" className={claseInput} {...resto} />
    </div>
  );
}
