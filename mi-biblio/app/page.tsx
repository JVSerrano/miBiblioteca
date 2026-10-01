"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { lora } from "@/lib/fuentes";
import { textoUbicacion } from "@/lib/libros";
import { Pagina, Mensaje } from "./componentes/Pagina";
import { Portada } from "./componentes/Portada";
import { DialogoEliminar } from "./componentes/DialogoEliminar";

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
    <Pagina centrarVertical={false}>
      <div className="w-full max-w-2xl">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3 border-b-2 border-rojo/40 pb-3">
          <h1 className={`${lora.className} text-xl font-semibold text-tinta`}>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="cursor-pointer"
            >
              Mi biblioteca
            </button>
          </h1>
          <div className="flex gap-2">
            <Link
              href="/volcado"
              className="shrink-0 border border-azul px-2 py-1 text-xs text-azul transition-colors hover:bg-azul hover:text-papel"
            >
              Dictar varios
            </Link>
            <Link
              href="/nuevo"
              className="shrink-0 border border-rojo px-2 py-1 text-xs text-rojo transition-colors hover:bg-rojo hover:text-papel"
            >
              + Añadir libro
            </Link>
          </div>
        </div>

        <div className="mb-6 flex gap-4 border border-borde bg-papel p-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-tinta-suave" htmlFor="filtro-titulo">
              Título
            </label>
            <input
              id="filtro-titulo"
              type="text"
              value={filtroTitulo}
              onChange={(e) => setFiltroTitulo(e.target.value)}
              placeholder="Buscar por título"
              className="w-full border-b border-borde bg-transparent py-1 text-sm text-tinta outline-none focus:border-azul"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs text-tinta-suave" htmlFor="filtro-autor">
              Autor
            </label>
            <input
              id="filtro-autor"
              type="text"
              value={filtroAutor}
              onChange={(e) => setFiltroAutor(e.target.value)}
              placeholder="Buscar por autor"
              className="w-full border-b border-borde bg-transparent py-1 text-sm text-tinta outline-none focus:border-azul"
            />
          </div>
        </div>

        {estadoCarga === "cargando" && (
          <p className="text-center"><Mensaje>Cargando la estantería…</Mensaje></p>
        )}
        {estadoCarga === "error" && (
          <p className="text-center text-xs text-rojo">
            No se pudo cargar la biblioteca. Inténtalo de nuevo más tarde.
          </p>
        )}
        {estadoCarga === "listo" && librosFiltrados.length === 0 && (
          <p className="text-center text-xs text-apagado">
            {libros.length === 0
              ? "Todavía no hay libros dados de alta."
              : "Ningún libro coincide con el filtro."}
          </p>
        )}

        {estadoCarga === "listo" && librosFiltrados.length > 0 && (
          <ul className="divide-y divide-borde border border-borde bg-papel">
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
                  className="relative flex items-center gap-3 px-3 pb-2 pt-3"
                >
                  <Portada src={libro.portada} tamano="media" />
                  <div className="min-w-0 flex-1">
                    <p className={`${lora.className} truncate text-sm font-semibold text-tinta`}>
                      {libro.titulo || "Sin título"}
                    </p>
                    <div className="mt-0.5 flex items-baseline justify-between gap-2">
                      <p className="min-w-0 truncate text-xs text-tinta-suave">{libro.autor || "Autor desconocido"}</p>
                      <span className="shrink-0 text-[10px] tracking-wide text-azul">
                        {textoUbicacion(libro.balda, libro.columna)}
                      </span>
                    </div>
                  </div>

                  {accionesVisibles ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <Link
                      href={`/editar?id=${libro.id}`}
                      className="border border-azul px-2 py-1 text-[10px] text-azul transition-colors hover:bg-azul hover:text-papel"
                    >
                      Editar
                    </Link>
                    <button
                      type="button"
                      onClick={() => setLibroAEliminar(libro)}
                      className="border border-rojo px-2 py-1 text-[10px] text-rojo transition-colors hover:bg-rojo hover:text-papel"
                    >
                      Eliminar
                    </button>
                  </div>
                  ) : (
                  <button
                    type="button"
                    onClick={() => setFilaActiva(libro.id)}
                    aria-label="Más acciones"
                    className="shrink-0 cursor-pointer px-1 text-sm text-apagado transition-colors hover:text-tinta"
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
        <DialogoEliminar
          titulo={libroAEliminar.titulo}
          borrando={borrando}
          onCancelar={() => setLibroAEliminar(null)}
          onConfirmar={confirmarEliminar}
        />
      )}
    </Pagina>
  );
}
