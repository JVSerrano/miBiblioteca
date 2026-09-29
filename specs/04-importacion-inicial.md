# SPEC 04 — Script de importación inicial

> **Status:** Implementado
> **Depends on:** [[00-base-firebase-googlebooks]]
> **Date:** 2026-09-26
> **Objective:** Script de un solo uso para cargar el inventario inicial de libros en Firestore, reutilizando la misma lógica de normalización de Google Books que el resto de la app.

---

## Scope

**In:**

- Script de importación inicial de un solo uso (`scripts/importar.ts`), que reutiliza la misma función de normalización de Google Books de [[00-base-firebase-googlebooks]].

**Out of scope:**

- Cualquier UI de importación dentro de la app.
- Reintentos automáticos o modo incremental (es un script de un solo uso).

---

## Estructura de código (nuevos archivos)

```
mi-biblio/
└── scripts/
    └── importar.ts     (carga inicial, Firebase Admin SDK, ejecutado una vez con `npx tsx`)
```

---

## Implementation plan

1. **Implementar `scripts/importar.ts`** con Firebase Admin SDK: lee un JSON local `{ titulo, balda, columna }[]`, llama a la misma lógica de `googleBooks.ts` (adaptada para Node si hace falta un wrapper sin `NEXT_PUBLIC_`) para completar autor/editorial/portada/ISBN, y escribe cada documento en Firestore. Test manual: ejecutar con `npx tsx scripts/importar.ts` sobre un JSON de prueba de 2-3 libros y verificar que aparecen en el listado de la app ([[02-listado-filtro]]).

---

> **Nota (2026-09-29):** el script acepta además un campo opcional `autor` para mejorar la búsqueda. El procedimiento completo para cargar libros desde un archivo está en `docs/carga-masiva-desde-archivo.md`.

---

## Acceptance criteria

- [x] `npx tsx scripts/importar.ts` con un JSON de prueba crea los documentos correspondientes en Firestore con los datos de Google Books completados.

---

## Decisions

- **Sí:** `scripts/importar.ts` dentro de `mi-biblio/`, ejecutado con `npx tsx`. Reutiliza la lógica de Google Books del formulario de alta, tal como pedía el borrador original.
- **No:** proyecto Node separado para el script de importación (duplicaría lógica).

---

## What is **not** in this spec

- UI de importación dentro de la app.
- Reintentos o modo incremental.

Cada uno de estos, si se implementa, va en su propio spec.
