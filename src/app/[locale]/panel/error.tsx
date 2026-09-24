'use client';

import * as Sentry from '@sentry/nextjs';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { ErrorView } from '@/components/features/error';

interface PanelErrorProps {
  error: Error & { digest?: string };
  /** Re-render sin re-fetch. Ver `[locale]/error.tsx`. */
  reset: () => void;
  /** Re-fetch + re-render (Next 16.2). Preferido; opcional por si cambia. */
  unstable_retry?: () => void;
}

/**
 * Error boundary del área `/panel`.
 *
 * Existe además del boundary por locale porque se renderiza DENTRO de
 * `panel/layout.tsx`: el proveedor conserva la sidebar y puede saltar a
 * otra sección sin perder el contexto de gestión. Si el que falla es el
 * propio layout del panel (por ejemplo `requireCurrentProvider`), el
 * error sube al boundary de locale, que es lo correcto.
 *
 * En Vercel/Next.js el mensaje real queda oculto tras el `digest`;
 * mostrarlo permite cruzarlo con la traza de Sentry.
 *
 * Requisito de Next.js: los error boundaries de App Router deben ser
 * Client Components (`'use client'`).
 */
export default function PanelError({ error, reset, unstable_retry }: PanelErrorProps) {
  const t = useTranslations('error');

  useEffect(() => {
    // Log local para QA en producción desde la consola del navegador.
    console.error('[panel/error]', error);
    // Y reporte explícito: Next atrapa el error en el boundary, así que
    // el SDK de cliente no lo ve pasar por sí solo.
    Sentry.captureException(error);
  }, [error]);

  return (
    <ErrorView
      variant="panel"
      title={t('panel.title')}
      description={t('panel.description')}
      retryLabel={t('retry')}
      onRetry={unstable_retry ?? reset}
      secondaryLabel={t('panel.backToDashboard')}
      secondaryHref="/panel"
      digest={error.digest}
      digestLabel={t('digestLabel')}
      dataComponent="panel-error"
    />
  );
}
