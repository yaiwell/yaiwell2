import { cn } from '@/lib/utils';

/**
 * Bloque de carga genérico (primitivo shadcn/ui).
 *
 * Pinta un rectángulo pulsante con el token semántico `--accent`, igual
 * que el `Skeleton` canónico de shadcn: así hereda el par claro/oscuro
 * sin escribir una sola variante `dark:`.
 *
 * Es decorativo por definición — el texto accesible lo aporta el
 * contenedor del esqueleto (`role="status"` + `aria-busy`), no cada
 * bloque. Por eso va siempre `aria-hidden`.
 *
 * @param className — dimensiones y radio que decide el consumidor
 *   (`h-8 w-48 rounded-full`). El componente solo aporta color y
 *   animación.
 */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn('bg-accent animate-pulse rounded-md', className)}
      {...props}
    />
  );
}

export { Skeleton };
