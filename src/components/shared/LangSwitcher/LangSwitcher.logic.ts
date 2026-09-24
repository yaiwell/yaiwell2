'use client';

import { useTransition } from 'react';
import { useLocale } from 'next-intl';

import { usePathname, useRouter } from '@/i18n/navigation';
import { routing, type AppLocale } from '@/i18n/routing';

/**
 * Hook que encapsula el cambio de idioma preservando la ruta actual.
 *
 * Usa `useTransition` para que el cambio no bloquee la UI y para poder
 * mostrar un estado de pendiente si en el futuro queremos un spinner.
 */
export function useLangSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale() as AppLocale;
  const [isPending, startTransition] = useTransition();

  /**
   * Cambia el idioma activo redirigiendo a la misma ruta en el locale
   * destino. next-intl reescribe el prefijo de idioma de la URL; con
   * `localePrefix: 'always'` siempre hay uno que sustituir.
   */
  const changeLocale = (next: AppLocale) => {
    if (next === currentLocale) return;
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  };

  return {
    locales: routing.locales,
    currentLocale,
    changeLocale,
    isPending,
  };
}
