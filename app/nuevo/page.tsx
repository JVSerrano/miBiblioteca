"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Lora, IBM_Plex_Mono } from "next/font/google";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { buscarLibros, coincidenciaClara, type LibroNormalizado } from "@/lib/googleBooks";

const lora = Lora({ subsets: ["latin"], weight: ["500", "600"] });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"] });

type EstadoBusqueda = "inactivo" | "buscando" | "encontrado" | "sin-resultado" | "error";
type EstadoGuardado = "inactivo" | "guardando" | "guardado" | "error";

export default function NuevoLibroPage() {
  const [titulo, setTitulo] = useState("");
  const [autor, setAutor] = useState("");
  const [editorial, setEditorial] = useState("");
  const [isbn, setIsbn] = useState("");
  const [portada, setPortada] = useState("");
  const [balda, setBalda] = useState("");
  const [columna, setColumna] = useState("");

  const [resultados, setResultados] = useState<LibroNormalizado[]>([]);
  const [estadoBusqueda, setEstadoBusqueda] = useState<EstadoBusqueda>("inactivo");
  const [estadoGuardado, setEstadoGuardado] = useState<EstadoGuardado>("inactivo");

  const buscadorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function cerrarSiClickFuera(e: MouseEvent) {
      if (buscadorRef.current?.contains(e.target as Node)) return;
      setResultados([]);
      setEstadoBusqueda((actual) => (actual === "buscando" ? actual : "inactivo"));
    }
    document.addEventListener("mousedown", cerrarSiClickFuera);
    return () => document.removeEventListener("mousedown", cerrarSiClickFuera);
  }, []);

  async function handleBuscar() {
    if (!titulo.trim()) return;
    setEstadoBusqueda("buscando");
    setResultados([]);
    try {
      const encontrados = await buscarLibros(titulo, 5);
      if (encontrados.length === 0) {
        setEstadoBusqueda("sin-resultado");
        return;
      }
      const clara = coincidenciaClara(encontrados, titulo);
      if (clara) {
        elegirResultado(clara);
        return;
      }
      setResultados(encontrados);
      setEstadoBusqueda("encontrado");
    } catch {
      setEstadoBusqueda("error");
    }
  }

  function elegirResultado(r: LibroNormalizado) {
    setTitulo(r.titulo || titulo);
    setAutor(r.autor);
    setEditorial(r.editorial);
    setIsbn(r.isbn);
    setPortada(r.portada);
    setResultados([]);
    setEstadoBusqueda("inactivo");
  }

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) return;

    setEstadoGuardado("guardando");
    try {
      await addDoc(collection(db, "libros"), {
        titulo: titulo.trim(),
        autor,
        editorial,
        isbn,
        portada,
        balda: balda.trim() ? Number(balda) : null,
        columna: columna.trim() ? Number(columna) : null,
        fechaAlta: serverTimestamp(),
      });
      setEstadoGuardado("guardado");
      setTitulo("");
      setAutor("");
      setEditorial("");
      setIsbn("");
      setPortada("");
      setBalda("");
      setColumna("");
      setResultados([]);
      setEstadoBusqueda("inactivo");
    } catch {
      setEstadoGuardado("error");
    }
  }

  return (
    <div
      className={`${plexMono.className} flex flex-1 items-center justify-center bg-[#E3DFD3] px-4 py-12`}
    >
      <form
        onSubmit={handleGuardar}
        className="w-full max-w-md border border-[#C9BFA5] bg-[#F7F4EC] px-7 pb-7 pt-6 shadow-[4px_4px_0_0_#C9BFA5]"
      >
        <div className="mb-5 flex items-baseline justify-between border-b-2 border-[#8C3B2E]/40 pb-3">
          <Link
            href="/"
            className={`${lora.className} text-xl font-semibold text-[#2B2A28] transition-colors hover:text-[#8C3B2E]`}
          >
            Mi biblioteca
          </Link>
          <span className="text-[10px] tracking-wide text-[#8C3B2E]/70">
            ficha nueva
          </span>
        </div>

        <label className="mb-1 block text-xs text-[#5B5748]" htmlFor="titulo">
          Título
        </label>
        <div ref={buscadorRef} className="relative mb-4 flex gap-2">
          <input
            id="titulo"
            type="text"
            required
            value={titulo}
            onChange={(e) => {
              setTitulo(e.target.value);
              setResultados([]);
              setEstadoBusqueda("inactivo");
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setResultados([]);
                setEstadoBusqueda("inactivo");
              }
            }}
            placeholder="Ej. Cien años de soledad"
            className="w-full border-b border-[#C9BFA5] bg-transparent py-1 text-sm text-[#2B2A28] outline-none focus:border-[#2F4858]"
          />
          <button
            type="button"
            onClick={handleBuscar}
            disabled={!titulo.trim() || estadoBusqueda === "buscando"}
            className="shrink-0 border border-[#2F4858] px-3 text-xs text-[#2F4858] transition-colors hover:bg-[#2F4858] hover:text-[#F7F4EC] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {estadoBusqueda === "buscando" ? "Buscando…" : "Buscar"}
          </button>

          {resultados.length > 0 && (
            <ul
              role="listbox"
              aria-label="Resultados de la búsqueda"
              className="absolute left-0 right-0 top-full z-10 mt-1 max-h-80 overflow-y-auto border border-[#2F4858] bg-[#F7F4EC] shadow-[3px_3px_0_0_#C9BFA5]"
            >
              {resultados.map((r, i) => (
                <li key={`${r.isbn}-${i}`} role="option" aria-selected="false">
                  <button
                    type="button"
                    onClick={() => elegirResultado(r)}
                    className="flex w-full items-center gap-3 border-b border-[#C9BFA5] px-3 py-2 text-left last:border-b-0 hover:bg-[#E3DFD3] focus:bg-[#E3DFD3] focus:outline-none"
                  >
                    {r.portada ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.portada}
                        alt=""
                        className="h-12 w-8 shrink-0 border border-[#C9BFA5] object-cover"
                      />
                    ) : (
                      <span className="flex h-12 w-8 shrink-0 items-center justify-center border border-dashed border-[#C9BFA5] text-[8px] text-[#9A927C]">
                        —
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className={`${lora.className} block truncate text-sm text-[#2B2A28]`}>
                        {r.titulo || "Sin título"}
                      </span>
                      <span className="block truncate text-[11px] text-[#5B5748]">
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
          <p className="mb-4 -mt-2 text-xs text-[#8C3B2E]">
            No se encontró en Google Books. Puedes rellenar los datos a mano.
          </p>
        )}
        {estadoBusqueda === "error" && (
          <p className="mb-4 -mt-2 text-xs text-[#8C3B2E]">
            No se pudo consultar Google Books ahora mismo. Rellena los datos a mano si quieres.
          </p>
        )}

        <div className="mb-4 flex gap-4">
          {portada ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={portada}
              alt=""
              className="h-24 w-16 shrink-0 border border-[#C9BFA5] object-cover"
            />
          ) : (
            <div className="flex h-24 w-16 shrink-0 items-center justify-center border border-dashed border-[#C9BFA5] text-center text-[9px] leading-tight text-[#9A927C]">
              sin portada
            </div>
          )}

          <div className="flex-1 space-y-3">
            <div>
              <label className="mb-1 block text-xs text-[#5B5748]" htmlFor="autor">
                Autor
              </label>
              <input
                id="autor"
                type="text"
                value={autor}
                onChange={(e) => setAutor(e.target.value)}
                className="w-full border-b border-[#C9BFA5] bg-transparent py-1 text-sm text-[#2B2A28] outline-none focus:border-[#2F4858]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#5B5748]" htmlFor="editorial">
                Editorial
              </label>
              <input
                id="editorial"
                type="text"
                value={editorial}
                onChange={(e) => {
                  setEditorial(e.target.value);
                  setIsbn("");
                }}
                className="w-full border-b border-[#C9BFA5] bg-transparent py-1 text-sm text-[#2B2A28] outline-none focus:border-[#2F4858]"
              />
            </div>
          </div>
        </div>

        <div className="mb-5">
          <label className="mb-1 block text-xs text-[#5B5748]" htmlFor="isbn">
            ISBN
          </label>
          <input
            id="isbn"
            type="text"
            value={isbn}
            onChange={(e) => setIsbn(e.target.value)}
            className="w-full border-b border-[#C9BFA5] bg-transparent py-1 text-sm text-[#2B2A28] outline-none focus:border-[#2F4858]"
          />
        </div>

        <div className="mb-6 border border-[#C9BFA5] p-3">
          <p className="mb-2 text-xs text-[#5B5748]">Ubicación en la estantería</p>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-[10px] text-[#9A927C]" htmlFor="balda">
                Balda
              </label>
              <input
                id="balda"
                type="number"
                inputMode="numeric"
                value={balda}
                onChange={(e) => setBalda(e.target.value)}
                className="w-full border-b border-[#C9BFA5] bg-transparent py-1 text-sm text-[#2B2A28] outline-none focus:border-[#2F4858]"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-[10px] text-[#9A927C]" htmlFor="columna">
                Columna
              </label>
              <input
                id="columna"
                type="number"
                inputMode="numeric"
                value={columna}
                onChange={(e) => setColumna(e.target.value)}
                className="w-full border-b border-[#C9BFA5] bg-transparent py-1 text-sm text-[#2B2A28] outline-none focus:border-[#2F4858]"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={!titulo.trim() || estadoGuardado === "guardando"}
          className="w-full border-2 border-[#2F4858] bg-[#2F4858] py-2 text-sm font-medium tracking-wide text-[#F7F4EC] transition-colors hover:bg-[#25394544] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {estadoGuardado === "guardando" ? "Guardando…" : "Guardar en la balda"}
        </button>

        {estadoGuardado === "guardado" && (
          <p className="mt-3 text-center text-xs text-[#2F4858]">
            Libro archivado. Ya puedes dar de alta el siguiente.
          </p>
        )}
        {estadoGuardado === "error" && (
          <p className="mt-3 text-center text-xs text-[#8C3B2E]">
            No se pudo guardar. Inténtalo de nuevo.
          </p>
        )}
      </form>
    </div>
  );
}
