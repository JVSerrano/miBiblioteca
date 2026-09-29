/**
 * Script de importación inicial (spec 04). Uso:
 *   npx tsx scripts/importar.ts [ruta-al-json]
 *
 * Variables de entorno esperadas en .env.local:
 *   GOOGLE_APPLICATION_CREDENTIALS  ruta al JSON de la cuenta de servicio de Firebase
 *   GOOGLE_BOOKS_API_KEY            clave de Google Books (sin prefijo NEXT_PUBLIC_)
 */
process.loadEnvFile(".env.local");

import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { buscarLibroConAutorConClave, buscarLibroConClave } from "../lib/googleBooks";

interface LibroEntrada {
  titulo: string;
  autor?: string;
  balda: number | null;
  columna: number | null;
}

async function main() {
  const rutaJson = process.argv[2] ?? "scripts/import-data.json";
  const credencialesPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credencialesPath) {
    throw new Error(
      "Falta GOOGLE_APPLICATION_CREDENTIALS en .env.local (ruta al JSON de la cuenta de servicio)."
    );
  }
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;

  const entradas: LibroEntrada[] = JSON.parse(readFileSync(rutaJson, "utf-8"));

  const app = initializeApp({ credential: cert(credencialesPath) });
  const db = getFirestore(app);

  for (const entrada of entradas) {
    console.log(`Importando: ${entrada.titulo}`);
    let datosGoogle;
    try {
      // Con autor la búsqueda es mucho más fiable; si no da nada, se cae a solo título.
      datosGoogle = entrada.autor
        ? await buscarLibroConAutorConClave(entrada.titulo, entrada.autor, apiKey)
        : null;
      if (!datosGoogle) {
        if (entrada.autor) console.warn(`  Sin coincidencia con autor "${entrada.autor}", busco solo por título.`);
        datosGoogle = await buscarLibroConClave(entrada.titulo, apiKey);
      }
    } catch (error) {
      console.error(`  Google Books falló para "${entrada.titulo}": ${error}`);
      datosGoogle = null;
    }

    await db.collection("libros").add({
      titulo: datosGoogle?.titulo || entrada.titulo,
      autor: datosGoogle?.autor || entrada.autor || "",
      editorial: datosGoogle?.editorial ?? "",
      isbn: datosGoogle?.isbn ?? "",
      portada: datosGoogle?.portada ?? "",
      balda: entrada.balda,
      columna: entrada.columna,
      fechaAlta: FieldValue.serverTimestamp(),
    });

    if (!datosGoogle) {
      console.warn(`  Sin resultado en Google Books, importado solo con los datos del JSON.`);
    }
  }

  console.log(`Importación completada: ${entradas.length} libro(s).`);
}

main().catch((error) => {
  console.error("Error en la importación:", error);
  process.exit(1);
});
