'use client';

import { MapPin, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { useUserLocation } from '@/components/shared/UserLocationProvider';

import {
  DEFAULT_DISMISS_STORAGE_KEY,
  useLocationDismissed,
} from './LocationPermissionBanner.logic';
import { locationPermissionBannerStyles as s } from './LocationPermissionBanner.styles';
import type { LocationPermissionBannerProps } from './LocationPermissionBanner.types';

/**
 * Banner discreto que pide permiso de ubicación la primera vez que el
 * usuario navega y aún no ha decidido nada al respecto.
 *
 * Reglas de visibilidad (se cumplen todas a la vez):
 *  - El estado del provider es `idle` (no hay decisión previa).
 *  - El usuario NO lo ha descartado en esta sesión (sessionStorage).
 *  - No estamos en SSR (el banner es puramente cliente).
 *
 * Comportamiento:
 *  - "Permitir ubicación" llama a `request()`; el banner desaparece en
 *    cuanto el estado pasa a cualquier valor distinto de `idle` (sea
 *    `granted`, `denied` o `unavailable`).
 *  - "Ahora no" oculta el banner y lo guarda como descartado en la
 *    sesión actual.
 *  - La X de la esquina es equivalente a "Ahora no" (más accesible
 *    para usuarios que solo quieren cerrar la tarjeta).
 */
export function LocationPermissionBanner({
  storageKey = DEFAULT_DISMISS_STORAGE_KEY,
}: LocationPermissionBannerProps = {}) {
  const t = useTranslations('location');
  const { status, request } = useUserLocation();
  const { dismissed, dismiss } = useLocationDismissed(storageKey);

  // Sólo aparece cuando el usuario aún no ha decidido y no ha cerrado
  // el banner en esta sesión. Cualquier estado distinto de `idle`
  // significa que ya hay una decisión (cookie con GPS, denegación,
  // navegador sin soporte, etc.) y por tanto no procede preguntar.
  if (status !== 'idle' || dismissed) {
    return null;
  }

  const handleEnable = async () => {
    // Pedimos permiso; el provider actualiza el status y este componente
    // se desmonta solo en el siguiente render gracias al guard de arriba.
    await request();
  };

  return (
    <div
      className={s.wrapper}
      // role="region" + aria-label da contexto a lectores de pantalla
      // sin emitir un anuncio agresivo. Evitamos role="alert" porque
      // robaría el foco y es invasivo para una sugerencia opcional.
      role="region"
      aria-label={t('permissionTitle')}
      data-component="location-permission-banner"
    >
      <div className={s.card}>
        <button
          type="button"
          onClick={dismiss}
          className={s.dismissButton}
          aria-label={t('permissionDismiss')}
          data-component="location-permission-banner-close"
        >
          <X aria-hidden="true" className={s.dismissIcon} />
        </button>

        <div className={s.header}>
          <span className={s.iconBubble} aria-hidden="true">
            <MapPin className={s.iconBubbleSvg} />
          </span>
          <div className={s.titleBlock}>
            <p className={s.title}>{t('permissionTitle')}</p>
            <p className={s.body}>{t('permissionBody')}</p>
          </div>
        </div>

        <div className={s.actions}>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={dismiss}
            data-component="location-permission-banner-dismiss"
          >
            {t('permissionDismiss')}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleEnable}
            data-component="location-permission-banner-enable"
          >
            {t('permissionEnable')}
          </Button>
        </div>
      </div>
    </div>
  );
}
