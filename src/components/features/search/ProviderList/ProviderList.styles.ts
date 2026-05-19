/**
 * Estilos del listado de proveedores.
 *
 * El componente JSX es muy ligero: aquí solo viven el contenedor de la
 * lista y el bloque de empty-state. Cualquier clase Tailwind larga vive
 * en este archivo (CLAUDE.md §6.bis).
 */
export const providerListStyles = {
  list: 'flex flex-col gap-5',
  empty:
    'flex flex-col items-start gap-2 rounded-3xl border border-dashed border-border bg-muted/40 p-8 text-foreground/80',
  emptyTitle: 'font-display text-xl text-foreground',
  emptySubtitle: 'text-sm text-muted-foreground',
} as const;
