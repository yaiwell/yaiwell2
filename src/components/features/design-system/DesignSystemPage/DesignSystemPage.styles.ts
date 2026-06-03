/**
 * Estilos de la página de design system.
 *
 * Galería interna usada para QA visual de los tokens de marca. Se prioriza
 * legibilidad de la rejilla sobre densidad: cada swatch lleva nombre y un
 * texto de ejemplo para validar el contraste.
 */
export const designSystemPageStyles = {
  root: 'mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-10 sm:px-6 lg:px-8',

  // Cabecera editorial.
  header: 'flex flex-col gap-2',
  title: 'font-display text-3xl text-foreground sm:text-4xl',
  subtitle: 'max-w-2xl text-sm text-muted-foreground sm:text-base',

  // Sección con título grande + grid de contenido.
  section: 'flex flex-col gap-4',
  sectionTitle: 'font-display text-xl text-foreground sm:text-2xl',
  sectionDescription: 'text-sm text-muted-foreground',
  sectionGrid: 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3',
  sectionRow: 'flex flex-wrap items-center gap-3',

  // Swatch de color: cuadrado con nombre del token superpuesto.
  swatch: 'flex h-24 flex-col justify-between rounded-2xl border border-border/60 p-3 shadow-sm',
  swatchToken: 'font-mono text-[11px] uppercase tracking-wider opacity-80',
  swatchLabel: 'text-sm font-medium',

  // Brand pairs (solid + soft uno al lado del otro).
  brandRow: 'grid grid-cols-2 overflow-hidden rounded-2xl border border-border/60 shadow-sm',
  brandCell: 'flex h-24 flex-col justify-between p-3',
  brandToken: 'font-mono text-[11px] uppercase tracking-wider opacity-80',
  brandLabel: 'text-sm font-medium',

  // Tipografía: cada fila muestra muestra + clase aplicada.
  typeRow: 'flex flex-col gap-1 rounded-2xl border border-border/60 bg-card p-4',
  typeSample: 'text-foreground',
  typeMeta: 'font-mono text-xs text-muted-foreground',

  // Botones: panel con título de grupo + fila horizontal.
  buttonGroup: 'flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4',
  buttonGroupTitle: 'text-sm font-medium text-foreground',
  buttonGroupRow: 'flex flex-wrap items-center gap-3',

  // Radius: muestra cuadrada que demuestra el redondeo.
  radiusCell:
    'flex h-24 w-24 flex-col items-center justify-center border border-border bg-muted text-xs text-muted-foreground',

  // Componentes: cada bloque muestra un componente shadcn vivo.
  componentBlock: 'flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4',
  componentTitle: 'text-sm font-medium text-foreground',
} as const;
