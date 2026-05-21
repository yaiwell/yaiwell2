/**
 * Estilos del componente ProviderServicesList.
 *
 * Centralizamos aquí todas las clases Tailwind para mantener el JSX
 * limpio. Cada clave describe el elemento visual al que aplica.
 */
export const providerServicesListStyles = {
  // Contenedor raíz: pila vertical con espacio generoso entre grupos.
  root: 'flex flex-col gap-8',

  // Encabezado de la sección (título + subtítulo).
  sectionHeader: 'flex flex-col gap-1',
  sectionTitle: 'font-display text-2xl md:text-3xl text-foreground',
  sectionSubtitle: 'text-sm text-muted-foreground',

  // Grupo (categoría raíz + tarjeta con sus servicios).
  group: 'flex flex-col gap-3',
  groupHeader: 'font-display text-xl md:text-2xl text-foreground mb-1',

  // Card que envuelve la lista de servicios de un mismo grupo.
  // Usamos `divide-y` para separar visualmente las filas sin meter
  // bordes manuales en cada item.
  groupCard: 'bg-card border border-border rounded-2xl divide-y divide-border',

  // Fila de servicio dentro de la card.
  // En móvil apilamos verticalmente; a partir de md, info a la izquierda
  // y precio + CTA a la derecha.
  item: 'flex flex-col gap-3 p-5 md:p-6 md:flex-row md:items-center md:justify-between md:gap-6',
  itemInfo: 'flex flex-col gap-1.5 min-w-0',
  itemName: 'font-medium text-base text-foreground',
  itemDescription: 'text-sm text-muted-foreground line-clamp-2',
  itemMeta: 'flex items-center gap-1.5 text-sm text-muted-foreground mt-1',
  itemMetaIcon: 'size-4',

  // Bloque derecho: precio + CTA. En móvil se alinea a la derecha de la
  // tarjeta para no parecer suelto al pie.
  itemActions:
    'flex items-center justify-between gap-4 md:flex-col md:items-end md:justify-center md:gap-2',
  itemPrice: 'font-display text-lg text-foreground',
  // Botón nativo fallback (no se usa si hay `Button` de shadcn).
  // Misma estética visual de una variante outline deshabilitada.
  itemReserveFallback:
    'inline-flex items-center justify-center rounded-lg border border-border bg-background px-3 h-8 text-sm font-medium text-muted-foreground opacity-50 cursor-not-allowed',

  // Estado vacío.
  empty:
    'bg-card border border-dashed border-border rounded-2xl p-8 text-center text-sm text-muted-foreground',
} as const;
