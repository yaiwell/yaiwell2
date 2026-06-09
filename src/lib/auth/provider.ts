import 'server-only';

import { auth } from '@clerk/nextjs/server';

import { prisma } from '@/lib/db/prisma';
import { redirect } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';

import { requireRole } from './guard';

/**
 * Resultado de `requireCurrentProvider` — datos mínimos del Provider
 * que el panel necesita para componer header y guardar decisiones de
 * gating (planId para CRUD de servicios, verificationStatus para
 * banner de "verificación pendiente").
 */
export interface CurrentProvider {
  id: string;
  businessName: string;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  planId: string;
}

/**
 * Resuelve el `providerId` del usuario autenticado.
 *
 * Camino: sesión Clerk → `userId` (clerkId) → row en `users` → primer
 * Provider asociado vivo (deletedAt null). Devuelve null si en cualquier
 * paso falta el match — el caller decide qué hacer (redirigir, mostrar
 * UI de onboarding, etc.).
 *
 * No lanza: pensado para componentes que tienen flujo distinto según
 * exista o no Provider. Para "obligar a existir + redirigir" usar
 * `requireCurrentProvider`.
 *
 * @returns providerId o null si no hay sesión / no hay user en BD /
 *   no hay Provider asociado.
 */
export async function getCurrentProviderId(): Promise<string | null> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  // El user row se crea via webhook `user.created` (capa 2 de auth).
  // Si todavía no ha llegado, retornamos null y el caller redirige.
  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true },
  });
  if (!user) return null;

  const provider = await prisma.provider.findFirst({
    where: { userId: user.id, deletedAt: null },
    select: { id: true },
  });

  return provider?.id ?? null;
}

/**
 * Variante "obligatoria" del resolver, pensada para layouts protegidos
 * del panel del proveedor.
 *
 * Aplica el guard de rol `provider` (mismo patrón que el resto de
 * layouts) y, si todo está bien, resuelve el Provider asociado al
 * usuario. Si no existe (caso típico: provider recién registrado),
 * redirige a `/panel/onboarding` para que el wizard lo cree.
 *
 * Nota arquitectónica: optamos por **Opción B** — el Provider no se
 * pre-crea en el webhook con campos placeholder, lo crea el wizard
 * de onboarding (#57) como única fuente de verdad. El schema Prisma
 * tiene varios NOT NULL (slug UNIQUE, location PostGIS, address) y
 * relajarlos para un row vacío forzaría tocar RLS, índices y el
 * trigger FTS. Mantener la creación en un solo lugar evita ese coste.
 *
 * @param locale — locale activo del request (necesario para
 *   `redirect` de next-intl).
 * @returns datos del Provider si pasa el guard. Si no, llama a
 *   `redirect` (que lanza internamente y nunca retorna).
 */
export async function requireCurrentProvider(locale: AppLocale): Promise<CurrentProvider> {
  // Reutilizamos `requireRole` para no duplicar el flujo de sesión →
  // claims → fallback a currentUser → comprobación de rol → redirect.
  await requireRole(['provider'], locale);

  const providerId = await getCurrentProviderId();
  if (!providerId) {
    redirect({ href: '/panel/onboarding', locale });
    throw new Error('unreachable: redirect should have thrown');
  }

  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    select: {
      id: true,
      businessName: true,
      verificationStatus: true,
      planId: true,
    },
  });

  // Defensa contra una carrera muy improbable: provider eliminado
  // entre los dos queries. Tratamos igual que "no existe".
  if (!provider) {
    redirect({ href: '/panel/onboarding', locale });
    throw new Error('unreachable: redirect should have thrown');
  }

  return provider;
}
