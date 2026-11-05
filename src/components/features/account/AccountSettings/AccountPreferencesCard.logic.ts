'use client';

import { useCallback, useState, useTransition } from 'react';

import { setEmailLocaleAction } from '@/app/[locale]/cuenta/ajustes/actions';
import type { AppLocale } from '@/i18n/routing';

/**
 * Idioma de los correos. Va aparte del idioma de la web porque esa preferencia
 * vive en la URL y los correos salen del servidor, a veces de madrugada.
 *
 * @param initial — idioma guardado en la cuenta.
 */
export function useEmailLocale(initial: AppLocale) {
  const [value, setValue] = useState<AppLocale>(initial);
  const [feedback, setFeedback] = useState<'saved' | 'error' | null>(null);
  const [isPending, startTransition] = useTransition();

  const change = useCallback(
    (next: AppLocale) => {
      const previous = value;
      setValue(next);
      setFeedback(null);
      startTransition(async () => {
        const result = await setEmailLocaleAction(next).catch(() => null);
        if (result?.ok) {
          setFeedback('saved');
        } else {
          setValue(previous);
          setFeedback('error');
        }
      });
    },
    [value],
  );

  return { value, feedback, isPending, change };
}
