import type { LibroNormalizado } from "@/lib/googleBooks";

// Valores tal como los edita un formulario: balda y columna son texto.
export interface CamposLibro extends LibroNormalizado {
  balda: string;
  columna: string;
}

export const CAMPOS_VACIOS: CamposLibro = {
  titulo: "",
  autor: "",
  editorial: "",
  isbn: "",
  portada: "",
  balda: "",
  columna: "",
};

const aTexto = (n: number | null | undefined) => (n != null ? String(n) : "");
const aNumero = (texto: string) => (texto.trim() ? Number(texto) : null);

// Convierte un documento de Firestore en los campos de un formulario.
export function camposDesdeDocumento(data: Record<string, unknown>): CamposLibro {
  const texto = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    titulo: texto(data.titulo),
    autor: texto(data.autor),
    editorial: texto(data.editorial),
    isbn: texto(data.isbn),
    portada: texto(data.portada),
    balda: aTexto(data.balda as number | null),
    columna: aTexto(data.columna as number | null),
  };
}

// Convierte los campos de un formulario en lo que se guarda en Firestore.
export function documentoDesdeCampos(c: CamposLibro) {
  return {
    titulo: c.titulo.trim(),
    autor: c.autor,
    editorial: c.editorial,
    isbn: c.isbn,
    portada: c.portada,
    balda: aNumero(c.balda),
    columna: aNumero(c.columna),
  };
}

export function textoUbicacion(balda: number | null, columna: number | null) {
  if (balda === null && columna === null) return "sin colocar";
  return `Balda ${balda ?? "?"} · Columna ${columna ?? "?"}`;
}
