# SPEC 01 — Alta de libro con autocompletado

> **Status:** Aprobado
> **Depends on:** [[00-base-firebase-googlebooks]]
> **Date:** 2026-09-26
> **Objective:** Pantalla para dar de alta un libro con autocompletado desde Google Books, indicando su balda/columna en la librería del salón.

---

## Scope

**In:**

- Alta manual de un libro con autocompletado desde Google Books API (por título o ISBN). Solo el título es obligatorio.
- Campos editables tras el autocompletado (por si Google Books se equivoca o el usuario quiere corregir algo).
- Inputs numéricos para `balda` y `columna`.
- Guardar el documento en la colección `libros` con `serverTimestamp()`.

**Out of scope (para specs futuros):**

- Listado de libros ([[02-listado-filtro]]).
- Edición o borrado de un libro ya dado de alta (no contemplado en ningún spec todavía).
- Fallback a Open Library si Google Books no encuentra un libro.
- Dictado por voz dentro de la app (descartado, no solo pospuesto — se usa el dictado nativo del teclado del sistema fuera de la app).

---

## Estructura de código (nuevos archivos)

```
mi-biblio/
└── app/
    └── nuevo/
        └── page.tsx     (alta manual con autocompletado)
```

---

## Implementation plan

1. **Implementar `app/nuevo/page.tsx`**: formulario de alta con campo de búsqueda que llama a `buscarLibro` (de [[00-base-firebase-googlebooks]]), rellena los campos (editables), y dos inputs numéricos para `balda`/`columna`. Al enviar, escribe el documento en Firestore con `serverTimestamp()`. Sistema funcional: se puede dar de alta un libro real y verlo en la consola de Firebase.

---

## Acceptance criteria

- [ ] Se puede dar de alta un libro buscando por título, y los campos autor/editorial/isbn/portada se autocompletan desde Google Books.
- [ ] Se puede dar de alta un libro escribiendo solo el título manualmente (sin depender de que Google Books lo encuentre).
- [ ] Los campos autocompletados son editables antes de guardar.
- [ ] Al guardar, el documento aparece en la colección `libros` de Firestore con `fechaAlta` (`serverTimestamp()`), `balda` y `columna`.

---

## Decisions

- **Sí:** Client Component (`"use client"`), porque el formulario llama a Firestore y a Google Books directamente desde el navegador. No hay autenticación ni necesidad de SSR; mezclar Server Components aquí añadiría complejidad sin beneficio.

---

## Risks

| Riesgo | Mitigación |
|---|---|
| Google Books no encuentra un libro (ediciones antiguas, títulos raros) | El alta permite completar los campos manualmente; solo el título es obligatorio |

---

## What is **not** in this spec

- Listado de libros.
- Edición o borrado de libros.
- Mapa visual de la estantería.
- Fallback a Open Library.
- Dictado por voz integrado en la app.

Cada uno de estos, si se implementa, va en su propio spec.
