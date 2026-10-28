import 'server-only';

import type { AppLocale } from '@/i18n/routing';
import { requireCurrentProvider } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

/** Negocio autenticado y el `User.id` interno de su dueño. */
export interface ProviderOwner {
  providerId: string;
  userId: string;
}

/**
 * Resuelve el Provider autenticado y el `User.id` interno de su dueño.
 *
 * Los services de reservas y de huecos liberados autorizan comparando
 * contra `provider.userId` (no contra el `clerkId`), así que traducimos
 * aquí una sola vez para todas las actions del calendario.
 *
 * @returns el par `{ providerId, userId }`, o `null` si no hay provider.
 */
export async function resolveProviderOwner(locale: AppLocale): Promise<ProviderOwner | null> {
  let providerId: string;
  try {
    const provider = await requireCurrentProvider(locale);
    providerId = provider.id;
  } catch {
    // `requireCurrentProvider` redirige cuando no hay provider; este
    // catch cubre el caso defensivo de no llegar a redirect (tests,
    // entornos sin Clerk montado, etc.).
    return null;
  }

  const providerRow = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { userId: true },
  });

  return providerRow ? { providerId, userId: providerRow.userId } : null;
}
