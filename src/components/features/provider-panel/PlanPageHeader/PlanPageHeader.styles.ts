/**
 * Estilos de la cabecera de `/panel/plan`. Avisos con los tokens
 * `--status-*` (contraste AA en claro y oscuro).
 */
export const planPageHeaderStyles = {
  root: 'flex flex-col gap-2',
  title: 'font-display text-2xl text-foreground sm:text-3xl',
  subtitle: 'text-sm text-muted-foreground',
  noticeInfo:
    'mt-2 rounded-2xl border border-status-info-foreground/30 bg-status-info px-4 py-3 text-sm text-status-info-foreground',
  noticeWarning:
    'mt-2 rounded-2xl border border-status-soon-foreground/30 bg-status-soon px-4 py-3 text-sm text-status-soon-foreground',
} as const;
