/**
 * API pública del módulo `plans`.
 *
 * **Este barrel NO es client-safe**: el service arrastra Prisma. Los
 * Client Components pueden importar de aquí `type`s (se borran en
 * compilación) pero nunca `listPublicPlans`. `PLAN_TIERS` e
 * `isPlanTierId` son constantes puras sin dependencias de servidor:
 * su uso desde cliente es seguro, aunque hoy solo los consumen el
 * page de `/registro` y la validación de searchParams.
 */

export { listPublicPlans } from './plans.service';

export { plansRepository } from './plans.repository';

export { PlansNotSeededError } from './plans.errors';

export { isPlanTierId, PLAN_TIERS } from './plans.types';

export type { PlanTierId, PublicPlan } from './plans.types';
