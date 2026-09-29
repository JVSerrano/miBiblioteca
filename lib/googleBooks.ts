export interface LibroNormalizado {
  titulo: string;
  autor: string;
  editorial: string;
  isbn: string;
  portada: string;
}

interface GoogleBooksIndustryIdentifier {
  type: string;
  identifier: string;
}

interface GoogleBooksVolumeInfo {
  title?: string;
  authors?: string[];
  publisher?: string;
  industryIdentifiers?: GoogleBooksIndustryIdentifier[];
  imageLinks?: {
    thumbnail?: string;
  };
}

interface GoogleBooksItem {
  volumeInfo: GoogleBooksVolumeInfo;
}

interface GoogleBooksResponse {
  items?: GoogleBooksItem[];
}

function extraerIsbn(identifiers?: GoogleBooksIndustryIdentifier[]): string {
  if (!identifiers) return "";
  const isbn13 = identifiers.find((id) => id.type === "ISBN_13");
  if (isbn13) return isbn13.identifier;
  const isbn10 = identifiers.find((id) => id.type === "ISBN_10");
  return isbn10?.identifier ?? "";
}

export async function buscarLibroConClave(
  query: string,
  apiKey: string | undefined
): Promise<LibroNormalizado | null> {
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&key=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Google Books API error: ${res.status}`);
  }

  const data: GoogleBooksResponse = await res.json();
  const item = data.items?.[0];
  if (!item) return null;

  const info = item.volumeInfo;

  return {
    titulo: info.title ?? "",
    autor: info.authors?.join(", ") ?? "",
    editorial: info.publisher ?? "",
    isbn: extraerIsbn(info.industryIdentifiers),
    portada: info.imageLinks?.thumbnail ?? "",
  };
}

function normalizar(info: GoogleBooksVolumeInfo): LibroNormalizado {
  return {
    titulo: info.title ?? "",
    autor: info.authors?.join(", ") ?? "",
    editorial: info.publisher ?? "",
    isbn: extraerIsbn(info.industryIdentifiers),
    portada: info.imageLinks?.thumbnail ?? "",
  };
}

export async function buscarLibros(
  query: string,
  max = 5
): Promise<LibroNormalizado[]> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY;
  const q = `intitle:"${query.replace(/"/g, "").trim()}"`;
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=${max}&key=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Google Books API error: ${res.status}`);
  }

  const data: GoogleBooksResponse = await res.json();
  const libros = (data.items ?? []).map((item) => normalizar(item.volumeInfo));
  return ordenarPorCoincidencia(libros, query).slice(0, max);
}

function limpiar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Coincidencia exacta primero, luego títulos que empiezan igual, luego el resto.
// Array.sort es estable: dentro de cada grupo se conserva el orden de Google.
function ordenarPorCoincidencia(
  libros: LibroNormalizado[],
  query: string
): LibroNormalizado[] {
  const buscado = limpiar(query);
  const puntos = (l: LibroNormalizado) => {
    const t = limpiar(l.titulo);
    if (t === buscado) return 0;
    if (t.startsWith(buscado)) return 1;
    return 2;
  };
  return [...libros].sort((a, b) => puntos(a) - puntos(b));
}

// Devuelve el libro si la elección es obvia: un único resultado, o un único
// título que coincide exactamente con lo buscado. Si no, null (hay que elegir).
export function coincidenciaClara(
  libros: LibroNormalizado[],
  query: string
): LibroNormalizado | null {
  if (libros.length === 1) return libros[0];
  const buscado = limpiar(query);
  const exactos = libros.filter((l) => limpiar(l.titulo) === buscado);
  return exactos.length === 1 ? exactos[0] : null;
}

export async function buscarLibro(query: string): Promise<LibroNormalizado | null> {
  return buscarLibroConClave(query, process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY);
}
