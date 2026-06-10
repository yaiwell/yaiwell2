import { auth } from '@clerk/nextjs/server';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/db/prisma';
import {
  CategoryNotFoundError,
  createFirstServiceForProvider,
  ProviderForOnboardingNotFoundError,
} from '@/lib/services/provider-onboarding';

/**
 * Endpoint del wizard de onboarding — paso 3: crear el primer `Service`.
 *
 * Diseño:
 *  - El handler solo extrae `providerId` del body y reenvía el resto al
 *    servicio, que valida `CreateFirstServiceInput` con Zod (nombre,
 *    duración, precio en céntimos, categoría, etc.).
 *  - `CategoryNotFoundError` lo mapeamos a 422 porque es un input
 *    semánticamente válido pero referencia una entidad inexistente.
 *
 * Contrato:
 *  - `POST /api/provider-onboarding/first-service`
 *  - Body: `{ providerId: string, ...CreateFirstServiceInput }`.
 *  - 200: `{ serviceId: string }`.
 */

const providerIdShape = z.object({
  providerId: z.string().min(1, 'providerId requerido.'),
});

interface SuccessBody {
  serviceId: string;
}

interface ErrorBody {
  error: { code: string; message?: string; issues?: z.ZodIssue[] };
}

export async function POST(request: NextRequest): Promise<NextResponse<SuccessBody | ErrorBody>> {
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

  // 3. Parseo del JSON + extracción del providerId.
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_BODY', message: 'Body JSON inválido.' } },
      { status: 400 },
    );
  }
  // Solo validamos en el handler que el body tenga `providerId`. El
  // resto de campos los valida la función del servicio (más fuerte y
  // tipada al dominio).
  const parsed = providerIdShape.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'INVALID_BODY', issues: parsed.error.issues } },
      { status: 400 },
    );
  }

  // 4. Delegación al servicio.
  try {
    const result = await createFirstServiceForProvider(parsed.data.providerId, raw, user.id);
    return NextResponse.json({ serviceId: result.serviceId }, { status: 200 });
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
    if (err instanceof CategoryNotFoundError) {
      return NextResponse.json({ error: { code: err.code } }, { status: 422 });
    }
    console.error('[api/provider-onboarding/first-service] unexpected error:', err);
    return NextResponse.json({ error: { code: 'INTERNAL' } }, { status: 500 });
  }
}
