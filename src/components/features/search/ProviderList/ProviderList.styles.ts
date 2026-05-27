/**
 * Estilos del listado de proveedores.
 *
 * El componente JSX es muy ligero: aquí solo viven el contenedor de la
 * lista y el bloque de empty-state. Cualquier clase Tailwind larga vive
 * en este archivo (CLAUDE.md §6.bis).
 */
export const providerListStyles = {
  list: 'flex flex-col gap-5',
  // Empty state con `animate-in fade-in` para suavizar la aparición
  // cuando los filtros vacían la lista. Mantenemos el estilo editorial
  // (borde discontinuo + fondo muy suave + tipografía display en el
  // título).
  empty:
    'flex flex-col items-start gap-2 rounded-3xl border border-dashed border-border bg-muted/40 p-8 text-foreground/80 duration-200 animate-in fade-in',
  emptyTitle: 'font-display text-xl text-foreground',
  emptySubtitle: 'text-sm text-muted-foreground',
} as const;
