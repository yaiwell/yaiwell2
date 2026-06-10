import { auth } from '@clerk/nextjs/server';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/db/prisma';
import {
  PlanTierNotFoundError,
  ProviderForOnboardingNotFoundError,
  selectPlan,
} from '@/lib/services/provider-onboarding';

/**
 * Endpoint del wizard de onboarding — paso final: selección de plan.
 *
 * Diseño:
 *  - Solo validamos en el handler la forma del body y la enum de
 *    `planTier`. El servicio aplica la lógica real (comprobar que el
 *    plan está sembrado, asignar `planId`, etc.).
 *  - `PlanTierNotFoundError` se mapea a 422: el plan referenciado existe
 *    como enum pero no en la tabla Plan (deuda de seed → arreglar
 *    operacionalmente, no a base de seguir intentando).
 *
 * Contrato:
 *  - `PATCH /api/provider-onboarding/plan`
 *  - Body: `{ providerId: string, planTier: 'free' | 'basic' | 'pro' | 'premium' }`.
 *  - 204: éxito.
 */

const bodyShapeSchema = z.object({
  providerId: z.string().min(1, 'providerId requerido.'),
  planTier: z.enum(['free', 'basic', 'pro', 'premium']),
});

interface ErrorBody {
  error: { code: string; message?: string; issues?: z.ZodIssue[] };
}

export async function PATCH(request: NextRequest): Promise<NextResponse<ErrorBody | null>> {
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

  // 3. Parseo + validación de shape.
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_BODY', message: 'Body JSON inválido.' } },
      { status: 400 },
    );
  }
  const parsed = bodyShapeSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'INVALID_BODY', issues: parsed.error.issues } },
      { status: 400 },
    );
  }

  // 4. Delegación al servicio.
  try {
    await selectPlan(parsed.data.providerId, { planTier: parsed.data.planTier }, user.id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'INVALID_BODY', issues: err.issues } },
        { status: 400 },
      );
    }
    if (err instanceof ProviderForOnboardingNotFoundError) {
      return NextResponse.json({ error: { code: err.code } }, { status: 404 });
    }
    if (err instanceof PlanTierNotFoundError) {
      return NextResponse.json({ error: { code: err.code } }, { status: 422 });
    }
    console.error('[api/provider-onboarding/plan] unexpected error:', err);
    return NextResponse.json({ error: { code: 'INTERNAL' } }, { status: 500 });
  }
}
