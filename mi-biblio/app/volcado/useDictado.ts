import { useEffect, useRef, useState, useSyncExternalStore } from "react";

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

// Dictado por voz continuo en español. `onError` recibe el mensaje a mostrar
// (cadena vacía al empezar a escuchar, para limpiar el anterior).
export function useDictado(onError: (mensaje: string) => void) {
  const [texto, setTexto] = useState("");
  const [provisional, setProvisional] = useState("");
  const [escuchando, setEscuchando] = useState(false);
  const sinSoporte = useSyncExternalStore(
    () => () => {},
    () => !obtenerReconocimiento(),
    () => false
  );

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

  function empezar() {
    const Ctor = obtenerReconocimiento();
    if (!Ctor) return;
    onError("");
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
      onError(
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

  function parar() {
    quiereEscucharRef.current = false;
    recRef.current?.stop();
  }

  // Edición manual de la transcripción: descarta la frase provisional y la de referencia.
  function editarTexto(v: string) {
    setProvisional("");
    ultimaFraseRef.current = "";
    cambiarTexto(v);
  }

  function reiniciar() {
    editarTexto("");
  }

  return { texto, provisional, escuchando, sinSoporte, empezar, parar, editarTexto, reiniciar };
}
