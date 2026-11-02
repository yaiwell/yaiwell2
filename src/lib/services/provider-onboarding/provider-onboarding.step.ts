import type { OnboardingState } from './provider-onboarding.types';

/**
 * Siguiente paso pendiente del asistente para un usuario que ya tiene
 * negocio creado.
 *
 * El negocio se crea al salir del paso 3 (ubicación), así que con negocio
 * y sin servicio toca el paso 4; con servicio, el alta está completada.
 * Las fotos ya no forman parte del asistente (se suben desde el panel):
 * antes un negocio sin fotos volvía al paso 3 con el formulario vacío y no
 * podía avanzar, aunque tuviera servicios publicados.
 *
 * Aunque el negocio arranca en Gratis, no hay marca de «ha confirmado
 * plan», así que con servicio el alta se da por completada.
 *
 * @param hasFirstService — si el negocio tiene al menos un servicio vivo.
 */
export function nextOnboardingStep(hasFirstService: boolean): OnboardingState['step'] {
  return hasFirstService ? 'completed' : 4;
}
