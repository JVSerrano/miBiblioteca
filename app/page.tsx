"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Lora, IBM_Plex_Mono } from "next/font/google";
import { collection, getDocs } from "firebase/firestore";
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
            {librosFiltrados.map((libro) => (
              <li key={libro.id} className="flex items-center gap-4 p-3">
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
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
