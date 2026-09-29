"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Lora, IBM_Plex_Mono } from "next/font/google";
import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

const lora = Lora({ subsets: ["latin"], weight: ["500", "600"] });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"] });

type Libro = {
  id: string;
  titulo: string;
  autor: string;
  portada: string;
  balda: number | null;
  columna: number | null;
};

type EstadoCarga = "cargando" | "listo" | "error";

function useDebounced(valor: string, retrasoMs: number) {
  const [debounced, setDebounced] = useState(valor);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(valor), retrasoMs);
    return () => clearTimeout(id);
  }, [valor, retrasoMs]);

  return debounced;
}

function ubicacion(balda: number | null, columna: number | null) {
  if (balda === null && columna === null) return "sin colocar";
  return `Balda ${balda ?? "?"} · Columna ${columna ?? "?"}`;
}

export default function ListadoLibrosPage() {
  const [libros, setLibros] = useState<Libro[]>([]);
  const [estadoCarga, setEstadoCarga] = useState<EstadoCarga>("cargando");

  const [filtroTitulo, setFiltroTitulo] = useState("");
  const [filtroAutor, setFiltroAutor] = useState("");
  const tituloDebounced = useDebounced(filtroTitulo, 300);
  const autorDebounced = useDebounced(filtroAutor, 300);

  const [filaActiva, setFilaActiva] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [libroAEliminar, setLibroAEliminar] = useState<Libro | null>(null);
  const [borrando, setBorrando] = useState(false);

  async function confirmarEliminar() {
    if (!libroAEliminar) return;
    setBorrando(true);
    try {
      await deleteDoc(doc(db, "libros", libroAEliminar.id));
      setLibros((actuales) => actuales.filter((l) => l.id !== libroAEliminar.id));
      setFilaActiva(null);
      setLibroAEliminar(null);
    } catch {
      // El diálogo permanece abierto para que el usuario pueda reintentar.
    } finally {
      setBorrando(false);
    }
  }

  useEffect(() => {
    if (!filaActiva) return;
    function cerrarSiFuera(e: MouseEvent | TouchEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-fila-libro]")) {
        setFilaActiva(null);
      }
    }
    document.addEventListener("mousedown", cerrarSiFuera);
    document.addEventListener("touchstart", cerrarSiFuera);
    return () => {
      document.removeEventListener("mousedown", cerrarSiFuera);
      document.removeEventListener("touchstart", cerrarSiFuera);
    };
  }, [filaActiva]);

  function iniciarPulsacionLarga(id: string) {
    longPressTimer.current = setTimeout(() => setFilaActiva(id), 500);
  }

  function cancelarPulsacionLarga() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  useEffect(() => {
    async function cargar() {
      try {
        const snapshot = await getDocs(collection(db, "libros"));
        setLibros(
          snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              titulo: data.titulo ?? "",
              autor: data.autor ?? "",
              portada: data.portada ?? "",
              balda: data.balda ?? null,
              columna: data.columna ?? null,
            };
          })
        );
        setEstadoCarga("listo");
      } catch {
        setEstadoCarga("error");
      }
    }
    cargar();
  }, []);

  const librosFiltrados = libros.filter((libro) => {
    const coincideTitulo = libro.titulo
      .toLowerCase()
      .includes(tituloDebounced.trim().toLowerCase());
    const coincideAutor = libro.autor
      .toLowerCase()
      .includes(autorDebounced.trim().toLowerCase());
    return coincideTitulo && coincideAutor;
  });

  return (
    <div
      className={`${plexMono.className} flex flex-1 justify-center bg-[#E3DFD3] px-4 py-12`}
    >
      <div className="w-full max-w-2xl">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3 border-b-2 border-[#8C3B2E]/40 pb-3">
          <h1 className={`${lora.className} text-xl font-semibold text-[#2B2A28]`}>
            Mi biblioteca
          </h1>
          <Link
            href="/nuevo"
            className="shrink-0 border border-[#8C3B2E] px-2 py-1 text-xs text-[#8C3B2E] transition-colors hover:bg-[#8C3B2E] hover:text-[#F7F4EC]"
          >
            + Añadir libro
          </Link>
        </div>

        <div className="mb-6 flex gap-4 border border-[#C9BFA5] bg-[#F7F4EC] p-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-[#5B5748]" htmlFor="filtro-titulo">
              Título
            </label>
            <input
              id="filtro-titulo"
              type="text"
              value={filtroTitulo}
              onChange={(e) => setFiltroTitulo(e.target.value)}
              placeholder="Buscar por título"
              className="w-full border-b border-[#C9BFA5] bg-transparent py-1 text-sm text-[#2B2A28] outline-none focus:border-[#2F4858]"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs text-[#5B5748]" htmlFor="filtro-autor">
              Autor
            </label>
            <input
              id="filtro-autor"
              type="text"
              value={filtroAutor}
              onChange={(e) => setFiltroAutor(e.target.value)}
              placeholder="Buscar por autor"
              className="w-full border-b border-[#C9BFA5] bg-transparent py-1 text-sm text-[#2B2A28] outline-none focus:border-[#2F4858]"
            />
          </div>
        </div>

        {estadoCarga === "cargando" && (
          <p className="text-center text-xs text-[#9A927C]">Cargando la estantería…</p>
        )}
        {estadoCarga === "error" && (
          <p className="text-center text-xs text-[#8C3B2E]">
            No se pudo cargar la biblioteca. Inténtalo de nuevo más tarde.
          </p>
        )}
        {estadoCarga === "listo" && librosFiltrados.length === 0 && (
          <p className="text-center text-xs text-[#9A927C]">
            {libros.length === 0
              ? "Todavía no hay libros dados de alta."
              : "Ningún libro coincide con el filtro."}
          </p>
        )}

        {estadoCarga === "listo" && librosFiltrados.length > 0 && (
          <ul className="divide-y divide-[#C9BFA5] border border-[#C9BFA5] bg-[#F7F4EC]">
            {librosFiltrados.map((libro) => {
              const accionesVisibles = filaActiva === libro.id;
              return (
                <li
                  key={libro.id}
                  data-fila-libro
                  onTouchStart={() => iniciarPulsacionLarga(libro.id)}
                  onTouchEnd={cancelarPulsacionLarga}
                  onTouchCancel={cancelarPulsacionLarga}
                  onTouchMove={cancelarPulsacionLarga}
                  onMouseLeave={() => {
                    if (filaActiva === libro.id) setFilaActiva(null);
                  }}
                  className="relative flex items-center gap-4 p-3"
                >
                  {libro.portada ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={libro.portada}
                      alt=""
                      className="h-16 w-11 shrink-0 border border-[#C9BFA5] object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-11 shrink-0 items-center justify-center border border-dashed border-[#C9BFA5] text-center text-[8px] leading-tight text-[#9A927C]">
                      sin portada
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={`${lora.className} truncate text-sm font-semibold text-[#2B2A28]`}>
                      {libro.titulo || "Sin título"}
                    </p>
                    <p className="truncate text-xs text-[#5B5748]">{libro.autor || "Autor desconocido"}</p>
                  </div>
                  <span className="shrink-0 text-[10px] tracking-wide text-[#2F4858]">
                    {ubicacion(libro.balda, libro.columna)}
                  </span>

                  {accionesVisibles ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <Link
                      href={`/editar/${libro.id}`}
                      className="border border-[#2F4858] px-2 py-1 text-[10px] text-[#2F4858] transition-colors hover:bg-[#2F4858] hover:text-[#F7F4EC]"
                    >
                      Editar
                    </Link>
                    <button
                      type="button"
                      onClick={() => setLibroAEliminar(libro)}
                      className="border border-[#8C3B2E] px-2 py-1 text-[10px] text-[#8C3B2E] transition-colors hover:bg-[#8C3B2E] hover:text-[#F7F4EC]"
                    >
                      Eliminar
                    </button>
                  </div>
                  ) : (
                  <button
                    type="button"
                    onClick={() => setFilaActiva(libro.id)}
                    aria-label="Más acciones"
                    className="shrink-0 px-1 text-sm text-[#9A927C] transition-colors hover:text-[#2B2A28]" 
                    style = {{cursor: "pointer"}}
                  >
                    ⋮
                  </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {libroAEliminar && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-[#2B2A28]/50 px-4">
          <div className="w-full max-w-sm border border-[#C9BFA5] bg-[#F7F4EC] p-5 shadow-[4px_4px_0_0_#C9BFA5]">
            <p className={`${lora.className} mb-2 text-base font-semibold text-[#2B2A28]`}>
              ¿Eliminar libro?
            </p>
            <p className="mb-5 text-sm text-[#5B5748]">
              Se eliminará «{libroAEliminar.titulo || "Sin título"}» de forma definitiva.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setLibroAEliminar(null)}
                disabled={borrando}
                className="border border-[#C9BFA5] px-3 py-1 text-xs text-[#5B5748] transition-colors hover:bg-[#C9BFA5]/30 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarEliminar}
                disabled={borrando}
                className="border border-[#8C3B2E] bg-[#8C3B2E] px-3 py-1 text-xs text-[#F7F4EC] transition-colors hover:bg-[#732E24] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {borrando ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
