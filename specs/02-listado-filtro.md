# SPEC 02 — Listado y filtro de libros

> **Status:** Draft
> **Depends on:** [[00-base-firebase-googlebooks]]
> **Date:** 2026-09-26
> **Objective:** Pantalla que lista todos los libros dados de alta, con su balda/columna, y permite filtrar en cliente por título y por autor.

---

## Scope

**In:**

- Listado de todos los libros con filtro en cliente por título y por autor.
- Visualización de portada, título, autor, balda y columna de cada libro en el listado.

**Out of scope (para specs futuros):**

- Mapa visual de la estantería (Fase 2).
- Edición o borrado de un libro desde el listado.
- Ordenación configurable (por título, por balda, etc.) — de momento el orden es el que devuelve Firestore.

---

## Estructura de código (nuevos archivos)

```
mi-biblio/
└── app/
    └── page.tsx     (listado + filtro por título/autor)
```

---

## Implementation plan

1. **Implementar `app/page.tsx`**: listado que trae toda la colección `libros` una vez, con dos inputs de filtro (título, autor) que filtran en cliente con `.filter()` + `.toLowerCase().includes()`. Muestra portada, título, autor, balda y columna de cada libro.

---

## Acceptance criteria

- [ ] El listado muestra todos los libros de la colección `libros`, incluyendo balda y columna.
- [ ] Escribir texto en el filtro de título reduce el listado a los libros cuyo título contiene ese texto (sin distinguir mayúsculas/minúsculas).
- [ ] Escribir texto en el filtro de autor reduce el listado a los libros cuyo autor contiene ese texto.

---

## Decisions

- **Sí:** Client Component (`"use client"`), porque el listado lee Firestore directamente desde el navegador.
- **Sí:** filtro de texto en el cliente (`.filter()` + `.includes()`), no en Firestore. Firestore no soporta `LIKE`; a la escala de una librería personal es la solución correcta.
- **No:** Algolia u otro motor de búsqueda. Sobreingeniería para este volumen de datos.

---

## What is **not** in this spec

- Mapa visual de la estantería.
- Edición o borrado de libros desde el listado.
- Ordenación configurable.

Cada uno de estos, si se implementa, va en su propio spec.
