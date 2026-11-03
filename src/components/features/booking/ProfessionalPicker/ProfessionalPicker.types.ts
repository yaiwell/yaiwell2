import type { PublicProfessional } from '@/types/domain';

/**
 * Tipos del selector de profesional del flujo de reserva.
 */
export interface ProfessionalPickerProps {
  /** Profesionales activos que prestan el servicio, por antigüedad. */
  professionals: PublicProfessional[];
  /** Profesional elegido; `null` = «Cualquiera disponible». */
  value: string | null;
  onChange: (professionalId: string | null) => void;
}
