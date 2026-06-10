import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db/prisma';
import { loadOnboardingState } from '@/lib/services/provider-onboarding';

/**
 * Endpoint del wizard de onboarding — hidratación del estado actual.
 *
 * Diseño:
 *  - Devuelve el `OnboardingState` del usuario en sesión para que el
 *    front pueda saltar al paso adecuado si el flujo se interrumpió
 *    (refrescar, cambiar de dispositivo, etc.).
 *  - Sin params: el `userId` deriva siempre de la sesión.
 *
 * Contrato:
 *  - `GET /api/provider-onboarding/state`
 *  - 200: `OnboardingState`.
 *  - 401: sin sesión o sin user sincronizado.
 *  - 500: error inesperado.
 */

interface ErrorBody {
  error: { code: string; message?: string };
}

export async function GET(): Promise<NextResponse<unknown | ErrorBody>> {
  // 1. Sesión Clerk.
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  }

  // 2. Resolución del userId interno.
  const user = await prisma.user.findUnique({
    where: { clerkId: clerkUserId },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: { code: 'USER_NOT_SYNCED' } }, { status: 401 });
  }

  // 3. Delegación al servicio.
  try {
    const state = await loadOnboardingState(user.id);
    return NextResponse.json(state, { status: 200 });
  } catch (err) {
    console.error('[api/provider-onboarding/state] unexpected error:', err);
    return NextResponse.json({ error: { code: 'INTERNAL' } }, { status: 500 });
  }
}
