/**
 * Tipos específicos del hero de la landing /profesionales.
 * Sin tipos derivados externos: el hero es presentacional.
 */
export interface ForProvidersHeroProps {
  /**
   * Anchor de la siguiente sección al que apunta el CTA secundario.
   * Por defecto `#beneficios`, configurable por si la página recompone.
   */
  benefitsAnchor?: string;
}
