import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Webhook de Clerk → Yaiwell (stub).
 *
 * Endpoint donde Clerk notifica eventos de usuario (`user.created`,
 * `user.updated`, `user.deleted`, etc.) para que sincronicemos la tabla
 * `User` de Supabase con la fuente de verdad de identidad (Clerk).
 *
 * **Estado actual: stub.** El handler real necesita:
 *
 * 1. `CLERK_WEBHOOK_SECRET` (lo genera Clerk al crear el endpoint en su
 *    dashboard; requiere URL pública: ngrok en local o deploy de Vercel).
 * 2. Verificación de firma con `svix` (Clerk usa svix bajo el capó). Sin
 *    verificar no podemos confiar en el payload.
 * 3. Lógica de sincronización: upsert en `prisma.user` por `clerkId`,
 *    soft delete en `user.deleted`, propagación de cambios de email.
 *
 * Mientras no haya secret, devolvemos 501 y dejamos el slot reservado
 * para que la URL no cambie cuando enchufemos el real.
 */

/**
 * Tipo del evento svix/Clerk validado por firma. Se rellena cuando se
 * implemente la verificación; aquí solo documenta la forma esperada.
 *
 * Eventos relevantes para Yaiwell:
 * - `user.created`  → upsert User { clerkId, email, role: 'client' }.
 * - `user.updated`  → actualiza email, locale, fullName, avatarUrl.
 * - `user.deleted`  → soft delete (`deletedAt`).
 */
// type ClerkWebhookEvent = WebhookEvent;

export async function POST(_request: NextRequest) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CLERK_WEBHOOK_SECRET no configurado.' }, { status: 501 });
  }

  // TODO: implementar cuando exista la URL pública y el secret.
  //
  // import { Webhook } from 'svix';
  // const svixId = request.headers.get('svix-id');
  // const svixTimestamp = request.headers.get('svix-timestamp');
  // const svixSignature = request.headers.get('svix-signature');
  // if (!svixId || !svixTimestamp || !svixSignature) {
  //   return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 });
  // }
  // const body = await request.text();
  // const wh = new Webhook(secret);
  // const evt = wh.verify(body, {
  //   'svix-id': svixId,
  //   'svix-timestamp': svixTimestamp,
  //   'svix-signature': svixSignature,
  // }) as WebhookEvent;
  //
  // switch (evt.type) {
  //   case 'user.created': await prisma.user.upsert({ ... }); break;
  //   case 'user.updated': await prisma.user.update({ ... }); break;
  //   case 'user.deleted': await prisma.user.update({ data: { deletedAt: new Date() } }); break;
  // }

  return NextResponse.json({ ok: true, stub: true }, { status: 200 });
}
