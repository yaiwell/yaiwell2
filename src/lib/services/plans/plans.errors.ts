/**
 * Errores tipados del dominio `plans`.
 *
 * Mismo patrón que `FreePlanNotSeededError` en `provider-onboarding`:
 * modelamos la ausencia de seed como error explícito para que el
 * incidente sea evidente en logs en lugar de propagarse como una
 * lista vacía que alguien "arregla" con números a mano.
 */

/**
 * La tabla `plans` está vacía.
 *
 * En runtime no debería ocurrir (`prisma/seed.ts` siembra los cuatro
 * tiers), así que su aparición significa entorno sin seed o BD
 * equivocada. Los consumidores NO deben caer a tarifas hardcodeadas:
 * publicar una comisión distinta de la que se cobra es peor que no
 * publicar ninguna.
 */
export class PlansNotSeededError extends Error {
  readonly code = 'PLANS_NOT_SEEDED';

  constructor(message = 'La tabla de planes está vacía.') {
    super(message);
    this.name = 'PlansNotSeededError';
  }
}
