/**
 * Tipos del componente Footer.
 *
 * Cada columna se modela como una unión discriminada por `titleKey`,
 * y `links[].labelKey` queda restringido al conjunto válido para esa
 * columna. Esto permite que TypeScript verifique en compile-time que
 * la clave i18n combinada (`footer.{titleKey}.{labelKey}`) existe en
 * los mensajes y evita combinaciones inválidas como
 * `footer.product.about`.
 */
export type FooterLinkGroup =
  | {
      titleKey: 'product';
      links: ReadonlyArray<FooterLink<'howItWorks' | 'categories' | 'pricing'>>;
    }
  | {
      titleKey: 'company';
      links: ReadonlyArray<FooterLink<'about' | 'blog' | 'careers'>>;
    }
  | {
      titleKey: 'legal';
      links: ReadonlyArray<FooterLink<'terms' | 'privacy' | 'cookies'>>;
    };

export interface FooterLink<TLabel extends string> {
  href: string;
  labelKey: TLabel;
}
