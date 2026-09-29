# SPEC 06 — Editar y eliminar libro desde el listado

> **Status:** Implementado
> **Depends on:** [[01-alta-libro]], [[02-listado-filtro]], [[05-boton-anadir-libro]]
> **Date:** 2026-09-28
> **Objective:** Permitir editar y eliminar cada libro desde el listado (acciones reveladas por hover/mantener pulsado, con icono de acceso alternativo) y volver al listado desde el título "Mi biblioteca" en las pantallas de alta y edición.

---

## Scope

**In:**

- En cada fila del listado (`app/page.tsx`), acciones "Editar" y "Eliminar":
  - En escritorio, las acciones aparecen al pasar el ratón (`hover`) sobre la fila.
  - En móvil, las acciones aparecen al mantener pulsada la fila (long-press), y solo en esa fila; se ocultan al tocar fuera.
  - Además, un icono discreto "⋮" siempre visible al final de cada fila (en ambos breakpoints) que, al pulsarlo/hacer clic, revela las mismas acciones sin depender de hover ni long-press. Sirve de pista visual de que la fila es interactiva y de acceso alternativo.
- Página `app/editar/[id]/page.tsx`: reutiliza la UI y lógica del formulario de `app/nuevo/page.tsx` (mismos campos: título, autor, editorial, ISBN, portada, balda, columna; mismo botón "Buscar" contra Google Books), precargada con los datos del libro (`getDoc`) y que al guardar hace `updateDoc` en vez de `addDoc`.
- Eliminar libro: al pulsar "Eliminar" se muestra un diálogo de confirmación propio (estilo de la app) con el título del libro y botones "Cancelar" / "Eliminar". Al confirmar, `deleteDoc` borra el documento de Firestore de forma definitiva y el libro desaparece del listado.
- En `app/nuevo/page.tsx` y en el nuevo `app/editar/[id]/page.tsx`, el título de cabecera "Mi biblioteca" (sustituye a "Alta de libro" / equivalente) es un `next/link` que navega a `/`.

**Out of scope (para specs futuros):**

- Papelera o recuperación de libros eliminados (soft delete).
- Edición masiva o selección múltiple de libros.
- Deshacer ("undo") tras eliminar.
- Historial de cambios de un libro editado.

---

## Data model

No se introduce ninguna colección ni campo nuevo. `editar` hace `updateDoc` sobre el mismo documento de `libros` que ya usa [[01-alta-libro]]; `eliminar` hace `deleteDoc` sobre el mismo documento. No se añade ningún campo de borrado lógico.

---

## Estructura de código (archivos nuevos/modificados)

```
mi-biblio/
└── app/
    ├── page.tsx              (fila del listado: hover/long-press, icono "⋮", acciones editar/eliminar, diálogo de confirmación, deleteDoc)
    ├── nuevo/
    │   └── page.tsx           (cabecera: "Mi biblioteca" como Link a "/")
    └── editar/
        └── [id]/
            └── page.tsx       (nuevo — formulario de edición, precarga con getDoc, guarda con updateDoc, cabecera "Mi biblioteca" como Link a "/")
```

---

## Implementation plan

1. **Cabecera de `app/nuevo/page.tsx`**: sustituir el `<h1>Alta de libro</h1>` fijo por un `next/link` a `/` con el texto "Mi biblioteca", manteniendo la tipografía Lora y estilo de cabecera ya usado en `app/page.tsx`. Sistema funcional: desde `/nuevo`, clicar el título vuelve al listado.

2. **Crear `app/editar/[id]/page.tsx`**: duplicar la estructura de `app/nuevo/page.tsx` (mismos campos y estilos), pero:
   - Al montar, cargar el libro con `getDoc(doc(db, "libros", params.id))` y precargar los campos del formulario.
   - El botón de guardar hace `updateDoc` sobre ese documento en vez de `addDoc`.
   - La cabecera usa el mismo patrón "Mi biblioteca" → `/` del paso 1.
   - Tras guardar, redirigir a `/` (a diferencia de `/nuevo`, que limpia el formulario para dar de alta el siguiente). Sistema funcional: se puede editar un libro y ver el cambio reflejado en el listado.

3. **Acciones editar/eliminar en `app/page.tsx`**: en cada `<li>` de la lista, añadir:
   - Icono "⋮" siempre visible al final de la fila, que al hacer clic revela (o alterna) dos botones: "Editar" (enlace a `/editar/[id]`) y "Eliminar".
   - Comportamiento adicional en desktop: `hover` sobre la fila también revela esos botones.
   - Comportamiento adicional en móvil: mantener pulsada la fila (long-press, p. ej. `onTouchStart`/`onTouchEnd` con temporizador) revela los botones solo en esa fila; tocar fuera de la fila los oculta.
   - Estilos coherentes con la paleta y tipografía existentes (bordes rectos, `#8C3B2E`/`#2F4858`/`#F7F4EC`/`#C9BFA5`, IBM Plex Mono). Sistema funcional: se pueden revelar y usar las acciones de cada fila sin recargar la página.

4. **Eliminar libro**: al pulsar "Eliminar" en una fila, abrir un diálogo de confirmación propio (mismo estilo visual que el resto de la app) mostrando el título del libro y botones "Cancelar" / "Eliminar". Al confirmar, ejecutar `deleteDoc(doc(db, "libros", id))` y quitar el libro de la lista local (o recargar el listado). "Cancelar" cierra el diálogo sin cambios. Sistema funcional: un libro eliminado deja de aparecer en el listado tras confirmar.

---

## Acceptance criteria

- [ ] En escritorio, al pasar el ratón sobre una fila del listado aparecen los botones "Editar" y "Eliminar".
- [ ] En móvil, al mantener pulsada una fila aparecen los botones "Editar" y "Eliminar" solo en esa fila; al tocar fuera, desaparecen.
- [ ] Cada fila muestra un icono "⋮" siempre visible que, al pulsarlo, revela las mismas acciones "Editar" y "Eliminar" sin necesidad de hover ni long-press.
- [ ] Pulsar "Editar" en una fila navega a `/editar/[id]` con el formulario precargado con los datos actuales del libro (título, autor, editorial, ISBN, portada, balda, columna).
- [ ] Guardar cambios en `/editar/[id]` actualiza el documento en Firestore y, al volver al listado, se ven los datos actualizados.
- [ ] Pulsar "Eliminar" en una fila abre un diálogo de confirmación propio (no el `confirm()` nativo) con el título del libro.
- [ ] Confirmar el borrado elimina el documento de Firestore de forma definitiva y el libro desaparece del listado.
- [ ] Cancelar el diálogo de confirmación no elimina el libro ni modifica el listado.
- [ ] En `/nuevo`, el título "Mi biblioteca" de la cabecera es clicable y navega a `/`.
- [ ] En `/editar/[id]`, el título "Mi biblioteca" de la cabecera es clicable y navega a `/`.
- [ ] El estilo de las nuevas acciones (iconos, botones, diálogo) es coherente con la tipografía y paleta ya usadas en la app.

---

## Decisions

- **Sí:** revelado combinado hover (desktop) + mantener pulsado (móvil), más un icono "⋮" siempre visible como pista y acceso alternativo. Evita el ruido visual de botones fijos y resuelve el problema de que el long-press es un gesto oculto sin affordance en táctil.
- **No:** botones de editar/eliminar fijos y siempre visibles en cada fila. Descartado por el propio usuario por el ruido visual que generaría.
- **No:** menú de acciones abierto con un tap simple sobre toda la fila. Descartado a favor de mantener el tap/click sobre la fila libre para una futura navegación al detalle del libro, y usar el icono "⋮" como punto de entrada explícito a las acciones.
- **Sí:** editar reutiliza el formulario de alta (`/editar/[id]` con la misma UI que `/nuevo`) en vez de edición inline en la fila. Menos trabajo de maquetación y mantiene consistencia con el flujo de alta ya existente ([[01-alta-libro]]).
- **Sí:** confirmación de borrado con diálogo propio en el estilo de la app, no `confirm()` nativo. Evita accidentes y mantiene la identidad visual también en ese momento.
- **Sí:** borrado definitivo (`deleteDoc`) sin soft delete ni papelera. No hay necesidad actual de recuperar libros eliminados, y ya existe confirmación previa que reduce el riesgo de error.
- **Sí:** el título "Mi biblioteca" como enlace de vuelta al listado, en vez de (o además de) un botón "← Volver" explícito. Mismo patrón en `/nuevo` y `/editar/[id]`, consistente con el patrón habitual de cabeceras clicables.

---

## What is **not** in this spec

- Papelera o recuperación de libros eliminados.
- Edición o eliminación masiva (selección múltiple).
- Deshacer tras eliminar.
- Historial de cambios de un libro.

Cada uno de estos, si se implementa, va en su propio spec.
