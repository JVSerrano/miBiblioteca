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

export async function buscarLibro(query: string): Promise<LibroNormalizado | null> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY;
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
