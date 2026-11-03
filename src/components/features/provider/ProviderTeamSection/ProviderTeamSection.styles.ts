/**
 * Estilos de la sección «El equipo».
 *
 * Mismo ritmo vertical y tipografía de encabezado que el resto de
 * secciones de la ficha. Móvil primero: una columna; en tablet, dos.
 */
export const providerTeamSectionStyles = {
  section: 'flex flex-col gap-6 py-8 md:py-12',
  header: 'flex flex-col gap-1',
  heading: 'text-2xl md:text-3xl font-display text-foreground',
  subtitle: 'text-sm text-muted-foreground',
  list: 'grid grid-cols-1 gap-3 sm:grid-cols-2',
  item: 'flex items-start gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm',
  body: 'flex min-w-0 flex-col gap-1',
  name: 'font-display text-lg text-foreground',
  bio: 'text-sm leading-relaxed text-muted-foreground',
} as const;
