const TAMANOS = {
  grande: { caja: "h-24 w-16", vacio: "text-center text-[9px] leading-tight", texto: "sin portada" },
  media: { caja: "h-16 w-11", vacio: "text-center text-[8px] leading-tight", texto: "sin portada" },
  fila: { caja: "h-14 w-9", vacio: "text-[8px]", texto: "—" },
  miniatura: { caja: "h-12 w-8", vacio: "text-[8px]", texto: "—" },
} as const;

export function Portada({
  src,
  tamano,
}: {
  src: string;
  tamano: keyof typeof TAMANOS;
}) {
  const t = TAMANOS[tamano];
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" className={`${t.caja} shrink-0 border border-borde object-cover`} />
    );
  }
  return (
    <div
      className={`${t.caja} ${t.vacio} flex shrink-0 items-center justify-center border border-dashed border-borde text-apagado`}
    >
      {t.texto}
    </div>
  );
}
