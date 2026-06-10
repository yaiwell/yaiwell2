import { auth } from '@clerk/nextjs/server';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/db/prisma';
import {
  ProviderForOnboardingNotFoundError,
  updateProviderPhotos,
} from '@/lib/services/provider-onboarding';

/**
 * Endpoint del wizard de onboarding — paso 2: actualizar las fotos del centro.
 *
 * Diseño:
 *  - El handler valida solo `providerId`; el contenido de `photos` (URLs
 *    Supabase Storage, tamaño máximo del array, MIME validado en upload)
 *    lo valida el servicio con Zod.
 *  - Respondemos 204 No Content en éxito porque no hay payload útil que
 *    devolver y el wizard avanza solo de paso.
 *
 * Contrato:
 *  - `PATCH /api/provider-onboarding/photos`
 *  - Body: `{ providerId: string, photos: string[] }`.
 *  - 204: éxito.
 *  - 400 / 401 / 404 / 500: ver mapeo de errores.
 */

const bodyShapeSchema = z.object({
  providerId: z.string().min(1, 'providerId requerido.'),
  photos: z.array(z.string()),
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

  // 3. Parseo del JSON + shape mínimo (Zod).
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

  // 4. Delegación al servicio + mapeo de errores tipados.
  try {
    await updateProviderPhotos(parsed.data.providerId, { photos: parsed.data.photos }, user.id);
    // 204 No Content: usamos `new NextResponse(null, ...)` para no
    // emitir body (NextResponse.json siempre añade payload).
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
    console.error('[api/provider-onboarding/photos] unexpected error:', err);
    return NextResponse.json({ error: { code: 'INTERNAL' } }, { status: 500 });
  }
}
