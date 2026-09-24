'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  /** Re-render sin re-fetch. Ver `[locale]/error.tsx`. */
  reset: () => void;
  /** Re-fetch + re-render (Next 16.2). Preferido; opcional por si cambia. */
  unstable_retry?: () => void;
}

/**
 * Boundary global de errores de Next App Router — último recurso.
 *
 * Se dispara cuando el error escapa de `[locale]/error.tsx` o cuando
 * revienta el propio `RootLayout`. Desde que existe el boundary por
 * locale, este archivo es un caso raro: antes saltaba en CUALQUIER
 * fallo, porque no había nada entre él y las páginas.
 *
 * Aquí el layout raíz ya no está montado, así que NO hay:
 *  - hoja de estilos (`globals.css` la importa el layout raíz), por eso
 *    los estilos van inline como excepción documentada a §6.bis;
 *  - `NextIntlClientProvider`, por eso el copy va en castellano (locale
 *    por defecto) en lugar de pasar por `t()`. Traducirlo exigiría
 *    cargar mensajes desde el mismo árbol que acaba de fallar;
 *  - providers de Clerk, tema o ubicación.
 *
 * Requisito de Next.js: `global-error` debe emitir su propia `<html>` y
 * `<body>`, y ser Client Component.
 */
export default function GlobalError({ error, reset, unstable_retry }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body style={styles.body}>
        <main style={styles.card} role="alert">
          <p style={styles.brand}>Yaiwell</p>
          <h1 style={styles.title}>Algo se ha roto por nuestro lado</h1>
          <p style={styles.text}>
            No hemos podido cargar la página. Suele ser temporal: vuelve a intentarlo en unos
            segundos.
          </p>
          {error.digest ? <p style={styles.digest}>Código de error: {error.digest}</p> : null}
          <div style={styles.actions}>
            <button type="button" onClick={unstable_retry ?? reset} style={styles.primary}>
              Reintentar
            </button>
            {/* `<a>` nativo y no un `Link`: la navegación cliente
                depende del árbol de React que acaba de reventar, y una
                navegación suave volvería a montarlo. Aquí queremos una
                recarga completa del documento; el middleware redirige
                `/` al locale que negocie. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- recarga completa deliberada: ver comentario de arriba. */}
            <a href="/" style={styles.secondary}>
              Volver a inicio
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}

/**
 * Estilos inline mínimos. No podemos usar Tailwind porque la hoja de
 * estilos global se importa desde el layout raíz, que en este punto no
 * existe. Los valores replican a ojo los tokens de marca (crema cálido
 * + plum) para que la pantalla no parezca de otra aplicación.
 */
const styles = {
  body: {
    margin: 0,
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    backgroundColor: '#fdfbf7',
    color: '#2b1d26',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  },
  card: {
    maxWidth: '32rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    textAlign: 'center',
  },
  brand: {
    margin: 0,
    fontSize: '0.75rem',
    fontWeight: 600,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    opacity: 0.6,
  },
  title: { margin: 0, fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.2 },
  text: { margin: 0, fontSize: '0.95rem', lineHeight: 1.6, opacity: 0.75 },
  digest: {
    margin: 0,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: '0.75rem',
    opacity: 0.6,
  },
  actions: {
    marginTop: '8px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    justifyContent: 'center',
  },
  primary: {
    minHeight: '44px',
    padding: '0 24px',
    borderRadius: '999px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 600,
    backgroundColor: '#3d2230',
    color: '#fdfbf7',
  },
  secondary: {
    minHeight: '44px',
    padding: '0 24px',
    borderRadius: '999px',
    border: '1px solid rgba(43,29,38,0.2)',
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: '0.875rem',
    fontWeight: 600,
    textDecoration: 'none',
    color: '#2b1d26',
  },
} satisfies Record<string, React.CSSProperties>;
