# Vídeo promocional para LinkedIn

Estado a 2026-09-30: **animación construida en `promo/index.html`; falta exportar a MP4.**

## Objetivo

Vídeo corto para presentar el proyecto en LinkedIn. Solo texto en español, sin voz en off.

## Decisiones tomadas

- **Formato:** 1:1 (1080×1080), por visibilidad en el feed.
- **Sin dictado por voz:** la escena de "Dictar varios" se descartó.
- **Duración:** 42 s. Las escenas se ralentizaron respecto al primer guion (25 s) porque iban demasiado rápidas.
- **Enfoque:** animación HTML/CSS que **recrea las pantallas de la app** con sus colores, fuentes y textos reales, en lugar de capturar la app. Así no depende de Firebase ni de la cuota de Google Books, se controla el ritmo y no se expone la biblioteca real (libros de ejemplo con portadas neutras).

## Guion (tiempo real del vídeo)

| Tramo | Contenido | Rótulo |
|---|---|---|
| 0–3 s | Cae una pila de libros sin orden y aparece "¿Dónde dejé ese libro?". | (ninguno) |
| 3–15 s | Ficha nueva: se escribe el título, se busca en Google Books y se autorrellenan portada, autor, editorial e ISBN (resaltados). La balda y la columna se escriben a mano. Se guarda. | "Para añadir un libro solo necesitas el título" → "Busca en la API de Google Books" → "Y se autorrellena: portada, autor, editorial e ISBN" → "Tú solo eliges dónde va: balda y columna" |
| 15–23 s | Estantería: filtro por autor ("garcía") y pulsación larga sobre "Cien años de soledad" para mostrar Editar y Eliminar. | "Filtra tu biblioteca por título o autor" → "Editar y eliminar libros" |
| 23–29 s | Editar ficha: se cambia la columna de 1 a 3 y se pulsa "Guardar cambios". | "Corrige cualquier dato de la ficha" |
| 29–37 s | Estantería con el cambio aplicado. Pulsación larga sobre "El amor en los tiempos del cólera", Eliminar, diálogo de confirmación y la fila desaparece. | "Eliminar, siempre con confirmación" |
| 37–42 s | Cierre: "Mi biblioteca", "Cada libro, en su balda." y "Claude Code · Next.js · Firebase · Google Books". | (ninguno) |

## Estilo visual (igual que la app)

- Fondo `#E3DFD3`, tarjetas `#F7F4EC`, bordes `#C9BFA5`, texto `#2B2A28` y `#5B5748`.
- Acento burdeos `#8C3B2E`, azul petróleo `#2F4858`.
- Títulos en **Lora** (500/600); etiquetas y UI en **IBM Plex Mono**.
- Sombras duras tipo ficha (`4px 4px 0 0 #C9BFA5`) y sin bordes redondeados.
- Los rótulos explicativos van arriba, en azul petróleo con la misma sombra dura.

## Cómo está construido

`promo/index.html` es un único archivo. Todo el estado depende solo del tiempo (`render(t)`), de modo que se puede reproducir en el navegador o avanzar fotograma a fotograma.

- Vista previa: abrir el archivo. Espacio pausa, flechas ±0,5 s, barra para moverse.
- `?export` oculta los controles; `?t=6.5` muestra un instante concreto.
- `window.poner(t)` fija el instante `t` (en segundos reales, 0–42) para capturar fotogramas.

## Exportación

Se capturan fotogramas a 30 fps con un navegador sin interfaz y se unen con **ffmpeg** en un `.mp4` H.264 (`yuv420p`, 1080×1080). ffmpeg se instala con `winget install Gyan.FFmpeg`. Alternativa sin instalar nada: grabar la pantalla con OBS o la Barra de juegos de Windows (`Win+G`).
