import 'server-only';

import { prisma } from '@/lib/db/prisma';
import type { LocalizedText } from '@/types/domain';

import type {
  BookingEmailContext,
  EmailRecipient,
  ProviderEmailContext,
} from './notifications.types';

const RECIPIENT_SELECT = { email: true, locale: true, fullName: true } as const;

/** Normaliza el destinatario: un nombre vacío cuenta como sin nombre. */
function toRecipient(user: {
  email: string;
  locale: EmailRecipient['locale'];
  fullName: string | null;
}) {
  return { email: user.email, locale: user.locale, fullName: user.fullName?.trim() || null };
}

/**
 * Lecturas para las plantillas de correo. Solo lectura y con `select`
 * explícito: el correo no necesita nada más que lo que pinta.
 */
export const notificationsRepository = {
  async findBookingContext(bookingId: string): Promise<BookingEmailContext | null> {
    const row = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        status: true,
        startAt: true,
        createdAt: true,
        priceCents: true,
        originalPriceCents: true,
        discountPct: true,
        notes: true,
        stripeRefundId: true,
        paymentMode: true,
        commissionCents: true,
        noShowAt: true,
        service: { select: { name: true } },
        professional: { select: { name: true } },
        client: { select: RECIPIENT_SELECT },
        provider: {
          select: {
            id: true,
            businessName: true,
            slug: true,
            address: true,
            owner: { select: RECIPIENT_SELECT },
          },
        },
      },
    });
    if (!row) return null;
    return {
      bookingId: row.id,
      status: row.status,
      startAt: row.startAt,
      createdAt: row.createdAt,
      priceCents: row.priceCents,
      originalPriceCents: row.originalPriceCents,
      discountPct: row.discountPct,
      notes: row.notes?.trim() || null,
      stripeRefundId: row.stripeRefundId,
      paymentMode: row.paymentMode,
      commissionCents: row.commissionCents,
      noShowAt: row.noShowAt,
      serviceName: row.service.name as unknown as LocalizedText,
      professionalName: row.professional.name,
      provider: {
        id: row.provider.id,
        name: row.provider.businessName,
        slug: row.provider.slug,
        address: row.provider.address,
      },
      client: toRecipient(row.client),
      owner: toRecipient(row.provider.owner),
    };
  },

  /** Reservas confirmadas que empiezan en `[start, end)`, para los recordatorios. */
  async findConfirmedBookingIdsStartingBetween(start: Date, end: Date): Promise<string[]> {
    const rows = await prisma.booking.findMany({
      where: { status: 'confirmed', startAt: { gte: start, lt: end } },
      select: { id: true },
      orderBy: { startAt: 'asc' },
    });
    return rows.map((row) => row.id);
  },

  async findProviderContext(providerId: string): Promise<ProviderEmailContext | null> {
    const row = await prisma.provider.findUnique({
      where: { id: providerId },
      select: { id: true, businessName: true, owner: { select: RECIPIENT_SELECT } },
    });
    if (!row) return null;
    return { providerId: row.id, name: row.businessName, owner: toRecipient(row.owner) };
  },
};
