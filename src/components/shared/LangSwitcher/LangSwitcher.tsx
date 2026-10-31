'use client';

import { Globe } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

import { useLangSwitcher } from './LangSwitcher.logic';
import { langSwitcherStyles as s } from './LangSwitcher.styles';
import type { LangSwitcherProps } from './LangSwitcher.types';

/**
 * Selector de idioma de la cabecera.
 *
 * Un único desplegable propio (Radix Select) para móvil y escritorio: el
 * `<select>` nativo abría en Android una hoja gris del sistema que
 * desentonaba con la marca, y el toggle de 4 códigos ocupaba media
 * cabecera. El botón muestra solo el código («ES») y la lista, el nombre
 * de cada idioma en su propia lengua, que es como cada usuario lo busca.
 */
export function LangSwitcher({ compact = false }: LangSwitcherProps) {
  const { locales, currentLocale, changeLocale, isPending } = useLangSwitcher();
  const t = useTranslations('langSwitcher');

  return (
    <Select
      value={currentLocale}
      onValueChange={(value) => changeLocale(value as (typeof locales)[number])}
      disabled={isPending}
    >
      <SelectTrigger
        className={cn(s.trigger, compact && s.triggerCompact)}
        aria-label={t('groupLabel')}
        data-component="lang-switcher"
      >
        <Globe className={s.globe} aria-hidden="true" />
        {/* Forzamos el código corto: por defecto Radix pintaría el nombre
            completo del idioma seleccionado. */}
        <SelectValue>{currentLocale.toUpperCase()}</SelectValue>
      </SelectTrigger>
      <SelectContent align="end" className={s.content}>
        {locales.map((locale) => (
          <SelectItem
            key={locale}
            value={locale}
            lang={locale}
            data-component={`lang-switcher-option-${locale}`}
          >
            {t(`names.${locale}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
