import { lora } from "@/lib/fuentes";

export function DialogoEliminar({
  titulo,
  borrando,
  onCancelar,
  onConfirmar,
}: {
  titulo: string;
  borrando: boolean;
  onCancelar: () => void;
  onConfirmar: () => void;
}) {
  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-tinta/50 px-4">
      <div className="w-full max-w-sm border border-borde bg-papel p-5 shadow-[4px_4px_0_0_var(--color-borde)]">
        <p className={`${lora.className} mb-2 text-base font-semibold text-tinta`}>¿Eliminar libro?</p>
        <p className="mb-5 text-sm text-tinta-suave">
          Se eliminará «{titulo || "Sin título"}» de forma definitiva.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancelar}
            disabled={borrando}
            className="border border-borde px-3 py-1 text-xs text-tinta-suave transition-colors hover:bg-borde/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            disabled={borrando}
            className="border border-rojo bg-rojo px-3 py-1 text-xs text-papel transition-colors hover:bg-rojo-oscuro disabled:cursor-not-allowed disabled:opacity-40"
          >
            {borrando ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}
