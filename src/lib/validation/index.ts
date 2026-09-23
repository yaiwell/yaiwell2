/**
 * API pública de `lib/validation`: schemas Zod de los bordes que no
 * pertenecen a un dominio de negocio concreto (searchParams de rutas,
 * payloads de formularios transversales).
 *
 * Los schemas de un dominio siguen viviendo en su módulo
 * (`booking.validation.ts`, `provider-onboarding.validation.ts`…).
 */

export { parseSignUpIntent, signUpSearchParamsSchema } from './sign-up-params';
export type { SignUpIntent } from './sign-up-params';
