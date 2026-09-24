'use client';

import { AlertTriangle } from 'lucide-react';

import { Link } from '@/i18n/navigation';

import {
  errorViewCard,
  errorViewDescription,
  errorViewIcon,
  errorViewRoot,
  errorViewStyles as s,
  errorViewTitle,
} from './ErrorView.styles';
import type { ErrorViewProps } from './ErrorView.types';

/**
 * Pantalla de error compartida por todos los boundaries de la app.
 *
 * Existe para que `[locale]/error.tsx` y `panel/error.tsx` no sean dos
 * copias del mismo JSX: ambos resuelven sus propios textos con
 * `useTranslations` y delegan aquí el render. Los boundaries de App
 * Router son Client Components, así que este componente también lo es
 * (recibe un handler `onRetry`).
 *
 * El `role="alert"` hace que un lector de pantalla anuncie el error en
 * cuanto sustituye al contenido, que es justo el momento en que el
 * usuario necesita enterarse.
 */
export function ErrorView({
  variant = 'page',
  title,
  description,
  retryLabel,
  onRetry,
  secondaryLabel,
  secondaryHref,
  digest,
  digestLabel,
  dataComponent = 'error-view',
}: ErrorViewProps) {
  return (
    <div className={errorViewRoot({ variant })} data-component={dataComponent} role="alert">
      <div className={errorViewCard({ variant })}>
        <span className={errorViewIcon({ variant })} aria-hidden>
          <AlertTriangle className={variant === 'page' ? 'size-7 md:size-8' : 'size-5'} />
        </span>

        <h1 className={errorViewTitle({ variant })} data-component={`${dataComponent}-title`}>
          {title}
        </h1>

        <p className={errorViewDescription({ variant })}>{description}</p>

        {/* El digest es la única pista que sobrevive a producción: Next
            oculta el mensaje real del servidor y deja este hash, que es
            lo que soporte cruza con la traza de Sentry. */}
        {digest ? (
          <p className={s.digest} data-component={`${dataComponent}-digest`}>
            {digestLabel}: {digest}
          </p>
        ) : null}

        <div className={s.actions} data-component={`${dataComponent}-actions`}>
          <button
            type="button"
            onClick={onRetry}
            className={s.primaryCta}
            data-component={`${dataComponent}-retry`}
          >
            {retryLabel}
          </button>

          {secondaryLabel && secondaryHref ? (
            <Link
              href={secondaryHref}
              className={s.secondaryCta}
              data-component={`${dataComponent}-secondary`}
            >
              {secondaryLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
