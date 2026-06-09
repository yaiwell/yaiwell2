import { randomUUID } from 'node:crypto';

import { auth } from '@clerk/nextjs/server';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/db/prisma';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  STORAGE_BUCKETS,
  StorageUploadError,
  uploadImage,
} from '@/lib/integrations/supabase';
import type { StorageBucket } from '@/lib/integrations/supabase';

/**
 * Endpoint privado de subida de imágenes a Supabase Storage.
 *
 * Es el único camino por el que la app escribe en Storage: la RLS deja
 * todas las escrituras denegadas para anon/authenticated y solo el
 * service role (que se queda en este backend) puede subir. La
 * autorización completa vive aquí:
 *
 *   1. Sesión Clerk válida — 401 si no.
 *   2. `bucket` y `ownerId` consistentes con el usuario:
 *      - `avatars`: ownerId DEBE ser el `clerkId` del solicitante.
 *      - `provider-photos` / `service-photos`: ownerId DEBE ser un
 *        `providerId` cuyo `userId` mapea a un `User.clerkId` igual al
 *        solicitante. (Owner del centro.)
 *   3. Validaciones técnicas del archivo (MIME, tamaño).
 *
 * Path generado en server: `<ownerId>/<uuid>.<ext>`. El UUID evita
 * enumeración por nombres predecibles y elimina colisiones; el nombre
 * original del archivo se descarta a propósito (PII y caracteres raros).
 *
 * Contrato:
 *  - `POST /api/storage/upload` (FormData)
 *     · `bucket`: StorageBucket
 *     · `ownerId`: string
 *     · `file`: File
 *  - 200: `{ publicUrl, path }`
 *  - 400: validación (`{ error: { code, message } }`)
 *  - 401: sin sesión
 *  - 403: ownership wrong
 *  - 413: archivo demasiado grande
 *  - 500: fallo storage o inesperado
 */

const bodySchema = z.object({
  bucket: z.enum(STORAGE_BUCKETS as readonly [StorageBucket, ...StorageBucket[]]),
  ownerId: z.string().min(1, 'ownerId requerido.').max(128),
});

interface SuccessBody {
  publicUrl: string;
  path: string;
}

interface ErrorBody {
  error: { code: string; message: string };
}

/**
 * Devuelve la extensión "limpia" para el path final, a partir del MIME.
 * Preferimos derivar la extensión del MIME (de confianza tras validar)
 * en vez del nombre original del archivo (no fiable).
 */
function extensionFromMime(mime: string): string {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/avif':
      return 'avif';
    default:
      // Defensivo: si llegase aquí un MIME no permitido, devolvemos
      // `bin` — pero la validación previa ya debería haberlo cortado.
      return 'bin';
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<SuccessBody | ErrorBody>> {
  // -----------------------------------------------------------------
  // 1. Sesión Clerk.
  // -----------------------------------------------------------------
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Se requiere sesión.' } },
      { status: 401 },
    );
  }

  // -----------------------------------------------------------------
  // 2. Parseo del FormData. Si el body no es multipart, `formData()`
  //    lanza TypeError — lo tratamos como 400.
  // -----------------------------------------------------------------
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      {
        error: {
          code: 'BAD_REQUEST',
          message: 'Se esperaba un cuerpo multipart/form-data.',
        },
      },
      { status: 400 },
    );
  }

  const rawBucket = formData.get('bucket');
  const rawOwnerId = formData.get('ownerId');
  const rawFile = formData.get('file');

  const parsed = bodySchema.safeParse({
    bucket: typeof rawBucket === 'string' ? rawBucket : undefined,
    ownerId: typeof rawOwnerId === 'string' ? rawOwnerId : undefined,
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      {
        error: {
          code: 'BAD_REQUEST',
          message: first?.message ?? 'Parámetros inválidos.',
        },
      },
      { status: 400 },
    );
  }
  const { bucket, ownerId } = parsed.data;

  // El File no lo valida Zod (no es trivial en formdata polyfills);
  // lo verificamos a mano.
  if (!(rawFile instanceof File)) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'Falta el archivo `file`.' } },
      { status: 400 },
    );
  }

  if (rawFile.size === 0) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'El archivo está vacío.' } },
      { status: 400 },
    );
  }

  if (rawFile.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      {
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: `El archivo supera el tamaño máximo (${MAX_FILE_SIZE_BYTES} bytes).`,
        },
      },
      { status: 413 },
    );
  }

  const mime = rawFile.type;
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(mime as (typeof ALLOWED_IMAGE_MIME_TYPES)[number])) {
    return NextResponse.json(
      {
        error: {
          code: 'BAD_REQUEST',
          message: `Tipo de archivo no permitido: ${mime || 'desconocido'}.`,
        },
      },
      { status: 400 },
    );
  }

  // -----------------------------------------------------------------
  // 3. Autorización: comprobar que el ownerId pertenece al solicitante.
  // -----------------------------------------------------------------
  const authorized = await isAuthorizedToWrite(bucket, ownerId, clerkUserId);
  if (!authorized) {
    return NextResponse.json(
      {
        error: {
          code: 'FORBIDDEN',
          message: 'No tienes permiso para subir a este recurso.',
        },
      },
      { status: 403 },
    );
  }

  // -----------------------------------------------------------------
  // 4. Subida vía wrapper.
  // -----------------------------------------------------------------
  const ext = extensionFromMime(mime);
  const path = `${ownerId}/${randomUUID()}.${ext}`;

  try {
    const result = await uploadImage({ bucket, path, file: rawFile, contentType: mime });
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof StorageUploadError) {
      // No filtramos el detalle interno del SDK al cliente; Sentry recoge
      // el stack a través del handler global.
      console.error('[api/storage/upload] fallo de Storage:', err);
      return NextResponse.json(
        { error: { code: err.code, message: 'No se pudo subir el archivo.' } },
        { status: 500 },
      );
    }
    console.error('[api/storage/upload] error inesperado:', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Error inesperado.' } },
      { status: 500 },
    );
  }
}

/**
 * Comprueba si el `clerkUserId` autenticado puede escribir bajo el
 * `ownerId` del bucket indicado.
 *
 * Reglas:
 *  - `avatars`: ownerId debe ser el propio clerkId.
 *  - `provider-photos` / `service-photos`: ownerId debe ser un
 *    `Provider.id` cuyo `userId` apunte al `User` con ese clerkId.
 */
async function isAuthorizedToWrite(
  bucket: StorageBucket,
  ownerId: string,
  clerkUserId: string,
): Promise<boolean> {
  if (bucket === 'avatars') {
    return ownerId === clerkUserId;
  }

  // provider-photos / service-photos: validamos ownership del centro.
  const provider = await prisma.provider.findFirst({
    where: { id: ownerId, deletedAt: null },
    select: { owner: { select: { clerkId: true } } },
  });
  return provider?.owner?.clerkId === clerkUserId;
}
