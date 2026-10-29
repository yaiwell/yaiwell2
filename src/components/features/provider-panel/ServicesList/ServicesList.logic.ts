import { isUnlimitedServices } from '@/lib/utils/plan-limits';

import type { PanelServiceUsage } from './ServicesList.types';

/** Lectura del cupo lista para pintar: sin cálculos en el JSX. */
export interface UsageView {
  unlimited: boolean;
  /** Ya no se puede publicar ni reactivar ningún servicio más. */
  atLimit: boolean;
  activeCount: number;
  maxServices: number;
}

/**
 * Traduce el cupo del plan a lo que necesita el listado: si es ilimitado
 * (Premium) y si el negocio ya está en el límite.
 */
export function getUsageView(usage: PanelServiceUsage): UsageView {
  const unlimited = isUnlimitedServices(usage.maxServices);
  return {
    unlimited,
    atLimit: !unlimited && usage.activeCount >= usage.maxServices,
    activeCount: usage.activeCount,
    maxServices: usage.maxServices,
  };
}
