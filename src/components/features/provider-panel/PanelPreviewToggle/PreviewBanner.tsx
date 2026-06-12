import { Info } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * Banner ámbar que avisa al provider de que está viendo datos de
 * ejemplo en lugar de los suyos reales. Solo aparece cuando la cookie
 * `yaiwell.panelPreview` está activa.
 *
 * Server Component puro: lee `providerPanel.preview.banner*` y renderiza.
 */
export function PreviewBanner() {
  const t = useTranslations('providerPanel.preview');

  return (
    <aside
      role="status"
      className="flex items-start gap-3 rounded-2xl border border-amber-300/40 bg-amber-50/60 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-900/15 dark:text-amber-100"
      data-component="panel-preview-banner"
    >
      <Info className="size-4 shrink-0 translate-y-0.5" aria-hidden />
      <div className="flex flex-col gap-1">
        <p className="font-medium">{t('bannerTitle')}</p>
        <p className="text-amber-900/80 dark:text-amber-100/80">{t('bannerDescription')}</p>
      </div>
    </aside>
  );
}
