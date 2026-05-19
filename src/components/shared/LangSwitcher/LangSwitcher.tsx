'use client';

import { cn } from '@/lib/utils';

import { useLangSwitcher } from './LangSwitcher.logic';
import { langSwitcherStyles as s } from './LangSwitcher.styles';
import type { LangSwitcherProps } from './LangSwitcher.types';

/**
 * Selector de idioma para la barra de navegación.
 *
 * Renderiza un toggle pill con los dos locales soportados (es/ca) y al
 * pulsar redirige a la misma ruta en el idioma destino. La lógica vive en
 * `useLangSwitcher` para que el componente sea puramente presentacional.
 */
export function LangSwitcher({ compact = false }: LangSwitcherProps) {
  const { locales, currentLocale, changeLocale, isPending } = useLangSwitcher();

  return (
    <div className={s.root} role="group" aria-label="Language">
      {locales.map((locale) => {
        const isActive = locale === currentLocale;
        // En modo compacto solo dejamos visible el activo y el primer
        // alternativo para no robar espacio en mobile; con 2 locales esto
        // implica mostrar ambos siempre, pero dejamos el flag preparado
        // por si en el futuro añadimos más idiomas.
        if (compact && !isActive && locales.indexOf(locale) > 1) return null;

        return (
          <button
            key={locale}
            type="button"
            onClick={() => changeLocale(locale)}
            disabled={isPending}
            aria-pressed={isActive}
            className={cn(s.button, isActive && s.buttonActive)}
          >
            {locale}
          </button>
        );
      })}
    </div>
  );
}
