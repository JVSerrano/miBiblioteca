"use client";

import { useEffect, useRef, useState } from "react";
import { lora } from "@/lib/fuentes";
import { buscarLibro, buscarLibros, coincidenciaClara, type LibroNormalizado } from "@/lib/googleBooks";
import { CAMPOS_VACIOS, type CamposLibro } from "@/lib/libros";
import { Cabecera } from "./Cabecera";
import { Campo } from "./Campo";
import { Pagina } from "./Pagina";
import { Portada } from "./Portada";

type EstadoBusqueda = "inactivo" | "buscando" | "sin-resultado" | "error";
type EstadoGuardado = "inactivo" | "guardando" | "guardado" | "error";

interface Props {
  subtitulo: string;
  textoGuardar: string;
  inicial?: CamposLibro;
  // "lista": ofrece varios resultados a elegir (alta). "directa": aplica el primero (edición).
  modoBusqueda: "lista" | "directa";
  // Debe lanzar si falla el guardado.
  onGuardar: (campos: CamposLibro) => Promise<void>;
  // Si se indica, tras guardar se muestra y el formulario se vacía para dar de alta otro libro.
  mensajeGuardado?: string;
}

export function FormularioLibro({
  subtitulo,
  textoGuardar,
  inicial = CAMPOS_VACIOS,
  modoBusqueda,
  onGuardar,
  mensajeGuardado,
}: Props) {
  const [campos, setCampos] = useState<CamposLibro>(inicial);
  const [resultados, setResultados] = useState<LibroNormalizado[]>([]);
  const [estadoBusqueda, setEstadoBusqueda] = useState<EstadoBusqueda>("inactivo");
  const [estadoGuardado, setEstadoGuardado] = useState<EstadoGuardado>("inactivo");
  const buscadorRef = useRef<HTMLDivElement>(null);

  const cambiar = (cambios: Partial<CamposLibro>) => setCampos((c) => ({ ...c, ...cambios }));
  const enCampo = (campo: keyof CamposLibro) => ({
    value: campos[campo],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => cambiar({ [campo]: e.target.value }),
  });

  function cerrarResultados() {
    setResultados([]);
    setEstadoBusqueda("inactivo");
  }

  useEffect(() => {
    function cerrarSiClickFuera(e: MouseEvent) {
      if (buscadorRef.current?.contains(e.target as Node)) return;
      setResultados([]);
      setEstadoBusqueda((actual) => (actual === "buscando" ? actual : "inactivo"));
    }
    document.addEventListener("mousedown", cerrarSiClickFuera);
    return () => document.removeEventListener("mousedown", cerrarSiClickFuera);
  }, []);

  function aplicarResultado(r: LibroNormalizado) {
    setCampos((c) => ({
      ...c,
      titulo: r.titulo || c.titulo,
      autor: r.autor,
      editorial: r.editorial,
      isbn: r.isbn,
      portada: r.portada,
    }));
    cerrarResultados();
  }

  async function handleBuscar() {
    const titulo = campos.titulo;
    if (!titulo.trim()) return;
    setEstadoBusqueda("buscando");
    setResultados([]);
    try {
      if (modoBusqueda === "directa") {
        const resultado = await buscarLibro(titulo);
        if (!resultado) return setEstadoBusqueda("sin-resultado");
        return aplicarResultado(resultado);
      }
      const encontrados = await buscarLibros(titulo, 5);
      if (encontrados.length === 0) return setEstadoBusqueda("sin-resultado");
      const clara = coincidenciaClara(encontrados, titulo);
      if (clara) return aplicarResultado(clara);
      setResultados(encontrados);
      setEstadoBusqueda("inactivo");
    } catch {
      setEstadoBusqueda("error");
    }
  }

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    if (!campos.titulo.trim()) return;

    setEstadoGuardado("guardando");
    try {
      await onGuardar(campos);
      setEstadoGuardado("guardado");
      if (mensajeGuardado) {
        setCampos(CAMPOS_VACIOS);
        cerrarResultados();
      }
    } catch {
      setEstadoGuardado("error");
    }
  }

  return (
    <Pagina>
      <form
        onSubmit={handleGuardar}
        className="w-full max-w-md border border-borde bg-papel px-7 pb-7 pt-6 shadow-[4px_4px_0_0_var(--color-borde)]"
      >
        <Cabecera subtitulo={subtitulo} />

        <label className="mb-1 block text-xs text-tinta-suave" htmlFor="titulo">
          Título
        </label>
        <div ref={buscadorRef} className="relative mb-4 flex gap-2">
          <input
            id="titulo"
            type="text"
            required
            value={campos.titulo}
            onChange={(e) => {
              cambiar({ titulo: e.target.value });
              cerrarResultados();
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") cerrarResultados();
            }}
            placeholder="Ej. Cien años de soledad"
            className="w-full border-b border-borde bg-transparent py-1 text-sm text-tinta outline-none focus:border-azul"
          />
          <button
            type="button"
            onClick={handleBuscar}
            disabled={!campos.titulo.trim() || estadoBusqueda === "buscando"}
            className="shrink-0 border border-azul px-3 text-xs text-azul transition-colors hover:bg-azul hover:text-papel disabled:cursor-not-allowed disabled:opacity-40"
          >
            {estadoBusqueda === "buscando" ? "Buscando…" : "Buscar"}
          </button>

          {resultados.length > 0 && (
            <ul
              role="listbox"
              aria-label="Resultados de la búsqueda"
              className="absolute left-0 right-0 top-full z-10 mt-1 max-h-80 overflow-y-auto border border-azul bg-papel shadow-[3px_3px_0_0_var(--color-borde)]"
            >
              {resultados.map((r, i) => (
                <li key={`${r.isbn}-${i}`} role="option" aria-selected="false">
                  <button
                    type="button"
                    onClick={() => aplicarResultado(r)}
                    className="flex w-full items-center gap-3 border-b border-borde px-3 py-2 text-left last:border-b-0 hover:bg-fondo focus:bg-fondo focus:outline-none"
                  >
                    <Portada src={r.portada} tamano="miniatura" />
                    <span className="min-w-0">
                      <span className={`${lora.className} block truncate text-sm text-tinta`}>
                        {r.titulo || "Sin título"}
                      </span>
                      <span className="block truncate text-[11px] text-tinta-suave">
                        {[r.autor, r.editorial].filter(Boolean).join(" · ") || "Sin datos"}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {estadoBusqueda === "sin-resultado" && (
          <p className="-mt-2 mb-4 text-xs text-rojo">
            No se encontró en Google Books. Puedes rellenar los datos a mano.
          </p>
        )}
        {estadoBusqueda === "error" && (
          <p className="-mt-2 mb-4 text-xs text-rojo">
            No se pudo consultar Google Books ahora mismo. Rellena los datos a mano si quieres.
          </p>
        )}

        <div className="mb-4 flex gap-4">
          <Portada src={campos.portada} tamano="grande" />
          <div className="flex-1 space-y-3">
            <Campo id="autor" etiqueta="Autor" {...enCampo("autor")} />
            <Campo
              id="editorial"
              etiqueta="Editorial"
              value={campos.editorial}
              // El ISBN depende de la edición: si cambia la editorial, el anterior ya no vale.
              onChange={(e) => cambiar({ editorial: e.target.value, isbn: "" })}
            />
          </div>
        </div>

        <div className="mb-5">
          <Campo id="isbn" etiqueta="ISBN" {...enCampo("isbn")} />
        </div>

        <div className="mb-6 border border-borde p-3">
          <p className="mb-2 text-xs text-tinta-suave">Ubicación en la estantería</p>
          <div className="flex gap-4">
            <div className="flex-1">
              <Campo id="balda" etiqueta="Balda" pequeno type="number" inputMode="numeric" {...enCampo("balda")} />
            </div>
            <div className="flex-1">
              <Campo id="columna" etiqueta="Columna" pequeno type="number" inputMode="numeric" {...enCampo("columna")} />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={!campos.titulo.trim() || estadoGuardado === "guardando"}
          className="w-full border-2 border-azul bg-azul py-2 text-sm font-medium tracking-wide text-papel transition-colors hover:bg-azul-oscuro disabled:cursor-not-allowed disabled:opacity-40"
        >
          {estadoGuardado === "guardando" ? "Guardando…" : textoGuardar}
        </button>

        {estadoGuardado === "guardado" && mensajeGuardado && (
          <p className="mt-3 text-center text-xs text-azul">{mensajeGuardado}</p>
        )}
        {estadoGuardado === "error" && (
          <p className="mt-3 text-center text-xs text-rojo">No se pudo guardar. Inténtalo de nuevo.</p>
        )}
      </form>
    </Pagina>
  );
}
