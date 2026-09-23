/**
 * Estilos del mini-mapa de la ficha del proveedor.
 *
 * El contenedor padre (en ProviderInfoPanel.styles.ts) ya define
 * altura, radio y borde; aquí solo aportamos los estilos internos
 * del mapa (relleno completo + atribución de OSM).
 */
export const providerInfoMapStyles = {
  // Contenedor propio `relative` para anclar la atribución al mapa y no
  // depender del posicionamiento del panel que lo monta.
  wrapper: 'relative h-full w-full',
  container: 'h-full w-full',
  // `z-[1000]` porque los panes de Leaflet llegan hasta z-index 700:
  // sin esto el crédito de OSM quedaría tapado por los tiles.
  attribution:
    'pointer-events-none absolute bottom-2 right-3 z-[1000] rounded-full bg-card/80 px-2 py-0.5 text-[0.65rem] text-muted-foreground backdrop-blur',
} as const;
