'use client';

import * as Sentry from '@sentry/nextjs';
import NextError from 'next/error';
import { useEffect } from 'react';

/**
 * Boundary global de errores de Next App Router.
 *
 * Se dispara SOLO cuando un error escapa del `error.tsx` por locale o
 * cuando el propio `RootLayout` revienta. En ese punto el layout no
 * está disponible, por eso el componente debe emitir su propia `<html>`
 * y `<body>` — los intls/Clerk providers también están fuera de
 * alcance.
 *
 * Aquí solo hacemos dos cosas:
 *   1. Reportar el error a Sentry para que llegue al dashboard.
 *   2. Renderizar la pantalla de error genérica de Next (sin i18n,
 *      sin estilos custom — sería peligroso depender de cualquier
 *      cosa que pudiera ser la causa del fallo).
 *
 * Una vez en Fase 1 con el flujo de reserva real, este componente
 * añadirá un CTA "Ir al inicio" para que el usuario no se quede
 * atascado en una pantalla muerta.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body>
        {/* NextError es el componente built-in que renderiza la pantalla
            de error tal cual la verías en una página de pages router.
            Suficiente como fallback de último recurso. */}
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
