/**
 * Estilos del documento legal: lectura cómoda en móvil, ancho de línea
 * acotado en escritorio.
 */
export const legalDocumentStyles = {
  root: 'bg-background py-12 md:py-20',
  container: 'mx-auto max-w-3xl px-4 md:px-8',
  header: 'mb-10 flex flex-col gap-3 border-b border-border pb-8',
  title: 'text-balance text-3xl font-medium tracking-tight text-foreground md:text-4xl',
  updated: 'text-sm text-muted-foreground',
  intro: 'text-base leading-relaxed text-foreground/90 md:text-lg',
  section: 'mb-10 flex flex-col gap-3 last:mb-0',
  heading: 'text-xl font-medium tracking-tight text-foreground md:text-2xl',
  paragraph: 'text-base leading-relaxed text-muted-foreground',
  list: 'flex list-disc flex-col gap-2 pl-5 text-base leading-relaxed text-muted-foreground marker:text-primary/70',
} as const;
