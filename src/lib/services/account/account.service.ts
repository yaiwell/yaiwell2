import 'server-only';

import { clerkClient } from '@clerk/nextjs/server';

import { ensureUserFromClerk, userRepository } from '@/lib/services/user';

import { AccountDeletionBlockedError, type AccountDeletionBlockReason } from './account.errors';
import { accountRepository } from './account.repository';
import type { AccountExport } from './account.types';

/**
 * Prepara la copia de datos del titular de la cuenta.
 *
 * Solo datos que aportó o que le afectan: nada de identificadores de Stripe
 * ni notas internas de soporte. Clerk y Stripe guardan los suyos aparte, como
 * explica la política de privacidad.
 *
 * @param clerkUserId — usuario autenticado.
 */
export async function buildAccountExport(clerkUserId: string): Promise<AccountExport> {
  const user = await ensureUserFromClerk(clerkUserId);
  const [bookings, reviews, sanctions, businesses] = await accountRepository.findExportRows(
    user.id,
  );

  return {
    exportedAt: new Date(),
    profile: {
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      locale: user.locale,
      role: user.role,
      createdAt: user.createdAt,
    },
    bookings: bookings.map((b) => ({
      id: b.id,
      provider: b.provider.businessName,
      service: b.service.name,
      professional: b.professional.name,
      startAt: b.startAt,
      endAt: b.endAt,
      status: b.status,
      paymentMode: b.paymentMode,
      priceCents: b.priceCents,
      originalPriceCents: b.originalPriceCents,
      discountPct: b.discountPct,
      notes: b.notes,
      createdAt: b.createdAt,
      completedAt: b.completedAt,
      cancelledAt: b.cancelledAt,
      noShowAt: b.noShowAt,
      refundedAt: b.refundedAt,
    })),
    reviews: reviews.map((r) => ({
      bookingId: r.bookingId,
      provider: r.provider.businessName,
      rating: r.rating,
      text: r.text,
      photos: r.photos,
      providerResponse: r.providerResponse,
      createdAt: r.createdAt,
    })),
    sanctions: sanctions.map((s) => ({
      bookingId: s.bookingId,
      reason: s.reason,
      occurredAt: s.occurredAt,
      revokedAt: s.revokedAt,
    })),
    businesses,
  };
}

/**
 * Elimina la cuenta del usuario autenticado.
 *
 * Bloquea a administración, a titulares de un negocio (tiene cuenta de Stripe,
 * facturas y clientes: lo gestiona soporte), las reservas sin cerrar (aún
 * pueden generar avisos, cobros o sanciones) y los reembolsos sin terminar.
 *
 * Primero Clerk y luego BD. Al revés, un fallo de Clerk dejaría una cuenta
 * viva apuntando a una fila ya anonimizada. Si falla la BD, el webhook
 * `user.deleted` anonimiza igualmente, y es idempotente.
 *
 * @param clerkUserId — usuario autenticado.
 * @throws AccountDeletionBlockedError si no se puede eliminar todavía.
 */
export async function deleteOwnAccount(clerkUserId: string): Promise<void> {
  const user = await ensureUserFromClerk(clerkUserId);

  const blocked = await findDeletionBlock(user.id, user.role);
  if (blocked) throw new AccountDeletionBlockedError(blocked);

  const client = await clerkClient();
  await client.users.deleteUser(clerkUserId);

  try {
    await userRepository.anonymizeByClerkId(clerkUserId);
  } catch (err) {
    // La cuenta ya no existe: no es un error para el usuario y el webhook lo
    // reintentará. Sin el error entero: el de Prisma podría llevar el email.
    const code = err instanceof Error ? err.name : 'unknown';
    console.error('[account] anonymize failed; webhook will retry:', user.id, code);
  }
}

async function findDeletionBlock(
  userId: string,
  role: string,
): Promise<AccountDeletionBlockReason | null> {
  if (role === 'admin') return 'admin';
  if ((await accountRepository.countOwnedProviders(userId)) > 0) return 'provider';
  if ((await accountRepository.countOpenBookings(userId)) > 0) return 'open_bookings';
  if ((await accountRepository.countOpenRefunds(userId)) > 0) return 'open_refunds';
  return null;
}
