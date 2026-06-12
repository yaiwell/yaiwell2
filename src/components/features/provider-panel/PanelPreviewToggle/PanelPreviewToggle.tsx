'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useTransition } from 'react';

import { togglePanelPreviewAction } from '@/app/[locale]/panel/preview-actions';
import type { AppLocale } from '@/i18n/routing';

interface PanelPreviewToggleProps {
  locale: AppLocale;
  active: boolean;
  /** Copy traducido (server → client) para no doblar i18n en cliente. */
  showLabel: string;
  hideLabel: string;
  pendingLabel: string;
}

/**
 * Toggle "Ver con datos de ejemplo" / "Volver a mis datos reales".
 *
 * Vive como Client Component para tener `useTransition` y feedback de
 * loading. Recibe el `active` actual del server (cookie ya leída) y
 * los labels traducidos para no acoplar i18n al cliente.
 *
 * Al pulsar invoca la server action; tras `revalidatePath` el SSR
 * vuelve a renderizar con el estado nuevo y este componente recibe
 * `active` invertido en el próximo render.
 */
export function PanelPreviewToggle({
  locale,
  active,
  showLabel,
  hideLabel,
  pendingLabel,
}: PanelPreviewToggleProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await togglePanelPreviewAction(locale);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="border-border/60 bg-card text-foreground/80 hover:bg-muted hover:text-foreground focus-visible:ring-ring focus-visible:ring-offset-background inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60"
      data-component="panel-preview-toggle"
      aria-pressed={active}
    >
      {active ? (
        <EyeOff className="size-3.5" aria-hidden />
      ) : (
        <Eye className="size-3.5" aria-hidden />
      )}
      {isPending ? pendingLabel : active ? hideLabel : showLabel}
    </button>
  );
}
