# SPEC 03 — PWA instalable

> **Status:** Implementado
> **Depends on:** [[02-listado-filtro]]
> **Date:** 2026-09-26
> **Objective:** Hacer la app instalable desde el móvil como PWA (manifest + service worker básico), para que el listado de libros ([[02-listado-filtro]]) sea lo primero usable en modo standalone.

---

## Scope

**In:**

- PWA instalable desde el móvil (manifest + service worker básico).

**Out of scope (para specs futuros):**

- Notificaciones push.
- Sincronización offline de escritura (alta de libros sin conexión).

---

## Estructura de código (nuevos archivos)

```
mi-biblio/
└── app/
    ├── manifest.ts        (manifest de la PWA)
    └── sw.ts / public/sw.js  (service worker manual)
```

---

## Implementation plan

1. **Añadir manifest y service worker de la PWA** (`app/manifest.ts` + registro de un service worker simple con cache de assets estáticos). Test manual: Chrome DevTools > Application > Manifest sin errores, opción "Add to Home Screen" disponible en móvil.

---

## Acceptance criteria

- [ ] La app se puede añadir a la pantalla de inicio desde el navegador móvil (Chrome/Safari) y abre en modo standalone.
- [ ] Chrome DevTools > Application > Manifest no muestra errores.

---

## Decisions

- **Sí:** manifest + service worker manual para la PWA. Next.js 16 soporta `manifest.ts` nativo; el caso de uso es simple y no justifica una dependencia externa como `next-pwa`.
- **No:** librería de PWA de terceros.

---

## Risks

| Riesgo | Mitigación |
|---|---|
| Service worker cacheando una versión antigua de la app tras un deploy | Cache simple con estrategia "network first" para el HTML/JS de la app, y versión del cache incluida en el nombre para poder invalidarla |

---

## Verificación manual (2026-09-26)

- Instalación desde móvil y modo standalone: **OK**. Probado vía túnel HTTPS temporal (cloudflared) contra el servidor local; se instala en pantalla de inicio y abre sin barra de direcciones.
- Chrome DevTools > Application > Manifest: **OK**, sin errores.
- **Pendiente fuera del alcance de esta spec:** al entrar por el dominio del túnel (`*.trycloudflare.com`), el listado de libros no carga (Firestore no devuelve datos) tanto en móvil como en el propio PC entrando por esa misma URL. En `localhost:3000` sí carga correctamente. Causa más probable: restricción de HTTP referrers en la API key de Firebase (Google Cloud Console > APIs & Services > Credentials), que solo permite `localhost` y el dominio de producción, no dominios de túnel temporales. No es un bug de la PWA (manifest/service worker); queda para revisar aparte cuando se necesite probar con datos reales desde un dominio distinto a los ya autorizados.

## What is **not** in this spec


- Notificaciones push.
- Sincronización offline de escritura.

Cada uno de estos, si se implementa, va en su propio spec.
