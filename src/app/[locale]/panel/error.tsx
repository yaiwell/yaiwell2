'use client';

import { useEffect } from 'react';

/**
 * Error boundary del área `/panel`.
 *
 * Captura excepciones lanzadas durante el render (server o client) del
 * panel del proveedor. En Vercel/Next.js el mensaje real queda oculto
 * por el "digest"; mostrar el digest visible nos permite cruzarlo con
 * los logs de Sentry para diagnóstico.
 *
 * Requisito de Next.js: los error boundaries de App Router deben ser
 * Client Components (`'use client'`).
 */
export default function PanelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log local para que aparezca en la consola del navegador durante
    // QA en producción. Sentry ya captura por su lado vía
    // `instrumentation-client`.
    console.error('[panel/error]', error);
  }, [error]);

  return (
    <section className="mx-auto flex max-w-md flex-col gap-4 px-4 py-16 text-center">
      <h1 className="font-serif text-2xl text-stone-900 dark:text-stone-50">
        El panel ha tenido un problema
      </h1>
      <p className="text-sm text-stone-600 dark:text-stone-400">
        Lo estamos investigando. Si el problema persiste, comparte el código de error con soporte.
      </p>
      {error.digest ? (
        <p className="rounded-md bg-stone-100 px-3 py-2 font-mono text-xs text-stone-700 dark:bg-stone-800 dark:text-stone-300">
          digest: {error.digest}
        </p>
      ) : null}
      <button
        type="button"
        onClick={reset}
        className="mx-auto inline-flex items-center justify-center rounded-full bg-stone-900 px-5 py-2 text-sm font-medium text-stone-50 transition-colors hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900"
      >
        Reintentar
      </button>
    </section>
  );
}
