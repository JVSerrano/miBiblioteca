"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lora, IBM_Plex_Mono } from "next/font/google";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { buscarLibro } from "@/lib/googleBooks";

const lora = Lora({ subsets: ["latin"], weight: ["500", "600"] });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"] });

type EstadoBusqueda = "inactivo" | "buscando" | "encontrado" | "sin-resultado" | "error";
type EstadoGuardado = "inactivo" | "guardando" | "guardado" | "error";
type EstadoCarga = "cargando" | "listo" | "error";

export default function EditarLibroPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [estadoCarga, setEstadoCarga] = useState<EstadoCarga>("cargando");

  const [titulo, setTitulo] = useState("");
  const [autor, setAutor] = useState("");
  const [editorial, setEditorial] = useState("");
  const [isbn, setIsbn] = useState("");
  const [portada, setPortada] = useState("");
  const [balda, setBalda] = useState("");
  const [columna, setColumna] = useState("");

  const [estadoBusqueda, setEstadoBusqueda] = useState<EstadoBusqueda>("inactivo");
  const [estadoGuardado, setEstadoGuardado] = useState<EstadoGuardado>("inactivo");

  useEffect(() => {
    async function cargar() {
      try {
        const snapshot = await getDoc(doc(db, "libros", id));
        if (!snapshot.exists()) {
          setEstadoCarga("error");
          return;
        }
        const data = snapshot.data();
        setTitulo(data.titulo ?? "");
        setAutor(data.autor ?? "");
        setEditorial(data.editorial ?? "");
        setIsbn(data.isbn ?? "");
        setPortada(data.portada ?? "");
        setBalda(data.balda != null ? String(data.balda) : "");
        setColumna(data.columna != null ? String(data.columna) : "");
        setEstadoCarga("listo");
      } catch {
        setEstadoCarga("error");
      }
    }
    cargar();
  }, [id]);

  async function handleBuscar() {
    if (!titulo.trim()) return;
    setEstadoBusqueda("buscando");
    try {
      const resultado = await buscarLibro(titulo);
      if (!resultado) {
        setEstadoBusqueda("sin-resultado");
        return;
      }
      setTitulo(resultado.titulo || titulo);
      setAutor(resultado.autor);
      setEditorial(resultado.editorial);
      setIsbn(resultado.isbn);
      setPortada(resultado.portada);
      setEstadoBusqueda("encontrado");
    } catch {
      setEstadoBusqueda("error");
    }
  }

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) return;

    setEstadoGuardado("guardando");
    try {
      await updateDoc(doc(db, "libros", id), {
        titulo: titulo.trim(),
        autor,
        editorial,
        isbn,
        portada,
        balda: balda.trim() ? Number(balda) : null,
        columna: columna.trim() ? Number(columna) : null,
      });
      setEstadoGuardado("guardado");
      router.push("/");
    } catch {
      setEstadoGuardado("error");
    }
  }

  if (estadoCarga === "cargando") {
    return (
      <div
        className={`${plexMono.className} flex flex-1 items-center justify-center bg-[#E3DFD3] px-4 py-12`}
      >
        <p className="text-xs text-[#9A927C]">Cargando el libro…</p>
      </div>
    );
  }

  if (estadoCarga === "error") {
    return (
      <div
        className={`${plexMono.className} flex flex-1 items-center justify-center bg-[#E3DFD3] px-4 py-12`}
      >
        <p className="text-xs text-[#8C3B2E]">
          No se pudo cargar el libro. Puede que ya no exista.
        </p>
      </div>
    );
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
            editar ficha
          </span>
        </div>

        <label className="mb-1 block text-xs text-[#5B5748]" htmlFor="titulo">
          Título
        </label>
        <div className="mb-4 flex gap-2">
          <input
            id="titulo"
            type="text"
            required
            value={titulo}
            onChange={(e) => {
              setTitulo(e.target.value);
              setEstadoBusqueda("inactivo");
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
                onChange={(e) => setEditorial(e.target.value)}
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
          {estadoGuardado === "guardando" ? "Guardando…" : "Guardar cambios"}
        </button>

        {estadoGuardado === "error" && (
          <p className="mt-3 text-center text-xs text-[#8C3B2E]">
            No se pudo guardar. Inténtalo de nuevo.
          </p>
        )}
      </form>
    </div>
  );
}
