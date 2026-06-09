import type { DeletedObjectJSON, UserJSON, WebhookEvent } from '@clerk/backend';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { Webhook } from 'svix';

import { promoteRoleToPublicMetadata } from '@/lib/auth/server';
import {
  deleteUserFromClerk,
  MissingPrimaryEmailError,
  syncUserFromClerk,
  UserNotFoundError,
} from '@/lib/services/user';

/**
 * Webhook de Clerk → Yaiwell.
 *
 * Clerk envía aquí los eventos del ciclo de vida de los usuarios
 * (`user.created`, `user.updated`, `user.deleted` + otros que ignoramos).
 * Sincronizamos la tabla `users` de Supabase para que el resto del
 * sistema pueda joinear por `clerkId` sin pegar a Clerk en cada request.
 *
 * **Firma + idempotencia:** verificamos cada request con `svix` antes de
 * tocar la BD; sin firma válida devolvemos 400. El upsert por `clerkId`
 * hace la operación naturalmente idempotente — un reintento de Clerk
 * con el mismo payload no duplica filas.
 *
 * **Política de respuestas:**
 * - 200 si todo OK, o si recibimos un evento que ignoramos (Clerk
 *   reintenta ante cualquier no-2xx, así que un 4xx en eventos válidos
 *   sería un bucle).
 * - 400 si el header svix falta o la firma no verifica.
 * - 501 si no está configurado `CLERK_WEBHOOK_SECRET` — útil en local
 *   antes de tener URL pública con ngrok.
 * - 500 solo en errores realmente inesperados (Prisma caído, etc.).
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CLERK_WEBHOOK_SECRET no configurado.' }, { status: 501 });
  }

  // Headers obligatorios de svix. Si falta cualquiera, ni intentamos
  // verificar — es señal de petición no proveniente de Clerk.
  const svixId = request.headers.get('svix-id');
  const svixTimestamp = request.headers.get('svix-timestamp');
  const svixSignature = request.headers.get('svix-signature');
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing svix headers.' }, { status: 400 });
  }

  // Body en texto plano: svix verifica la firma sobre el cuerpo crudo.
  // Si parseamos a JSON antes y re-serializamos, la firma puede fallar
  // por diferencias de whitespace.
  const rawBody = await request.text();

  let event: WebhookEvent;
  try {
    const wh = new Webhook(secret);
    event = wh.verify(rawBody, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as WebhookEvent;
  } catch {
    // No logueamos el body para no filtrar PII en logs. Clerk no
    // debería pegar nunca con firma inválida; si pasa, alguien está
    // probando el endpoint a mano.
    return NextResponse.json({ error: 'Invalid svix signature.' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'user.created':
        // 1) Promovemos rol unsafe→public ANTES del sync para que la
        // copia en Supabase ya quede con el rol correcto si el sign-up
        // sólo lo guardó en unsafe. La promoción es idempotente y no
        // sobrescribe un publicMetadata.role ya válido.
        await promoteRoleToPublicMetadata(event.data as UserJSON);
        await syncUserFromClerk(event.data as UserJSON);
        return NextResponse.json({ ok: true, type: event.type }, { status: 200 });

      case 'user.updated':
        // En user.updated no promovemos: si el backend o un admin
        // decidió cambiar publicMetadata, lo respetamos sin "desfacerlo"
        // con un unsafe viejo.
        await syncUserFromClerk(event.data as UserJSON);
        return NextResponse.json({ ok: true, type: event.type }, { status: 200 });

      case 'user.deleted':
        await deleteUserFromClerk(event.data as DeletedObjectJSON);
        return NextResponse.json({ ok: true, type: event.type }, { status: 200 });

      default:
        // Ignoramos eventos que no nos interesan (sessions, organizations,
        // billing, etc.). Respondemos 200 para que Clerk no reintente.
        return NextResponse.json({ ok: true, ignored: event.type }, { status: 200 });
    }
  } catch (err) {
    // Casos esperables que tratamos como "ya está bien":
    // - El usuario no existe en BD al recibir user.deleted (race o purga
    //   previa). Respondemos 200 para no entrar en bucle de reintentos.
    // - El payload no tiene email primario (puede ocurrir en flujos
    //   OAuth incompletos). Lo dejamos pasar — Clerk volverá a notificar
    //   con un user.updated en cuanto el email se confirme.
    if (err instanceof UserNotFoundError || err instanceof MissingPrimaryEmailError) {
      return NextResponse.json({ ok: true, skipped: err.code }, { status: 200 });
    }
    // Fallo real (BD caída, error de Prisma): devolvemos 500 para que
    // Clerk reintente con backoff exponencial.
    return NextResponse.json({ error: 'Internal error processing webhook.' }, { status: 500 });
  }
}
