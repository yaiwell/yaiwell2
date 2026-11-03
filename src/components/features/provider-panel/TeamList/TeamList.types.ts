/**
 * Tipos del listado del equipo. Los del dominio viven en
 * `@/lib/services/team` (aquí solo se importan como tipo).
 */
import type { TeamOverview } from '@/lib/services/team';

export type SupportedLocale = 'es' | 'ca' | 'en' | 'de';

export interface TeamListProps {
  overview: TeamOverview;
  locale: SupportedLocale;
}
