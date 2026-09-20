/**
 * Tipos del dominio "reservas del cliente".
 *
 * Proyección de lectura que alimenta `/mis-reservas`. No es el modelo
 * Prisma completo: trae ya resueltos servicio, proveedor y profesional
 * para que la UI no tenga que hacer lookups ni recibir relaciones
 * anidadas que no pinta.
 *
 * El `status` se importa del módulo `booking` (que a su vez lo toma del
 * enum de Prisma) para que exista una sola fuente de verdad sobre los
 * estados válidos de una reserva.
 */

import type { BookingStatus } from '@/lib/services/booking';
import type { LocalizedText } from '@/types/domain';

export type { BookingStatus };

/**
 * Una reserva del cliente lista para renderizar en el área privada.
 */
export interface CustomerBookingView {
  id: string;
  status: BookingStatus;
  startAt: Date;
  endAt: Date;
  priceCents: number;
  serviceId: string;
  /**
   * `Service.name` es una columna `Json` con forma `LocalizedText`; la
   * vista guarda el objeto completo y deja que el componente resuelva
   * el locale activo con `pickLocalized`.
   */
  serviceName: LocalizedText;
  professionalName: string;
  providerId: string;
  providerName: string;
  providerSlug: string;
  providerAddress: string;
  /**
   * Portada del proveedor. Es `null` cuando `Provider.photos` está
   * vacío — un centro puede completar el alta sin subir fotos, así que
   * la UI necesita un caso vacío explícito en lugar de un `src=""`.
   */
  providerPhoto: string | null;
  /** Indica si el cliente ya dejó reseña (solo aplica a `completed`). */
  hasReview: boolean;
  /** Notas que el cliente escribió al reservar. */
  notes?: string;
}
