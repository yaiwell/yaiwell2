/**
 * Estilos del compositor `ProviderDetail`.
 *
 * El layout es de una sola columna en todos los breakpoints: en una
 * ficha pública mobile-first prima un scroll lineal continuo sobre
 * split layouts; la información de "Información" (mapa + datos) se
 * pone al final porque suele ser la confirmación visual previa a la
 * reserva, no el primer impacto.
 */
export const providerDetailStyles = {
  root: 'mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pb-16 pt-2 md:gap-12 md:px-6 lg:px-8',
  // Bloque de contenido principal: cada sección se separa con un gap
  // amplio para que en mobile se identifiquen como bloques distintos
  // sin necesidad de tabs.
  sections: 'flex flex-col gap-10 md:gap-14',
  // Anchor para que las tabs mobile hagan scrollIntoView sin que el
  // sticky de la nav del header tape el título de la sección.
  sectionAnchor: 'scroll-mt-28 md:scroll-mt-20',
  sectionHeading: 'font-display text-2xl tracking-tight text-foreground md:text-3xl',
} as const;
