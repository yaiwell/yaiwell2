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

import type { BookingPaymentMode, BookingStatus } from '@/lib/services/booking';
import type { LocalizedText } from '@/types/domain';

export type { BookingPaymentMode, BookingStatus };

/**
 * Reseña propia del cliente sobre una reserva. Solo los campos que pinta
 * la card: ni fotos ni respuesta del centro.
 */
export interface CustomerBookingReview {
  rating: number;
  text: string;
}

/**
 * Qué puede hacer el cliente sobre cancelar una reserva (§4.bis):
 *  - `allowed`: puede cancelarla ahora. `refundCents` es lo que se le
 *    devuelve si pagó online; `null` si no hubo cobro (una `pending`, o
 *    el futuro pago en el local). `untilStart`: sin cobro que proteger,
 *    se puede cancelar hasta el inicio (una `pending`), así que la UI no
 *    aplica la ventana de 2 h.
 *  - `lastMinute`: reserva de última hora, nunca cancelable.
 *  - `tooLate`: faltan menos de 2 h para el inicio.
 *  - `none`: su estado ya no admite cancelación (completada, cancelada…).
 */
export type CustomerBookingCancellation =
  | { kind: 'allowed'; refundCents: number | null; untilStart: boolean }
  | { kind: 'lastMinute' }
  | { kind: 'tooLate' }
  | { kind: 'none' };

/**
 * Una reserva del cliente lista para renderizar en el área privada.
 */
export interface CustomerBookingView {
  id: string;
  status: BookingStatus;
  /** Online o en el local (migración 9f): la card dice «Pago en el local». */
  paymentMode: BookingPaymentMode;
  startAt: Date;
  endAt: Date;
  /**
   * Momento en que se creó la reserva. Con `startAt` decide si fue de
   * última hora (< 2 h), que cambia lo que la card dice sobre cancelar.
   */
  createdAt: Date;
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
  /**
   * Momento en que el profesional marcó la reserva como finalizada.
   * `null` mientras no esté `completed`.
   */
  completedAt: Date | null;
  /** Indica si el cliente ya dejó reseña (solo aplica a `completed`). */
  hasReview: boolean;
  /** Valoración que dejó el cliente, para mostrarla en la card. */
  review: CustomerBookingReview | null;
  /**
   * Si la card debe ofrecer «Valorar». Lo calcula el servicio con la
   * misma regla que `createReview` (§4.bis): `completed` + dentro de la
   * ventana de 30 días + sin reseña. La UI no lo recalcula.
   */
  canReview: boolean;
  /**
   * `completed`, sin reseña y fuera de plazo: la card puede decir
   * «Plazo de valoración cerrado» en lugar de no decir nada.
   */
  reviewWindowClosed: boolean;
  /**
   * Veredicto sobre la cancelación, calculado en el servidor con las
   * mismas reglas que `cancelBookingByClient`. La UI no lo recalcula.
   */
  cancellation: CustomerBookingCancellation;
  /** Notas que el cliente escribió al reservar. */
  notes?: string;
}
