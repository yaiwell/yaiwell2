/**
 * Tipos del componente Footer.
 *
 * `labelKey` queda restringido al conjunto válido de su columna para
 * que TypeScript verifique en compile-time que la clave i18n combinada
 * (`footer.{titleKey}.{labelKey}`) existe en los mensajes.
 *
 * Hoy solo queda la columna `product`: las columnas `company` y `legal`
 * se retiraron el 2026-09-24 porque sus destinos no existen (ver el
 * comentario en `Footer.tsx`). El modelo se mantiene como unión
 * discriminada para que reponerlas sea añadir una variante, no
 * reescribir el componente.
 */
export type FooterLinkGroup = {
  titleKey: 'product';
  links: ReadonlyArray<FooterLink<'howItWorks' | 'categories' | 'pricing'>>;
};

export interface FooterLink<TLabel extends string> {
  /**
   * Destino dentro del routing localizado (`/buscar`, `/#how-it-works`).
   * El `Link` de `@/i18n/navigation` le antepone el prefijo de locale.
   */
  href: string;
  labelKey: TLabel;
}
