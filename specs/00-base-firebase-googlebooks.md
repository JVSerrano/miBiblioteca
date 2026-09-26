# SPEC 00 — Base: Firebase, Google Books y modelo de datos

> **Status:** Draft
> **Depends on:** ninguno
> **Date:** 2026-09-26
> **Objective:** Dejar lista la base técnica compartida por el resto de specs: proyecto Firebase con Firestore, librería de normalización de Google Books, modelo de datos de `libros`/`config/estanteria` y reglas de acceso. Sin pantallas propias.

---

## Por qué existe este spec

El borrador original (`mi-biblio/spec/spec.md`) proponía React + Vite como stack, pero `mi-biblio/` ya estaba inicializada con `create-next-app` (Next.js 16, Tailwind 4, TypeScript). Se decidió construir sobre Next.js en lugar de rehacer el scaffold: cubre las mismas necesidades (no se usa SSR ni rutas de servidor con lógica propia) y evita tirar trabajo ya hecho. Este cambio de stack respecto al borrador es la única desviación relevante; el resto de decisiones del borrador (modelo de datos, alcance, Firebase, Google Books) se mantienen.

Este spec se separó de un spec único ("01 — Inventario y localización de libros") porque ese spec mezclaba infraestructura base con tres pantallas distintas (alta, listado, PWA) y un script de importación. Cada uno de esos ahora es su propio spec y depende de este.

---

## Scope

**In:**

- Crear proyecto Firebase y habilitar Firestore.
- Credenciales de Firebase y API key de Google Books en `.env.local`.
- `lib/firebase.ts`: inicializa la app y exporta la instancia de Firestore.
- `lib/googleBooks.ts`: función `buscarLibro(query)` que llama a la API de Google Books y devuelve datos normalizados.
- Modelo de datos: colección `libros` y documento `config/estanteria`.
- `firestore.rules` en modo de acceso abierto (sin Firebase Auth), documentado como riesgo aceptado.

**Out of scope (specs futuros que dependen de este):**

- Pantalla de alta de libro ([[01-alta-libro]]).
- Listado y filtro ([[02-listado-filtro]]).
- PWA ([[03-pwa]]).
- Script de importación inicial ([[04-importacion-inicial]]).
- Mapa visual de la estantería, Firebase Auth con usuario/contraseña, fallback a Open Library, dictado por voz, multi-estantería, préstamos/listas/valoraciones, pantalla de edición de `config/estanteria`.

---

## Data model

### Colección `libros`

```
libros (colección)
└── {docId}                (autogenerado por Firestore)
    ├── titulo: string        (obligatorio)
    ├── autor: string         (opcional)
    ├── editorial: string     (opcional)
    ├── isbn: string          (opcional, viene de Google Books)
    ├── portada: string       (opcional, URL de imagen, viene de Google Books)
    ├── balda: number
    ├── columna: number
    └── fechaAlta: timestamp  (serverTimestamp() al crear el documento)
```

- `balda` y `columna` son campos numéricos independientes, no una posición calculada.
- El ID del documento lo genera Firestore automáticamente (no se usa el ISBN, porque no todos los libros tienen uno).

### Documento de configuración

```
config/estanteria
{
  filas: number,
  columnas: number
}
```

Se crea y edita manualmente desde la consola de Firebase (sin pantalla propia en la app).

### Estructura de código (nuevos archivos)

```
mi-biblio/
├── .env.local                     (credenciales Firebase + API key Google Books, no versionado)
├── lib/
│   ├── firebase.ts                (inicializa app + Firestore con la config de env vars)
│   └── googleBooks.ts             (buscarLibro(query) -> datos normalizados; usado por [[01-alta-libro]] y [[04-importacion-inicial]])
└── firestore.rules                (reglas de acceso abierto, documentadas como riesgo aceptado)
```

---

## Implementation plan

1. **Crear proyecto Firebase y obtener credenciales.** Crear proyecto en la consola de Firebase, habilitar Firestore (modo producción, reglas abiertas de lectura/escritura), copiar la config web a `mi-biblio/.env.local` como variables `NEXT_PUBLIC_FIREBASE_*`. Sistema funcional: la app sigue siendo el scaffold de Next.js, sin cambios de código todavía.
2. **Obtener API key de Google Books** y añadirla a `.env.local` como `GOOGLE_BOOKS_API_KEY` (o `NEXT_PUBLIC_...` si se llama desde cliente). Documentar en un comentario en `.env.local.example` qué variables hacen falta.
3. **Añadir dependencia `firebase`** al proyecto e implementar `lib/firebase.ts`, que exporta la instancia de Firestore. Test manual: importar `db` en un componente temporal y hacer un `console.log` de una lectura de la colección `libros` (vacía al principio) sin errores en consola.
4. **Implementar `lib/googleBooks.ts`** con una función `buscarLibro(query: string)` que llama a la API de Google Books y devuelve `{ titulo, autor, editorial, isbn, portada }` normalizado (o `null` si no hay resultados). Test manual: probar la función desde un script suelto o consola de Node con un título real.
5. **Escribir `firestore.rules`** con acceso de lectura/escritura abierto y desplegarlas (`firebase deploy --only firestore:rules` o pegado manual en consola). Documentar en el propio archivo el riesgo aceptado.

---

## Acceptance criteria

- [ ] Existe un proyecto Firebase con Firestore habilitado y credenciales en `.env.local`.
- [ ] `buscarLibro(query)` devuelve `{ titulo, autor, editorial, isbn, portada }` normalizado para un título real, y `null` si no hay resultados.
- [ ] Las `firestore.rules` desplegadas permiten lectura/escritura sin autenticación.
- [ ] No hay backend propio: ni rutas de API de Next.js ni servidor Express intermedio para leer/escribir libros (todo acceso a Firestore es directo desde el cliente).

---

## Decisions

- **Sí:** Next.js (ya inicializado) en vez de React+Vite del borrador original. Evita rehacer el scaffold; no se necesita SSR propio para esta app.
- **No:** Vite. Habría significado descartar trabajo ya existente sin beneficio funcional.
- **Sí:** carpeta `specs/` en la raíz del repo (`D:\projects\MisLibros\specs`), no dentro de `mi-biblio/`.
- **Sí:** `balda`/`columna` como campos numéricos independientes, no una posición calculada.
- **Sí:** Firestore en modo de acceso abierto (sin Firebase Auth) en v1. Riesgo aceptado por tratarse de datos no sensibles; Firebase Auth con usuario/contraseña compartido queda como mejora futura documentada.

---

## Risks

| Riesgo | Mitigación |
|---|---|
| Firestore con acceso abierto (sin Auth) | Riesgo aceptado conscientemente por no ser datos sensibles; documentado como mejora futura (Firebase Auth con credencial compartida) |
| `.env.local` con credenciales subido por error al repo | Verificar que `.env.local` está en `.gitignore` (Next.js lo incluye por defecto) antes del primer commit con credenciales |

---

## What is **not** in this spec

- Cualquier pantalla de la app (alta, listado, PWA).
- Script de importación.
- Mapa visual de la estantería, Firebase Auth con login, fallback a Open Library, dictado por voz integrado, multi-estantería, préstamos/listas/valoraciones, pantalla de edición de `config/estanteria`.

Cada uno de estos, si se implementa, va en su propio spec.
