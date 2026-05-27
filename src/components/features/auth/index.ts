/**
 * Fachada del módulo de autenticación (UI mock).
 *
 * Cada formulario (SignIn / SignUp) se exporta a través de su propio
 * `index.ts`; este barrel agrupa ambos para que los consumidores
 * importen desde `@/components/features/auth`.
 *
 * Importante: este archivo puede ser generado en paralelo por varios
 * agentes (A1 entrar, A2 registro). Mantenerlo como un simple re-export
 * sin lógica para que sea trivialmente idempotente.
 */
export { SignInForm } from './SignInForm';
export { SignUpForm } from './SignUpForm';
