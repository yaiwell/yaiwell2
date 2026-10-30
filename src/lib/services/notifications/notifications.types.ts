/**
 * Tipos del dominio de notificaciones por email.
 */
import type { BookingStatus } from '@prisma/client';

import type { AppLocale } from '@/i18n/routing';
import type { LocalizedText } from '@/types/domain';

/** Destinatario con su idioma: cada correo sale en el de quien lo recibe. */
export interface EmailRecipient {
  email: string;
  locale: AppLocale;
  fullName: string | null;
}

/** Datos de una reserva que necesitan las plantillas de correo. */
export interface BookingEmailContext {
  bookingId: string;
  /** Estado actual: el aviso se descarta si ya no es el que lo motivó. */
  status: BookingStatus;
  startAt: Date;
  /** Momento de la reserva: decide si fue de última hora. */
  createdAt: Date;
  priceCents: number;
  /** Precio del servicio antes del descuento; `null` si no hubo hueco rebajado. */
  originalPriceCents: number | null;
  discountPct: number | null;
  notes: string | null;
  /** Último refund emitido (`re_…`); identifica cada devolución en las claves. */
  stripeRefundId: string | null;
  /**
   * Online o en el local (§4.bis). En el local no hubo cobro: los correos
   * dicen cuánto se paga en el negocio y avisan de la sanción por no
   * presentarse.
   */
  paymentMode: 'online' | 'onsite';
  /** Comisión de Yaiwell congelada en la reserva (al negocio, en su factura si es en el local). */
  commissionCents: number;
  /** Cuándo se marcó «no presentado» (`null` si no lo está): distingue cada marca. */
  noShowAt: Date | null;
  serviceName: LocalizedText;
  professionalName: string | null;
  provider: { id: string; name: string; slug: string; address: string };
  client: EmailRecipient;
  owner: EmailRecipient;
}

/** Datos de un negocio para los avisos de verificación. */
export interface ProviderEmailContext {
  providerId: string;
  name: string;
  owner: EmailRecipient;
}

/**
 * Contenido de un correo, independiente del formato. La misma
 * estructura se pinta como HTML y como texto plano, así ambas
 * versiones nunca divergen.
 */
export interface EmailContent {
  subject: string;
  heading: string;
  greeting: string;
  paragraphs: string[];
  /** Pares etiqueta/valor (servicio, hora, dirección…). */
  details: Array<{ label: string; value: string }>;
  /** Texto destacado tal cual lo escribió alguien (motivo de rechazo). */
  quote?: string;
  /** Párrafos que van tras la cita y los detalles, antes del botón. */
  outro?: string[];
  cta?: { label: string; url: string };
  signature: string;
  footer: string;
}

/**
 * Qué contar al cliente sobre su dinero:
 *  - `refunded`: reembolso emitido (o ya hecho).
 *  - `refund_pending`: se lo debemos y lo tramita soporte.
 *  - `refund_uncertain`: no sabemos si llegó a cobrarse.
 *  - `no_payment`: no hubo cobro.
 */
export type CancellationRefundState =
  | 'refunded'
  | 'refund_pending'
  | 'refund_uncertain'
  | 'no_payment';

/**
 * Lo que cuenta el aviso de «no presentado» (de `markBookingNoShow`).
 * `sanctionsInWindow` y `restrictedUntil` solo tienen sentido con
 * `sanctionApplied` (reserva en el local).
 */
export interface NoShowNotice {
  sanctionApplied: boolean;
  /** Sanciones vigentes en los últimos 12 meses, contando esta. */
  sanctionsInWindow: number;
  /** Fin del bloqueo «solo online» si con esta sanción salta; `null` si no. */
  restrictedUntil: Date | null;
}
