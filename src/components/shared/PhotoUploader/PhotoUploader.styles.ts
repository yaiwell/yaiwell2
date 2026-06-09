/**
 * Estilos del componente PhotoUploader.
 *
 * Diseño mobile-first (375-414px) que escala a desktop:
 *  - En mobile la zona de drop ocupa todo el ancho y la galería va en
 *    2 columnas.
 *  - En desktop sube a 4 columnas.
 *
 * Usamos tokens semánticos (`bg-card`, `border-border`, `text-muted-foreground`)
 * para que respete light/dark mode sin variantes adicionales.
 */
export const photoUploaderStyles = {
  wrapper: 'flex flex-col gap-4',
  // Zona de drop: borde discontinuo cálido + estado de drag visible.
  // En focus-visible añadimos un anillo para accesibilidad teclado.
  dropZone:
    'relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground transition-colors duration-150 hover:border-foreground/30 focus-within:border-foreground/40 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background sm:py-10',
  dropZoneActive: 'border-foreground/50 bg-muted/40',
  dropZoneIcon: 'size-7 text-muted-foreground',
  dropZoneTitle: 'font-display text-base font-medium text-foreground',
  dropZoneHint: 'text-xs text-muted-foreground',
  // El input file real va oculto pero accesible al lector de pantalla
  // gracias al label asociado.
  hiddenInput: 'sr-only',
  browseButton:
    'mt-1 inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  // Galería de previsualizaciones.
  gallery: 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4',
  galleryItem:
    'group/photo relative aspect-square overflow-hidden rounded-xl border border-border bg-muted',
  galleryImage: 'h-full w-full object-cover',
  galleryUploading:
    'absolute inset-0 flex items-center justify-center bg-foreground/30 text-xs font-medium text-background backdrop-blur-[1px]',
  galleryError:
    'absolute inset-0 flex items-center justify-center bg-destructive/80 text-xs font-medium text-background',
  removeButton:
    'absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-foreground/70 text-background opacity-0 transition-opacity duration-150 hover:bg-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 group-hover/photo:opacity-100 group-focus-within/photo:opacity-100',
  removeIcon: 'size-3.5',
  // Lista de mensajes de error global (limites alcanzados, fallos de red).
  errorList: 'flex flex-col gap-1 text-xs text-destructive',
  // Mensaje cuando se alcanzan el límite de fotos.
  maxFilesNote: 'text-xs text-muted-foreground',
} as const;
