"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Lora, IBM_Plex_Mono } from "next/font/google";
import { collection, doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { buscarLibros, coincidenciaClara, type LibroNormalizado } from "@/lib/googleBooks";
import { interpretarDictado } from "@/lib/interpretarVoz";

const lora = Lora({ subsets: ["latin"], weight: ["500", "600"] });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"] });

interface Fila {
  id: number;
  titulo: string;
  autor: string;
  editorial: string;
  isbn: string;
  portada: string;
  balda: string;
  columna: string;
  enriquecido: boolean;
}

type Fase = "dictado" | "interpretando" | "revision" | "guardando" | "guardado";

// Tipos mínimos de la Web Speech API (no vienen en lib.dom de TypeScript).
interface ResultadoVoz {
  isFinal: boolean;
  0: { transcript: string };
}
interface EventoVoz {
  resultIndex: number;
  results: ArrayLike<ResultadoVoz>;
}
interface Reconocimiento {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: EventoVoz) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start(): void;
  stop(): void;
}
type ConstructorReconocimiento = new () => Reconocimiento;

function obtenerReconocimiento(): ConstructorReconocimiento | null {
  const w = window as unknown as {
    SpeechRecognition?: ConstructorReconocimiento;
    webkitSpeechRecognition?: ConstructorReconocimiento;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

async function enriquecer(titulo: string): Promise<LibroNormalizado | null> {
  try {
    const encontrados = await buscarLibros(titulo, 5);
    if (encontrados.length === 0) return null;
    return coincidenciaClara(encontrados, titulo) ?? encontrados[0];
  } catch {
    return null;
  }
}

const inputClase =
  "w-full border-b border-[#C9BFA5] bg-transparent py-1 text-sm text-[#2B2A28] outline-none focus:border-[#2F4858]";

export default function VolcadoPage() {
  const [fase, setFase] = useState<Fase>("dictado");
  const [texto, setTexto] = useState("");
  const [provisional, setProvisional] = useState("");
  const [escuchando, setEscuchando] = useState(false);
  const sinSoporte = useSyncExternalStore(
    () => () => {},
    () => !obtenerReconocimiento(),
    () => false
  );
  const [error, setError] = useState("");
  const [filas, setFilas] = useState<Fila[]>([]);
  const [progreso, setProgreso] = useState("");

  const recRef = useRef<Reconocimiento | null>(null);
  const quiereEscucharRef = useRef(false);
  const textoRef = useRef("");
  const ultimaFraseRef = useRef("");

  function cambiarTexto(v: string) {
    textoRef.current = v;
    setTexto(v);
  }

  // Android puede reenviar la frase completa (o crecida) en vez de solo lo nuevo:
  // si empieza por la anterior, la sustituye en lugar de añadirse.
  function confirmarFrase(frase: string) {
    const limpia = frase.trim();
    if (!limpia) return;
    const previa = ultimaFraseRef.current;
    let base = textoRef.current.trimEnd();
    if (previa && base.endsWith(previa) && limpia.startsWith(previa)) {
      base = base.slice(0, base.length - previa.length).trimEnd();
    } else if (previa && limpia === previa) {
      return;
    }
    ultimaFraseRef.current = limpia;
    cambiarTexto(base ? `${base} ${limpia}` : limpia);
  }

  useEffect(() => {
    return () => {
      quiereEscucharRef.current = false;
      recRef.current?.stop();
    };
  }, []);

  function empezarAEscuchar() {
    const Ctor = obtenerReconocimiento();
    if (!Ctor) return;
    setError("");
    const rec = new Ctor();
    rec.lang = "es-ES";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let frase = "";
      for (let i = 0; i < e.results.length; i++) frase += e.results[i][0].transcript;
      if (e.results[e.results.length - 1].isFinal) {
        setProvisional("");
        confirmarFrase(frase);
      } else {
        setProvisional(frase);
      }
    };
    rec.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      quiereEscucharRef.current = false;
      setError(
        e.error === "not-allowed"
          ? "El navegador no tiene permiso para usar el micrófono."
          : "El micrófono ha fallado. Inténtalo de nuevo."
      );
    };
    // Cada frase es una sesión (el modo continuo repite texto en Android): se reanuda sola.
    rec.onend = () => {
      setProvisional("");
      if (quiereEscucharRef.current) {
        try {
          rec.start();
          return;
        } catch {
          quiereEscucharRef.current = false;
        }
      }
      setEscuchando(false);
    };
    recRef.current = rec;
    quiereEscucharRef.current = true;
    rec.start();
    setEscuchando(true);
  }

  function pararDeEscuchar() {
    quiereEscucharRef.current = false;
    recRef.current?.stop();
  }

  async function handleInterpretar() {
    pararDeEscuchar();
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
        id: i,
        titulo: d.titulo.trim(),
        autor: "",
        editorial: "",
        isbn: "",
        portada: "",
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
            titulo: f.titulo.trim(),
            autor: f.autor,
            editorial: f.editorial,
            isbn: f.isbn,
            portada: f.portada,
            balda: f.balda.trim() ? Number(f.balda) : null,
            columna: f.columna.trim() ? Number(f.columna) : null,
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

  function reiniciar() {
    cambiarTexto("");
    ultimaFraseRef.current = "";
    setProvisional("");
    setFilas([]);
    setError("");
    setFase("dictado");
  }

  const sinUbicacion = filas.filter((f) => !f.balda.trim() && !f.columna.trim()).length;
  const sinDatos = filas.filter((f) => !f.enriquecido).length;

  return (
    <div className={`${plexMono.className} flex flex-1 justify-center bg-[#E3DFD3] px-4 py-12`}>
      <div className="w-full max-w-2xl border border-[#C9BFA5] bg-[#F7F4EC] px-7 pb-7 pt-6 shadow-[4px_4px_0_0_#C9BFA5]">
        <div className="mb-5 flex items-baseline justify-between border-b-2 border-[#8C3B2E]/40 pb-3">
          <Link
            href="/"
            className={`${lora.className} text-xl font-semibold text-[#2B2A28] transition-colors hover:text-[#8C3B2E]`}
          >
            Mi biblioteca
          </Link>
          <span className="text-[10px] tracking-wide text-[#8C3B2E]/70">dictado en lote</span>
        </div>

        {(fase === "dictado" || fase === "interpretando") && (
          <>
            <p className="mb-4 text-xs leading-relaxed text-[#5B5748]">
              Di la ubicación y los títulos. Por ejemplo: «balda 4, columna 1: El Quijote, Dune,
              Rayuela. Columna 2: Ubik, Solaris». La ubicación vale hasta que digas otra.
            </p>

            <div className="mb-3 flex items-center gap-3">
              {sinSoporte ? (
                <p className="text-xs text-[#8C3B2E]">
                  Este navegador no permite dictar. Usa Chrome en Android o escritorio, o escribe
                  el texto a mano.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={escuchando ? pararDeEscuchar : empezarAEscuchar}
                  disabled={fase === "interpretando"}
                  aria-pressed={escuchando}
                  className={`border-2 px-4 py-2 text-sm transition-colors disabled:opacity-40 ${
                    escuchando
                      ? "border-[#8C3B2E] bg-[#8C3B2E] text-[#F7F4EC]"
                      : "border-[#2F4858] text-[#2F4858] hover:bg-[#2F4858] hover:text-[#F7F4EC]"
                  }`}
                >
                  {escuchando ? "● Parar" : "Empezar a dictar"}
                </button>
              )}
              {escuchando && (
                <span role="status" className="text-xs text-[#8C3B2E]">
                  Escuchando…
                </span>
              )}
            </div>

            <label className="mb-1 block text-xs text-[#5B5748]" htmlFor="dictado">
              Transcripción (puedes corregirla)
            </label>
            <textarea
              id="dictado"
              rows={9}
              value={provisional ? `${texto}${texto ? " " : ""}${provisional}` : texto}
              onChange={(e) => {
                setProvisional("");
                ultimaFraseRef.current = "";
                cambiarTexto(e.target.value);
              }}
              disabled={fase === "interpretando"}
              className="mb-4 w-full resize-y border border-[#C9BFA5] bg-transparent p-2 text-sm leading-relaxed text-[#2B2A28] outline-none focus:border-[#2F4858]"
            />

            <button
              type="button"
              onClick={handleInterpretar}
              disabled={!texto.trim() || fase === "interpretando"}
              className="w-full border-2 border-[#2F4858] bg-[#2F4858] py-2 text-sm font-medium tracking-wide text-[#F7F4EC] transition-colors hover:bg-[#254535] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {fase === "interpretando" ? progreso : "Interpretar dictado"}
            </button>
          </>
        )}

        {(fase === "revision" || fase === "guardando") && (
          <>
            <p className="mb-1 text-xs text-[#5B5748]">
              {filas.length} libros. Revisa y corrige antes de guardar.
            </p>
            {(sinUbicacion > 0 || sinDatos > 0) && (
              <p className="mb-3 text-xs text-[#8C3B2E]">
                {sinUbicacion > 0 && `${sinUbicacion} sin balda ni columna. `}
                {sinDatos > 0 && `${sinDatos} sin datos de Google Books (se guardan solo con título).`}
              </p>
            )}

            <ul className="mb-5 divide-y divide-[#C9BFA5] border border-[#C9BFA5]">
              {filas.map((f) => (
                <li key={f.id} className="flex items-start gap-3 p-3">
                  {f.portada ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={f.portada}
                      alt=""
                      className="h-14 w-9 shrink-0 border border-[#C9BFA5] object-cover"
                    />
                  ) : (
                    <span className="flex h-14 w-9 shrink-0 items-center justify-center border border-dashed border-[#C9BFA5] text-[8px] text-[#9A927C]">
                      —
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <input
                      aria-label="Título"
                      value={f.titulo}
                      onChange={(e) => actualizarFila(f.id, { titulo: e.target.value })}
                      className={`${lora.className} ${inputClase}`}
                    />
                    <p className="mb-2 mt-1 truncate text-[11px] text-[#5B5748]">
                      {f.autor || "sin autor"}
                    </p>
                    <div className="flex gap-4">
                      <label className="flex flex-1 items-center gap-2 text-[10px] text-[#9A927C]">
                        Balda
                        <input
                          type="number"
                          inputMode="numeric"
                          value={f.balda}
                          onChange={(e) => actualizarFila(f.id, { balda: e.target.value })}
                          className={inputClase}
                        />
                      </label>
                      <label className="flex flex-1 items-center gap-2 text-[10px] text-[#9A927C]">
                        Columna
                        <input
                          type="number"
                          inputMode="numeric"
                          value={f.columna}
                          onChange={(e) => actualizarFila(f.id, { columna: e.target.value })}
                          className={inputClase}
                        />
                      </label>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label={`Quitar ${f.titulo}`}
                    onClick={() => setFilas((fs) => fs.filter((x) => x.id !== f.id))}
                    className="shrink-0 px-1 text-lg leading-none text-[#9A927C] hover:text-[#8C3B2E]"
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
                className="border border-[#2F4858] px-4 py-2 text-sm text-[#2F4858] hover:bg-[#E3DFD3] disabled:opacity-40"
              >
                Volver al dictado
              </button>
              <button
                type="button"
                onClick={handleGuardar}
                disabled={filas.length === 0 || fase === "guardando"}
                className="flex-1 border-2 border-[#2F4858] bg-[#2F4858] py-2 text-sm font-medium tracking-wide text-[#F7F4EC] transition-colors hover:bg-[#254535] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {fase === "guardando" ? "Guardando…" : `Guardar ${filas.length} libros`}
              </button>
            </div>
          </>
        )}

        {fase === "guardado" && (
          <div className="text-center">
            <p className="mb-5 text-sm text-[#2F4858]">
              {filas.length} libros archivados en sus baldas.
            </p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={reiniciar}
                className="border border-[#2F4858] px-4 py-2 text-sm text-[#2F4858] hover:bg-[#2F4858] hover:text-[#F7F4EC]"
              >
                Dictar más
              </button>
              <Link
                href="/"
                className="border-2 border-[#2F4858] bg-[#2F4858] px-4 py-2 text-sm text-[#F7F4EC]"
              >
                Ver biblioteca
              </Link>
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-3 text-center text-xs text-[#8C3B2E]">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
