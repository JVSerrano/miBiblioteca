# SPEC 05 — Botón de añadir libro en el listado

> **Status:** Aprobado
> **Depends on:** [[01-alta-libro]], [[02-listado-filtro]]
> **Date:** 2026-09-28
> **Objective:** Añadir un botón visible en la pantalla de listado que lleve al formulario de alta de libro (`/nuevo`).

---

## Scope

**In:**

- Botón/enlace en la cabecera de `app/page.tsx`, junto al título "Mi biblioteca", que navega a `/nuevo`.
- El botón está siempre visible, en todos los estados del listado (cargando, error, vacío, con resultados).

**Out of scope (para specs futuros):**

- Cambios en `app/nuevo/page.tsx` (el formulario de alta ya existe, spec [[01-alta-libro]]).
- Cualquier otro punto de entrada al alta (por ejemplo, atajo de teclado o acceso desde otra pantalla).

---

## Data model

No se introduce ningún dato nuevo ni cambia el modelo de `libros`. Es un cambio puramente de UI/navegación.

---

## Estructura de código (archivos modificados)

```
mi-biblio/
└── app/
    └── page.tsx     (añade botón de navegación a /nuevo en la cabecera)
```

---

## Implementation plan

1. **Añadir botón en `app/page.tsx`**: en la cabecera (`<div className="mb-6 flex items-baseline justify-between ...">`), junto al `<h1>Mi biblioteca</h1>`, añadir un `next/link` a `/nuevo` con el texto "+ Añadir libro", estilizado en línea con el resto de la app (IBM Plex Mono, paleta de colores existente: `#8C3B2E`, `#2F4858`, `#F7F4EC`, `#C9BFA5`). Sistema funcional: al hacer clic navega al formulario de alta existente.

---

## Acceptance criteria

- [ ] En la pantalla de listado (`/`) hay un botón con el texto "+ Añadir libro" visible en la cabecera. Que quede bien integrado tambien para versiones moviles.
- [ ] El botón está visible en todos los estados: cargando, error, listado vacío y listado con resultados.
- [ ] Al hacer clic en el botón, la app navega a `/nuevo` (formulario de alta de [[01-alta-libro]]).
- [ ] El estilo del botón es coherente con el resto de la interfaz (tipografía y paleta de colores ya usadas en `app/page.tsx`).

---

## Decisions

- **Sí:** botón de texto en la cabecera, siempre visible, en vez de un FAB flotante o un botón condicionado al estado de carga — mantiene la navegación simple y predecible.
- **No:** botón flotante (FAB). Descartado por el usuario a favor de la cabecera, que ya es el punto fijo de la pantalla.

---

## What is **not** in this spec

- Cambios al formulario de alta (`/nuevo`).
- Otros puntos de entrada al alta de libros.

Cada uno de estos, si se implementa, va en su propio spec.
