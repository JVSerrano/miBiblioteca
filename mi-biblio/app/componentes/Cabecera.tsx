import Link from "next/link";
import { lora } from "@/lib/fuentes";

export function Cabecera({ subtitulo }: { subtitulo: string }) {
  return (
    <div className="mb-5 flex items-baseline justify-between border-b-2 border-rojo/40 pb-3">
      <Link
        href="/"
        className={`${lora.className} text-xl font-semibold text-tinta transition-colors hover:text-rojo`}
      >
        Mi biblioteca
      </Link>
      <span className="text-[10px] tracking-wide text-rojo/70">{subtitulo}</span>
    </div>
  );
}
