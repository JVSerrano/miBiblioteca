This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

> **Importante:** Next.js solo lee `.env.local` al arrancar el servidor. Si creas o modificas esas variables (por ejemplo las de Firebase) con `npm run dev` ya en marcha, reinicia el proceso (`Ctrl+C` y `npm run dev` de nuevo) o los cambios no se aplicarán y verás errores de carga de datos aunque la configuración sea correcta.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Despliegue en Firebase Hosting

La app es un export estático de Next.js (`output: "export"`, genera `out/`) que se publica en Firebase Hosting.

**Primera vez:**

1. Inicia sesión: `firebase login`.
2. Indica tu proyecto de Firebase. Copia `.firebaserc.example` a `.firebaserc` y sustituye `<PROYECTO>` por el ID de tu proyecto, o ejecuta `firebase use --add`. `.firebaserc` no se sube a git.
3. Ten `.env.local` con las variables `NEXT_PUBLIC_*` (ver `.env.local.example`). Se incrustan en el bundle en el momento del build, así que el build debe hacerse en local.
4. En Google Cloud Console > APIs & Services > Credentials, añade `https://<PROYECTO>.web.app/*` y `https://<PROYECTO>.firebaseapp.com/*` a los HTTP referrers de la API key de Firebase y de la de Google Books (sin quitar `localhost`).

**Cada despliegue:**

```bash
npm run deploy
```

Ejecuta `next build` y `firebase deploy --only hosting`. La app queda en `https://<PROYECTO>.web.app`.
