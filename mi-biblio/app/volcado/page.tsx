"use client";

import { useState } from "react";
import Link from "next/link";
import { collection, doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { lora } from "@/lib/fuentes";
import { buscarLibros, coincidenciaClara, type LibroNormalizado } from "@/lib/googleBooks";
import { interpretarDictado } from "@/lib/interpretarVoz";
import { documentoDesdeCampos, CAMPOS_VACIOS, type CamposLibro } from "@/lib/libros";
import { Cabecera } from "../componentes/Cabecera";
import { claseInput } from "../componentes/Campo";
import { Pagina } from "../componentes/Pagina";
import { Portada } from "../componentes/Portada";
import { useDictado } from "./useDictado";

interface Fila extends CamposLibro {
  id: number;
  enriquecido: boolean;
}

type Fase = "dictado" | "interpretando" | "revision" | "guardando" | "guardado";

async function enriquecer(titulo: string): Promise<LibroNormalizado | null> {
  try {
    const encontrados = await buscarLibros(titulo, 5);
    if (encontrados.length === 0) return null;
    return coincidenciaClara(encontrados, titulo) ?? encontrados[0];
  } catch {
    return null;
  }
}

export default function VolcadoPage() {
  const [fase, setFase] = useState<Fase>("dictado");
  const [error, setError] = useState("");
  const [filas, setFilas] = useState<Fila[]>([]);
  const [progreso, setProgreso] = useState("");
  const { texto, provisional, escuchando, sinSoporte, empezar, parar, editarTexto, reiniciar } =
    useDictado(setError);

  async function handleInterpretar() {
    parar();
    if (!texto.trim()) return;
    setError("");
    setFase("interpretando");
    setProgreso("Entendiendo el dictado…");
    try {
      const dictados = await interpretarDictado(texto);
      if (dictados.length === 0) {
        setError("No he encontrado ningún título en el dictado.");
        setFase("dictado");
        return;
      }
      const base: Fila[] = dictados.map((d, i) => ({
        ...CAMPOS_VACIOS,
        id: i,
        titulo: d.titulo.trim(),
        balda: d.balda != null ? String(d.balda) : "",
        columna: d.columna != null ? String(d.columna) : "",
        enriquecido: false,
      }));

      // Google Books en tandas de 4 para no saturar la cuota.
      let hechos = 0;
      for (let i = 0; i < base.length; i += 4) {
        const tanda = base.slice(i, i + 4);
        const datos = await Promise.all(tanda.map((f) => enriquecer(f.titulo)));
        datos.forEach((d, j) => {
          if (!d) return;
          const f = tanda[j];
          f.titulo = d.titulo || f.titulo;
          f.autor = d.autor;
          f.editorial = d.editorial;
          f.isbn = d.isbn;
          f.portada = d.portada;
          f.enriquecido = true;
        });
        hechos += tanda.length;
        setProgreso(`Buscando datos en Google Books… ${hechos}/${base.length}`);
      }
      setFilas(base);
      setFase("revision");
    } catch {
      setError(
        "No se pudo interpretar el dictado. Comprueba que Firebase AI Logic está activado y vuelve a intentarlo."
      );
      setFase("dictado");
    }
  }

  function actualizarFila(id: number, cambios: Partial<Fila>) {
    setFilas((fs) => fs.map((f) => (f.id === id ? { ...f, ...cambios } : f)));
  }

  async function handleGuardar() {
    const validas = filas.filter((f) => f.titulo.trim());
    if (validas.length === 0) return;
    setFase("guardando");
    setError("");
    try {
      // writeBatch admite 500 operaciones como máximo.
      for (let i = 0; i < validas.length; i += 400) {
        const lote = writeBatch(db);
        for (const f of validas.slice(i, i + 400)) {
          lote.set(doc(collection(db, "libros")), {
            ...documentoDesdeCampos(f),
            fechaAlta: serverTimestamp(),
          });
        }
        await lote.commit();
      }
      setFase("guardado");
    } catch {
      setError("No se pudieron guardar los libros. Inténtalo de nuevo.");
      setFase("revision");
    }
  }

  function volverADictar() {
    reiniciar();
    setFilas([]);
    setError("");
    setFase("dictado");
  }

  const sinUbicacion = filas.filter((f) => !f.balda.trim() && !f.columna.trim()).length;
  const sinDatos = filas.filter((f) => !f.enriquecido).length;

  return (
    <Pagina centrarVertical={false}>
      <div className="w-full max-w-2xl border border-borde bg-papel px-7 pb-7 pt-6 shadow-[4px_4px_0_0_var(--color-borde)]">
        <Cabecera subtitulo="dictado en lote" />

        {(fase === "dictado" || fase === "interpretando") && (
          <>
            <p className="mb-4 text-xs leading-relaxed text-tinta-suave">
              Di la ubicación y los títulos. Por ejemplo: «balda 4, columna 1: El Quijote, Dune,
              Rayuela. Columna 2: Ubik, Solaris». La ubicación vale hasta que digas otra.
            </p>

            <div className="mb-3 flex items-center gap-3">
              {sinSoporte ? (
                <p className="text-xs text-rojo">
                  Este navegador no permite dictar. Usa Chrome en Android o escritorio, o escribe
                  el texto a mano.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={escuchando ? parar : empezar}
                  disabled={fase === "interpretando"}
                  aria-pressed={escuchando}
                  className={`border-2 px-4 py-2 text-sm transition-colors disabled:opacity-40 ${
                    escuchando
                      ? "border-rojo bg-rojo text-papel"
                      : "border-azul text-azul hover:bg-azul hover:text-papel"
                  }`}
                >
                  {escuchando ? "● Parar" : "Empezar a dictar"}
                </button>
              )}
              {escuchando && (
                <span role="status" className="text-xs text-rojo">
                  Escuchando…
                </span>
              )}
            </div>

            <label className="mb-1 block text-xs text-tinta-suave" htmlFor="dictado">
              Transcripción (puedes corregirla)
            </label>
            <textarea
              id="dictado"
              rows={9}
              value={provisional ? `${texto}${texto ? " " : ""}${provisional}` : texto}
              onChange={(e) => editarTexto(e.target.value)}
              disabled={fase === "interpretando"}
              className="mb-4 w-full resize-y border border-borde bg-transparent p-2 text-sm leading-relaxed text-tinta outline-none focus:border-azul"
            />

            <button
              type="button"
              onClick={handleInterpretar}
              disabled={!texto.trim() || fase === "interpretando"}
              className="w-full border-2 border-azul bg-azul py-2 text-sm font-medium tracking-wide text-papel transition-colors hover:bg-azul-oscuro disabled:cursor-not-allowed disabled:opacity-40"
            >
              {fase === "interpretando" ? progreso : "Interpretar dictado"}
            </button>
          </>
        )}

        {(fase === "revision" || fase === "guardando") && (
          <>
            <p className="mb-1 text-xs text-tinta-suave">
              {filas.length} libros. Revisa y corrige antes de guardar.
            </p>
            {(sinUbicacion > 0 || sinDatos > 0) && (
              <p className="mb-3 text-xs text-rojo">
                {sinUbicacion > 0 && `${sinUbicacion} sin balda ni columna. `}
                {sinDatos > 0 && `${sinDatos} sin datos de Google Books (se guardan solo con título).`}
              </p>
            )}

            <ul className="mb-5 divide-y divide-borde border border-borde">
              {filas.map((f) => (
                <li key={f.id} className="flex items-start gap-3 p-3">
                  <Portada src={f.portada} tamano="fila" />
                  <div className="min-w-0 flex-1">
                    <input
                      aria-label="Título"
                      value={f.titulo}
                      onChange={(e) => actualizarFila(f.id, { titulo: e.target.value })}
                      className={`${lora.className} ${claseInput}`}
                    />
                    <p className="mb-2 mt-1 truncate text-[11px] text-tinta-suave">
                      {f.autor || "sin autor"}
                    </p>
                    <div className="flex gap-4">
                      <label className="flex flex-1 items-center gap-2 text-[10px] text-apagado">
                        Balda
                        <input
                          type="number"
                          inputMode="numeric"
                          value={f.balda}
                          onChange={(e) => actualizarFila(f.id, { balda: e.target.value })}
                          className={claseInput}
                        />
                      </label>
                      <label className="flex flex-1 items-center gap-2 text-[10px] text-apagado">
                        Columna
                        <input
                          type="number"
                          inputMode="numeric"
                          value={f.columna}
                          onChange={(e) => actualizarFila(f.id, { columna: e.target.value })}
                          className={claseInput}
                        />
                      </label>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label={`Quitar ${f.titulo}`}
                    onClick={() => setFilas((fs) => fs.filter((x) => x.id !== f.id))}
                    className="shrink-0 px-1 text-lg leading-none text-apagado hover:text-rojo"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFase("dictado")}
                disabled={fase === "guardando"}
                className="border border-azul px-4 py-2 text-sm text-azul hover:bg-fondo disabled:opacity-40"
              >
                Volver al dictado
              </button>
              <button
                type="button"
                onClick={handleGuardar}
                disabled={filas.length === 0 || fase === "guardando"}
                className="flex-1 border-2 border-azul bg-azul py-2 text-sm font-medium tracking-wide text-papel transition-colors hover:bg-azul-oscuro disabled:cursor-not-allowed disabled:opacity-40"
              >
                {fase === "guardando" ? "Guardando…" : `Guardar ${filas.length} libros`}
              </button>
            </div>
          </>
        )}

        {fase === "guardado" && (
          <div className="text-center">
            <p className="mb-5 text-sm text-azul">
              {filas.length} libros archivados en sus baldas.
            </p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={volverADictar}
                className="border border-azul px-4 py-2 text-sm text-azul hover:bg-azul hover:text-papel"
              >
                Dictar más
              </button>
              <Link
                href="/"
                className="border-2 border-azul bg-azul px-4 py-2 text-sm text-papel"
              >
                Ver biblioteca
              </Link>
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-3 text-center text-xs text-rojo">
            {error}
          </p>
        )}
      </div>
    </Pagina>
  );
}
