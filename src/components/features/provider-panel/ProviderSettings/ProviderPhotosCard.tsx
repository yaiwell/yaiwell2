'use client';

import { useState, useTransition } from 'react';

import { updateProviderPhotosAction } from '@/app/[locale]/panel/centro/actions';
import { PhotoUploader } from '@/components/shared/PhotoUploader';
import type { AppLocale } from '@/i18n/routing';

interface ProviderPhotosCardProps {
  locale: AppLocale;
  providerId: string;
  initialUrls: string[];
  /** Copy ya traducido — no hace hooks de i18n en cliente. */
  cardTitle: string;
  cardSubtitle: string;
  errorMessage: string;
  cardClass: string;
  cardTitleClass: string;
  cardSubtitleClass: string;
}

/**
 * Card de fotos del centro/negocio en `/panel/centro`.
 *
 * Envuelve el `PhotoUploader` compartido y conecta su callback
 * `onChange` a la server action `updateProviderPhotosAction`. Vive
 * como Client Component aparte porque el `ProviderSettings` padre
 * es Server (no puede pasar callbacks a hijos cliente).
 *
 * La action sobreescribe el array `Provider.photos` completo en cada
 * cambio. No es óptimo si el usuario añade muchas fotos seguidas, pero
 * es simple y correcto — y la subida real ya pasa por su propio
 * endpoint `/api/storage/upload` antes de llegar aquí.
 */
export function ProviderPhotosCard({
  locale,
  providerId,
  initialUrls,
  cardTitle,
  cardSubtitle,
  errorMessage,
  cardClass,
  cardTitleClass,
  cardSubtitleClass,
}: ProviderPhotosCardProps) {
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  function handleChange(urls: string[]) {
    setSubmitError(null);
    startTransition(async () => {
      const result = await updateProviderPhotosAction(locale, urls);
      if (!result.ok) {
        setSubmitError(result.message ?? errorMessage);
      }
    });
  }

  return (
    <article className={cardClass} data-component="provider-settings-photos">
      <header>
        <h2 className={cardTitleClass}>{cardTitle}</h2>
        <p className={cardSubtitleClass}>{cardSubtitle}</p>
      </header>

      <PhotoUploader
        bucket="provider-photos"
        ownerId={providerId}
        maxFiles={6}
        initialUrls={initialUrls}
        onChange={handleChange}
      />

      {/* Indicador minimal del save en vuelo + error si falla */}
      {isPending ? (
        <p className="text-muted-foreground text-xs" data-component="provider-photos-pending">
          {/* Reutilizamos el copy del save automático del PhotoUploader. */}…
        </p>
      ) : null}
      {submitError ? (
        <p className="text-destructive text-xs" role="alert">
          {submitError}
        </p>
      ) : null}
    </article>
  );
}
