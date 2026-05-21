/**
 * Estilos del componente ProviderServicesList.
 *
 * Centralizamos aquí todas las clases Tailwind para mantener el JSX
 * limpio. Cada clave describe el elemento visual al que aplica.
 *
 * El item es un botón visualmente — toda la tarjeta es clicable para
 * abrir el sheet de detalle. Hover y focus visible se aplican al
 * contenedor entero, con la sombra/borde virando ligeramente para
 * comunicar la interacción de forma premium.
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
  groupCard:
    'bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden shadow-sm',

  // Fila de servicio como botón clicable: el contenedor entero es un
  // `<button>` con `text-left`. Cambia sutilmente el fondo en hover
  // y muestra anillo en focus visible.
  item: 'group relative flex w-full flex-col gap-3 p-5 text-left transition-colors md:flex-row md:items-center md:justify-between md:gap-6 md:p-6 hover:bg-muted/50 focus-visible:outline-none focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50',
  itemInfo: 'flex flex-col gap-1.5 min-w-0',
  itemName: 'font-medium text-base text-foreground',
  itemDescription: 'text-sm text-muted-foreground line-clamp-2',
  itemMeta: 'flex items-center gap-1.5 text-sm text-muted-foreground mt-1',
  itemMetaIcon: 'size-4',

  // Bloque derecho: precio + flecha indicadora. En móvil se alinea a
  // la derecha de la tarjeta para no parecer suelto al pie.
  itemActions:
    'flex items-center justify-between gap-4 md:flex-col md:items-end md:justify-center md:gap-2',
  itemPrice: 'font-display text-lg text-foreground',
  // Hint visual de "abre detalle" — chevron pequeño que se desplaza
  // ligeramente en hover. Mantenemos texto accesible vía `sr-only`.
  itemHintRow: 'inline-flex items-center gap-1 text-xs font-medium text-muted-foreground',
  itemHintIcon: 'size-3.5 transition-transform duration-200 group-hover:translate-x-0.5',

  // Estado vacío.
  empty:
    'bg-card border border-dashed border-border rounded-2xl p-8 text-center text-sm text-muted-foreground',
} as const;
