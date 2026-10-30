import type { AppLocale } from '@/i18n/routing';
import type { SupportSanctionSummary } from '@/lib/services/sanctions';

/**
 * Tipos de la pantalla de sanciones de soporte. `SupportSanctionSummary`
 * se importa solo como tipo: el barrel de `sanctions` arrastra Prisma.
 */
export interface SanctionsListProps {
  sanctions: SupportSanctionSummary[];
  locale: AppLocale;
  /** Filtro por email aplicado (para el campo y el texto de vacío). */
  emailFilter: string | null;
}
