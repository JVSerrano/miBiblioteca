# Carga masiva de libros desde un archivo (Excel, Word, PDF, CSV)

Procedimiento para meter varios libros de golpe en Firestore a partir de un archivo que pasa el usuario. Probado el 2026-09-29 con la balda 2 columna 1 (14 libros de Stephen King).

Flujo: **archivo → JSON → Google Books → Firestore**. La lógica está en `mi-biblio/scripts/importar.ts` y `mi-biblio/lib/googleBooks.ts`.

---

## Formato del archivo de entrada

Una fila o línea por libro.

| Campo | Obligatorio | Notas |
|---|---|---|
| `titulo` | Sí | Tal como lo escribe el usuario; se corrigen erratas evidentes antes de importar. |
| `balda` | No | Número. Puede venir en un encabezado del archivo ("Balda 2 columna 1") y se aplica a todas las filas. |
| `columna` | No | Número. Igual que `balda`. |
| `autor` | **No, solo para libros poco conocidos o de título ambiguo** | Ver la regla de abajo. |

### Cuándo hace falta `autor`

El usuario no quiere escribir el autor en todos los libros. **No lo pidas ni lo inventes por defecto.** Solo hace falta en estos casos:

- Títulos cortos o genéricos que Google Books confunde: "Carrie", "Holly", "El instituto", "Cuento de hadas".
- Libros poco conocidos, o que ya fallaron en una importación anterior.

Si en un mismo archivo casi todos los libros son de un autor (una balda de Stephen King, por ejemplo), **basta con preguntar al usuario y aplicar ese autor a todas las filas**. Si el archivo no trae autor y hay títulos ambiguos, avisa de cuáles son y pregunta antes de importar.

---

## Pasos

1. **Leer el archivo.**
   - **Excel (`.xlsx`)**: no hay Python en esta máquina. Se lee con PowerShell: un `.xlsx` es un zip; se copia al scratchpad, se descomprime con `Expand-Archive` y se leen `xl/sharedStrings.xml` y `xl/worksheets/sheet1.xml`.
   - **Ojo con `~$nombre.xlsx`**: es el archivo temporal de bloqueo que crea Excel mientras el libro está abierto. No tiene datos. El real es el mismo nombre sin `~$`.
   - **PDF**: leerlo con la herramienta Read (parámetro `pages`). Si es un escaneo sin texto, decir que no es legible en vez de adivinar títulos.
   - **Word (`.docx`)**: también es un zip; el texto está en `word/document.xml`. Para listas libres, lo más fiable es una línea por libro.
   - **CSV**: se lee directamente.
   - Trabajar siempre sobre una **copia** en el scratchpad; no modificar el original del usuario.
2. **Convertir a `mi-biblio/scripts/import-data.json`** (`{ titulo, autor?, balda, columna }[]`). El archivo está en `.gitignore` (`/scripts/*.json`) y no se sube al repositorio.
3. **Corregir erratas evidentes** en los títulos ("Dolores Claborne" → "Dolores Claiborne", "salem lot" → "Salem's Lot", "dragon" → "dragón") y **decir al usuario qué se ha corregido**.
4. **Comprobar duplicados.** El script **no** detecta duplicados: ejecutarlo dos veces duplica los libros. Antes de importar, listar `libros` en Firestore (balda y columna de destino como mínimo) y no repetir los que ya estén.
5. **Enseñar la lista final al usuario** y esperar su visto bueno antes de escribir nada, salvo que ya haya dicho explícitamente que se importe.
6. **Importar:** `cd mi-biblio && npx tsx scripts/importar.ts`.
7. **Verificar** consultando Firestore (`where("balda", "==", N)`): número de libros, y para cada uno título, autor, editorial y si tiene portada.
8. **Corregir lo que salió mal** (ver abajo) y volver a enseñar el resultado.

Los scripts temporales de comprobación o corrección se crean en `mi-biblio/scripts/` con prefijo `_` (para que resuelvan `node_modules`) y **se borran al terminar**.

---

## Requisitos previos

En `mi-biblio/.env.local`:

- `GOOGLE_APPLICATION_CREDENTIALS` → ruta al JSON de la cuenta de servicio (hoy `scripts/service-account.json`, ignorado por git).
- `GOOGLE_BOOKS_API_KEY` → clave de Google Books (sin prefijo `NEXT_PUBLIC_`).

Comprobar que existen **sin imprimir sus valores**.

---

## Cómo busca el script

- **Con `autor`:** busca `intitle:"…" inauthor:"…"`, descarta resultados cuyo autor no coincida y, entre los que quedan, prefiere el título más parecido y, a igualdad, la edición en español.
- **Sin coincidencia con autor, o sin `autor`:** cae a búsqueda solo por título (toma el primer resultado de Google, que a menudo es otro libro).
- Si Google Books no devuelve nada, el libro se guarda solo con título, balda y columna (y el autor del archivo, si lo había).

---

## Problemas conocidos y cómo se arreglan

| Síntoma | Causa | Arreglo |
|---|---|---|
| Sale otro libro ("Carrie" → *El Diario de Carrie Berry*) | Título corto o genérico y búsqueda sin autor | Rehacer con `autor`; actualizar el documento con `doc.ref.update(...)`. |
| El libro sale con autor equivocado pero es correcto que no es del autor esperado | El usuario asumió un autor por error | Confirmar con el usuario antes de tocar nada ("El jardinero fiel" es de John le Carré). |
| Editorial o portada de otro idioma (Holly → Heyne Verlag, alemana) | Google devolvió otra edición | Buscar el ISBN de la edición en español y aplicarlo. |
| Sin editorial ni portada | Google Books no tiene datos de esa edición | Se deja así; el usuario lo completa desde la pantalla de editar. |
| Aparece un libro que no está en el archivo | Un título falló y Google devolvió cualquier cosa | Corregirlo (o borrarlo) tras verificar. |

Al corregir, **actualizar solo los documentos recién importados** (filtrar por balda/columna y por el título mal guardado), nunca el resto de la colección.

---

## Ejemplo de JSON

```json
[
  { "titulo": "Carrie", "autor": "Stephen King", "balda": 2, "columna": 1 },
  { "titulo": "El resplandor", "autor": "Stephen King", "balda": 2, "columna": 1 },
  { "titulo": "El nombre del viento", "balda": 2, "columna": 1 }
]
```
