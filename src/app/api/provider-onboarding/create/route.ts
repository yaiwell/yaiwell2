import { auth } from '@clerk/nextjs/server';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  createProviderFromOnboarding,
  FreePlanNotSeededError,
  OnboardingAlreadyCompleteError,
  SlugAlreadyTakenError,
} from '@/lib/services/provider-onboarding';
import { ensureUserFromClerk, MissingPrimaryEmailError } from '@/lib/services/user';

/**
 * Endpoint del wizard de onboarding — paso 1: crear el `Provider`.
 *
 * Diseño:
 *  - Requiere sesión Clerk válida (rol implícito: futuro `provider`).
 *  - Resuelve el `userId` interno a partir del `clerkId` (sincronización
 *    Clerk → BD vía webhook). Si el `User` no existe, devolvemos 401 con
 *    `USER_NOT_SYNCED` para que el front fuerce un retry tras el webhook.
 *  - La validación de campos del body vive dentro del servicio (Zod), de
 *    modo que el handler solo se ocupa del envoltorio HTTP y del mapeo
 *    de errores tipados a status.
 *
 * Contrato:
 *  - `POST /api/provider-onboarding/create`
 *  - Body: `CreateProviderInput`.
 *  - 200: `{ providerId: string }`.
 *  - 400: `{ error: { code: 'INVALID_BODY', issues } }` si el servicio
 *    devuelve `ZodError`.
 *  - 401: `{ error: { code: 'UNAUTHORIZED' | 'USER_NOT_SYNCED' } }`.
 *  - 409: `SLUG_ALREADY_TAKEN` u `ONBOARDING_ALREADY_COMPLETE`.
 *  - 500: `FREE_PLAN_NOT_SEEDED` (config server) o `INTERNAL`.
 */

interface SuccessBody {
  providerId: string;
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

  // 2. Resolución del userId interno con auto-sync defensivo. Si el
  //    webhook `user.created` no llegó a tiempo, lo creamos sobre la
  //    marcha desde Clerk Backend para no bloquear el wizard.
  let user: { id: string };
  try {
    user = await ensureUserFromClerk(clerkUserId);
  } catch (err) {
    if (err instanceof MissingPrimaryEmailError) {
      return NextResponse.json({ error: { code: 'USER_NOT_SYNCED' } }, { status: 401 });
    }
    console.error('[api/provider-onboarding/create] ensureUserFromClerk error:', err);
    return NextResponse.json({ error: { code: 'INTERNAL' } }, { status: 500 });
  }

  // 3. Parseo del JSON. Si no llega body JSON válido, 400.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_BODY', message: 'Body JSON inválido.' } },
      { status: 400 },
    );
  }

  // 4. Delegación al servicio + mapeo de errores tipados a HTTP.
  try {
    const result = await createProviderFromOnboarding(body, user.id);
    return NextResponse.json({ providerId: result.providerId }, { status: 200 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'INVALID_BODY', issues: err.issues } },
        { status: 400 },
      );
    }
    if (err instanceof SlugAlreadyTakenError) {
      return NextResponse.json({ error: { code: err.code } }, { status: 409 });
    }
    if (err instanceof OnboardingAlreadyCompleteError) {
      return NextResponse.json({ error: { code: err.code } }, { status: 409 });
    }
    if (err instanceof FreePlanNotSeededError) {
      return NextResponse.json({ error: { code: err.code } }, { status: 500 });
    }
    console.error('[api/provider-onboarding/create] unexpected error:', err);
    return NextResponse.json({ error: { code: 'INTERNAL' } }, { status: 500 });
  }
}
