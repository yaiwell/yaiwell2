'use client';

import * as Sentry from '@sentry/nextjs';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { ErrorView } from '@/components/features/error';

interface LocaleErrorProps {
  error: Error & { digest?: string };
  /**
   * Limpia el estado del boundary y vuelve a renderizar los hijos SIN
   * volver a pedir datos. Inútil frente a un Postgres caído.
   */
  reset: () => void;
  /**
   * Next 16.2 introdujo `unstable_retry`: re-fetchea y re-renderiza el
   * subárbol. Es el único que sirve para la causa real de esta pantalla
   * (una consulta que falló), por eso lo preferimos. Lo declaramos
   * opcional para no romper si una minor lo retira o lo renombra al
   * estabilizarlo — ver `node_modules/next/dist/docs/01-app/
   * 03-api-reference/03-file-conventions/error.md`.
   */
  unstable_retry?: () => void;
}

/**
 * Error boundary por locale: la red de seguridad de toda la app pública.
 *
 * Cubre absolutamente todo lo que cuelga de `/[locale]` — landing,
 * `/buscar`, ficha de centro, flujo de reserva, `/mis-reservas`,
 * `/admin`, `/cuenta` y los layouts anidados de esas áreas (un
 * `error.tsx` NO captura el layout de su propio segmento, pero sí los
 * de los segmentos hijos). Antes de existir este archivo, cualquier
 * excepción caía en `global-error.tsx` y el usuario recibía una
 * pantalla en blanco sin marca, sin idioma y sin salida.
 *
 * Como vive DENTRO de `[locale]/layout.tsx`, la cabecera, el footer y
 * el skip link siguen en pantalla: el usuario conserva la navegación
 * aunque el contenido haya reventado.
 *
 * Requisito de Next.js: los error boundaries de App Router son Client
 * Components.
 */
export default function LocaleError({ error, reset, unstable_retry }: LocaleErrorProps) {
  const t = useTranslations('error');

  useEffect(() => {
    // Next atrapa el error en el boundary, así que el SDK de cliente no
    // lo ve pasar: si no lo reportamos aquí, no llega a Sentry. Mismo
    // patrón que `global-error.tsx`.
    Sentry.captureException(error);
  }, [error]);

  return (
    <ErrorView
      variant="page"
      title={t('title')}
      description={t('description')}
      retryLabel={t('retry')}
      onRetry={unstable_retry ?? reset}
      secondaryLabel={t('backHome')}
      secondaryHref="/"
      digest={error.digest}
      digestLabel={t('digestLabel')}
      dataComponent="locale-error"
    />
  );
}
