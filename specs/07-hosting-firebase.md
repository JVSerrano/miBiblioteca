# SPEC 07 — Publicar la app en Firebase Hosting

> **Status:** Implementado
> **Depends on:** [[00-base-firebase-googlebooks]], [[02-listado-filtro]], [[03-pwa]], [[06-editar-eliminar-libro]]
> **Date:** 2026-09-29
> **Objective:** Publicar la app como sitio estático en Firebase Hosting (`https://<PROYECTO>.web.app`) para poder usarla desde el móvil y el PC sin depender de `localhost` ni de túneles temporales.

---

## Por qué existe este spec

Hasta ahora la app solo es accesible en `localhost:3000` o mediante túneles temporales (ver la verificación manual de [[03-pwa]]). Sin una URL estable no se puede instalar la PWA de forma útil ni consultar la biblioteca desde el móvil cómodamente.

La app ya es 100 % cliente: Firestore y Google Books se llaman desde el navegador y no hay rutas de servidor ni SSR. Por eso basta un export estático servido por Firebase Hosting, sin necesidad de App Hosting (que exige plan Blaze).

El único obstáculo técnico es la ruta dinámica `app/editar/[id]/page.tsx` de [[06-editar-eliminar-libro]]: los IDs de Firestore no se conocen en build, y un export estático necesita todas las rutas de antemano. Este spec la sustituye por `/editar?id=<docId>`.

---

## Scope

**In:**

- Configurar Next.js como export estático (`output: "export"` en `next.config.ts`), que genera la carpeta `out/`.
- Cambiar la edición de libro de `/editar/[id]` a `/editar?id=<docId>` (página cliente que lee `id` con `useSearchParams`), y actualizar los enlaces "Editar" del listado.
- Configurar Firebase Hosting en `mi-biblio/firebase.json` (`public: "out"`) sobre el proyecto ya definido en `.firebaserc` (`<PROYECTO>`).
- Cabeceras de Hosting para que `sw.js` no se cachee en el CDN (`Cache-Control: no-cache`), de modo que un deploy nuevo llegue a los dispositivos que ya tienen la PWA.
- Script `npm run deploy` en `package.json`: `next build` + `firebase deploy --only hosting`.
- Autorizar el dominio de Hosting en las restricciones de HTTP referrers de las API keys de Firebase y de Google Books (paso manual en Google Cloud Console).
- Documentar en `mi-biblio/README.md` el flujo de despliegue.

**Out of scope (para specs futuros):**

- Firebase Auth / login y reglas de Firestore restringidas (spec propio; ver Riesgos).
- Dominio propio.
- Despliegue automático con GitHub Actions o previews por rama.
- Firebase App Hosting / SSR.
- Cambios visuales o funcionales en el listado, alta o edición más allá del cambio de URL de edición.
- Mejoras de la PWA (iconos propios, modo offline avanzado).

---

## Data model

No se introduce ningún dato nuevo. No cambian `libros` ni `config/estanteria` ([[00-base-firebase-googlebooks]]). El único cambio de "contrato" es la URL de edición: `/editar/[id]` pasa a `/editar?id=<docId>`.

---

## Estructura de código (archivos nuevos/modificados)

```
mi-biblio/
├── next.config.ts            (output: "export")
├── firebase.json             (añade bloque "hosting": public "out", cabeceras de sw.js)
├── package.json              (script "deploy")
├── README.md                 (sección de despliegue)
└── app/
    ├── page.tsx              (enlace "Editar" -> /editar?id=<id>)
    └── editar/
        ├── [id]/page.tsx     (se elimina)
        └── page.tsx          (nuevo, mismo contenido que la anterior; lee id con useSearchParams dentro de <Suspense>)
```

---

## Implementation plan

1. **Cambiar la edición a `/editar?id=`**: mover `app/editar/[id]/page.tsx` a `app/editar/page.tsx`, sustituir `params` por `useSearchParams().get("id")` (con el componente envuelto en `<Suspense>`, requisito de Next para prerenderizar), mostrar el estado de error existente si falta `id`, y actualizar el enlace "Editar" de `app/page.tsx`. Sistema funcional: en `npm run dev` se edita un libro desde el listado igual que antes.

2. **Activar el export estático**: añadir `output: "export"` a `next.config.ts` y ejecutar `npm run build`. Corregir lo que impida generar `out/` (por ejemplo, `manifest.ts` debe seguir generándose como `manifest.webmanifest`). Sistema funcional: `out/` contiene `index.html`, `nuevo`, `editar` y `manifest.webmanifest`, y sirviéndolo en local (`npx serve out`) la app carga el listado.

3. **Configurar Hosting**: añadir el bloque `hosting` a `firebase.json` con `public: "out"` y una regla `headers` para `/sw.js` con `Cache-Control: no-cache`. Sistema funcional: `firebase emulators:start --only hosting` (o `firebase hosting:channel:deploy`, si se prefiere no tocar producción) sirve la app.

4. **Script de despliegue**: añadir `"deploy": "next build && firebase deploy --only hosting"` a `package.json` y documentarlo en `README.md` (login previo con `firebase login`, comando, URL resultante). Sistema funcional: `npm run deploy` publica en `https://<PROYECTO>.web.app`.

5. **Autorizar el dominio en las API keys** (manual, Google Cloud Console > APIs & Services > Credentials): añadir a los HTTP referrers de la key de Firebase y de la key de Google Books `https://<PROYECTO>.web.app/*` y `https://<PROYECTO>.firebaseapp.com/*`, sin quitar `localhost`. Sistema funcional: desde la URL pública el listado carga datos y la búsqueda de Google Books responde.

---

## Acceptance criteria

- [ ] `npm run build` termina sin errores y genera la carpeta `out/`.
- [ ] `npm run deploy` publica sin errores y `https://<PROYECTO>.web.app` responde con HTTPS.
- [ ] Desde el navegador del móvil, la URL pública muestra el listado de libros con los datos reales de Firestore.
- [ ] Desde el navegador del PC, la URL pública muestra el mismo listado.
- [ ] Desde la URL pública se puede dar de alta un libro (`/nuevo`), incluida la búsqueda contra Google Books, y aparece en el listado.
- [ ] Desde la URL pública, "Editar" abre `/editar?id=<docId>` con el formulario precargado, y guardar actualiza el libro.
- [ ] Desde la URL pública, eliminar un libro (con su diálogo de confirmación) lo borra del listado.
- [ ] Recargar directamente `https://<PROYECTO>.web.app/editar?id=<docId>` (F5) sigue mostrando el libro, sin error 404.
- [ ] La PWA se puede instalar desde el móvil usando la URL pública y abre en modo standalone.
- [ ] Tras un segundo `npm run deploy` con un cambio visible, la PWA ya instalada muestra el cambio tras abrirla (recargando como máximo una vez).
- [ ] La ruta `app/editar/[id]/` ya no existe y `app/page.tsx` no contiene enlaces a `/editar/${id}`.
- [ ] `scripts/service-account.json` y `.env.local` no aparecen en `out/` ni se suben a Hosting.

---

## Decisions

- **Sí:** Firebase Hosting estático (`output: "export"`). La app es 100 % cliente y el plan Spark es gratuito y sin tarjeta.
- **No:** Firebase App Hosting (SSR). Exige plan Blaze y build en la nube; es sobredimensionado para una app sin lógica de servidor.
- **Sí:** cambiar `/editar/[id]` a `/editar?id=<docId>`. Un export estático necesita conocer todas las rutas en build y los IDs de Firestore son dinámicos. Alternativa descartada: `generateStaticParams` + rewrite a un shell, más frágil y con más código.
- **Sí:** dominio por defecto de Firebase (`<PROYECTO>.web.app`). HTTPS incluido y cero configuración.
- **No:** dominio propio, para no añadir pasos de DNS fuera del código.
- **Sí:** despliegue manual con `npm run deploy`. Se publica cuando el usuario decide y no hay secretos ni workflows que mantener.
- **No:** GitHub Actions. Más superficie de fallo para un proyecto de un solo usuario.
- **Sí:** mantener las reglas de Firestore abiertas y aceptar el riesgo, con Auth en un spec futuro. Decisión del usuario; ya estaba documentado como riesgo aceptado en [[00-base-firebase-googlebooks]].
- **Sí:** build local (no en la nube), de modo que las variables `NEXT_PUBLIC_*` de `.env.local` se incrustan en el bundle en el momento del build.

---

## Risks

| Riesgo | Mitigación |
|---|---|
| Con URL pública y reglas abiertas, cualquiera que conozca la URL puede leer, editar y borrar libros | Riesgo aceptado explícitamente. La URL no se difunde. Firebase Auth + reglas restringidas queda para un spec propio y se recomienda abordarlo pronto. |
| La API key, restringida por referrer, rechaza el nuevo dominio (mismo síntoma que en la verificación de [[03-pwa]]: listado vacío) | El paso 5 del plan añade los dominios `web.app` y `firebaseapp.com` a las dos keys. Verificarlo en el criterio de aceptación del móvil. |
| El service worker sirve una versión antigua tras un deploy | `sw.js` con `Cache-Control: no-cache` en Hosting y estrategia network-first ya existente en [[03-pwa]]. |
| `manifest.ts` o `useSearchParams` rompen el build estático | El paso 2 lo detecta en `npm run build` antes de publicar; `<Suspense>` en `/editar`. |
| Los marcadores o enlaces antiguos a `/editar/<id>` dejan de funcionar | Aceptado: la URL de edición solo se genera desde el listado, no se comparte. |

---

## What is **not** in this spec

- Login, Firebase Auth o reglas de Firestore restringidas.
- Dominio propio.
- Despliegue automático (GitHub Actions) o canales de preview.
- App Hosting / SSR.
- Cambios de UI o de funcionalidad, salvo la URL de edición.

Cada uno de estos, si se implementa, va en su propio spec.
