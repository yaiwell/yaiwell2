/**
 * Estilos del componente ForProvidersFAQ.
 *
 * Usamos `<details>`/`<summary>` nativos en vez de Radix Accordion para
 * mantener el componente como Server Component (sin estado React) y no
 * añadir dependencias. El marcador nativo del summary se oculta y se
 * sustituye por un ChevronDown que rota con `[&[open]>summary]`.
 */
export const forProvidersFaqStyles = {
  root: 'bg-background py-16 md:py-24',
  container: 'mx-auto max-w-3xl px-6 md:px-8',
  header: 'mb-8 flex flex-col items-center gap-3 text-center md:mb-12',
  eyebrow:
    'text-xs font-medium uppercase tracking-wider text-muted-foreground md:text-sm',
  title:
    'text-balance text-3xl font-medium tracking-tight text-foreground md:text-4xl lg:text-5xl',

  list: 'flex flex-col gap-3',
  // `group` para que el chevron rote cuando el details está abierto.
  // `[&::-webkit-details-marker]:hidden` y `marker:hidden` ocultan el
  // triángulo nativo en Chromium / Firefox sin necesidad de JS.
  item: 'group overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-border/80 open:border-primary/30 open:shadow-sm',
  summary:
    'flex cursor-pointer list-none items-start justify-between gap-4 px-5 py-4 text-left text-base font-medium text-foreground transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset md:px-6 md:py-5 md:text-lg [&::-webkit-details-marker]:hidden marker:hidden',
  chevron:
    'mt-1 size-5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180 group-open:text-primary',
  answer: 'px-5 pb-5 text-sm leading-relaxed text-muted-foreground md:px-6 md:pb-6 md:text-base',
} as const;
