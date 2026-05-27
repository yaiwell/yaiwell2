'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

import { useTheme } from './ThemeToggle.logic';
import { themeToggleStyles as s } from './ThemeToggle.styles';
import type { ThemeOption, ThemeToggleProps } from './ThemeToggle.types';

/**
 * Opciones expuestas en el toggle: claro, oscuro y "seguir al sistema".
 *
 * El orden (light → dark → system) es deliberado: empieza por el modo
 * por defecto histórico de la web, sigue con el modo emergente y deja
 * la opción auto al final como "elige por mí".
 */
const OPTIONS: ThemeOption[] = [
  { value: 'light', labelKey: 'light' },
  { value: 'dark', labelKey: 'dark' },
  { value: 'system', labelKey: 'system' },
];

/**
 * Renderiza el icono correspondiente a cada opción.
 * Lo extraemos a una función pura porque no merece un sub-componente
 * separado y mantiene el JSX del toggle más compacto.
 */
function ThemeIcon({ value, className }: { value: ThemeOption['value']; className: string }) {
  if (value === 'light') return <Sun aria-hidden="true" className={className} />;
  if (value === 'dark') return <Moon aria-hidden="true" className={className} />;
  return <Monitor aria-hidden="true" className={className} />;
}

/**
 * Selector de tema (light / dark / system).
 *
 * Es un componente cliente porque modifica la clase `dark` del `<html>`
 * y persiste la preferencia en cookie. La lógica de estado vive en el
 * `ThemeProvider` del módulo; aquí solo dibujamos el toggle y delegamos
 * los cambios con `setPreference`.
 */
export function ThemeToggle({ compact = false, className }: ThemeToggleProps) {
  const t = useTranslations('theme');
  const { preference, setPreference } = useTheme();

  return (
    <div
      className={cn(s.root, className)}
      role="group"
      aria-label={t('groupLabel')}
      data-component="theme-toggle"
    >
      {OPTIONS.map((option) => {
        const isActive = option.value === preference;
        const label = t(option.labelKey);
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setPreference(option.value)}
            aria-pressed={isActive}
            aria-label={label}
            title={label}
            className={cn(s.button, isActive && s.buttonActive)}
            data-component={`theme-toggle-option-${option.value}`}
          >
            <ThemeIcon value={option.value} className={s.icon} />
            {/* En modo no compacto mantenemos la etiqueta accesible al
                lector pero visualmente solo se ve el icono; con compact
                el comportamiento es idéntico (la etiqueta vive en aria-label). */}
            {!compact && <span className={s.srOnly}>{label}</span>}
          </button>
        );
      })}
    </div>
  );
}
