import { Info } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * Banner amarillo no intrusivo que avisa al usuario de que la sección
 * actual aún muestra datos de demostración. Pensado para las páginas
 * del panel del proveedor que todavía no consultan BD real (dashboard,
 * calendario, servicios, valoraciones — `/panel/centro` ya está real).
 *
 * Single-file porque es presentacional puro (sin estado, sin lógica,
 * <30 líneas de JSX). §6.bis CLAUDE.md lo permite.
 *
 * Cuando una de esas páginas migre a datos reales, basta con quitar
 * el banner de la page server-side correspondiente.
 */
export function MockDataBanner() {
  const t = useTranslations('providerPanel.mockBanner');

  return (
    <aside
      role="status"
      className="flex items-start gap-3 rounded-2xl border border-amber-300/40 bg-amber-50/60 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-900/15 dark:text-amber-100"
      data-component="mock-data-banner"
    >
      <Info className="size-4 shrink-0 translate-y-0.5" aria-hidden />
      <div className="flex flex-col gap-1">
        <p className="font-medium">{t('title')}</p>
        <p className="text-amber-900/80 dark:text-amber-100/80">{t('description')}</p>
      </div>
    </aside>
  );
}
