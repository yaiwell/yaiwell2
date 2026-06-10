import { auth } from '@clerk/nextjs/server';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/db/prisma';
import { isSlugAvailable } from '@/lib/services/provider-onboarding';

/**
 * Endpoint del wizard de onboarding — comprobación de disponibilidad de slug.
 *
 * Diseño:
 *  - Requiere sesión (no es un endpoint público; solo lo consume el
 *    wizard del proveedor en sesión). Esto evita enumeración masiva de
 *    slugs por parte de bots no autenticados.
 *  - Validamos el slug en el handler porque no llega a tocar el servicio
 *    si no cumple el formato (`/^[a-z0-9-]+$/`, 3-60 chars). Así
 *    cortamos en el borde inputs claramente inválidos.
 *
 * Contrato:
 *  - `GET /api/provider-onboarding/slug-availability?slug=xxx`
 *  - 200: `{ available: boolean }`.
 *  - 400: slug inválido.
 *  - 401: sin sesión o sin user sincronizado.
 *  - 500: error inesperado.
 */

const slugSchema = z
  .string()
  .min(3, 'Slug demasiado corto.')
  .max(60, 'Slug demasiado largo.')
  .regex(/^[a-z0-9-]+$/, 'Slug con caracteres no permitidos.');

interface SuccessBody {
  available: boolean;
}

interface ErrorBody {
  error: { code: string; message?: string; issues?: z.ZodIssue[] };
}

export async function GET(request: NextRequest): Promise<NextResponse<SuccessBody | ErrorBody>> {
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

  // 3. Validación del query param `slug`.
  const rawSlug = request.nextUrl.searchParams.get('slug');
  const parsed = slugSchema.safeParse(rawSlug);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'INVALID_BODY', issues: parsed.error.issues } },
      { status: 400 },
    );
  }

  // 4. Delegación al servicio.
  try {
    const available = await isSlugAvailable(parsed.data);
    return NextResponse.json({ available }, { status: 200 });
  } catch (err) {
    console.error('[api/provider-onboarding/slug-availability] unexpected error:', err);
    return NextResponse.json({ error: { code: 'INTERNAL' } }, { status: 500 });
  }
}
