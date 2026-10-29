/**
 * Tipos del componente BecomeProviderConfirm.
 */
import type { BecomeProviderResult } from '@/lib/auth';
import type { PlanTierId } from '@/lib/services/plans';

/** Server action que convierte la cuenta (se inyecta desde la page). */
export type BecomeProviderActionFn = (
  locale: string,
  plan?: PlanTierId | null,
) => Promise<BecomeProviderResult>;

export interface BecomeProviderConfirmProps {
  /** Plan elegido en `/profesionales`, ya validado, o `null`. */
  plan: PlanTierId | null;
  /** `becomeProviderAction`, pasada como prop para no acoplar la UI a `app/`. */
  action: BecomeProviderActionFn;
}

/** Errores que la pantalla sabe explicar. */
export type BecomeProviderErrorCode = 'forbidden' | 'sessionRefresh' | 'unknown';
