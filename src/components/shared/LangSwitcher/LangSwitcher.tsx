'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

import { useLangSwitcher } from './LangSwitcher.logic';
import { langSwitcherStyles as s } from './LangSwitcher.styles';
import type { LangSwitcherProps } from './LangSwitcher.types';

/**
 * Selector de idioma para la barra de navegación.
 *
 * **Desktop**: renderiza un toggle pill con los 4 locales soportados
 * (es/ca/en/de). Caben porque los códigos son de 2 chars y el header
 * tiene espacio.
 *
 * **Mobile (compact)**: con 4 idiomas el toggle pill rompería el header
 * (375px), así que conmutamos a un `<select>` nativo. Esto cuesta
 * accesibilidad (no anuncia cambio de locale antes de pulsar) pero gana
 * espacio y mantiene el patrón nativo del SO que los usuarios reconocen.
 * La lógica de cambio sigue siendo la misma (`changeLocale`).
 */
export function LangSwitcher({ compact = false }: LangSwitcherProps) {
  const { locales, currentLocale, changeLocale, isPending } = useLangSwitcher();
  const t = useTranslations('langSwitcher');

  if (compact) {
    return (
      <select
        className={s.select}
        value={currentLocale}
        disabled={isPending}
        onChange={(e) => changeLocale(e.target.value as (typeof locales)[number])}
        aria-label={t('groupLabel')}
        data-component="lang-switcher"
      >
        {locales.map((locale) => (
          <option key={locale} value={locale}>
            {locale.toUpperCase()}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div
      className={s.root}
      role="group"
      aria-label={t('groupLabel')}
      data-component="lang-switcher"
    >
      {locales.map((locale) => {
        const isActive = locale === currentLocale;
        return (
          <button
            key={locale}
            type="button"
            onClick={() => changeLocale(locale)}
            disabled={isPending}
            aria-pressed={isActive}
            className={cn(s.button, isActive && s.buttonActive)}
            data-component={`lang-switcher-option-${locale}`}
          >
            {locale}
          </button>
        );
      })}
    </div>
  );
}
