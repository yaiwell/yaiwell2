import 'server-only';

import { getSupabaseServiceClient } from './client';
import { StorageDeleteError, StorageUploadError } from './storage.errors';
import type { StorageBucket, UploadImageResult } from './storage.types';

/**
 * Wrapper alrededor de Supabase Storage para uso server-side.
 *
 * Encapsula los detalles del SDK (`.from(bucket).upload(...)`) y devuelve
 * errores tipados que el caller puede mapear a códigos HTTP sin parsear
 * mensajes. Toda llamada usa el cliente con `SUPABASE_SERVICE_ROLE_KEY`,
 * de manera que la autorización (sesión Clerk + ownership) debe hacerse
 * en el caller (route handler / server action) ANTES de invocar estas
 * funciones.
 */

interface UploadImageInput {
  bucket: StorageBucket;
  /** Path destino dentro del bucket (`<ownerId>/<uuid>.<ext>`). */
  path: string;
  /**
   * Contenido del archivo. Aceptamos `Blob`, `File`, `ArrayBuffer` o
   * `Uint8Array` — los tipos que el SDK de Supabase soporta y que
   * cubren todos nuestros casos (FormData en API, Buffer en jobs).
   */
  file: Blob | File | ArrayBuffer | Uint8Array;
  contentType: string;
}

/**
 * Sube una imagen al bucket indicado y devuelve su URL pública.
 *
 * @throws StorageUploadError si Supabase rechaza la subida (path duplicado,
 *   tamaño, MIME no permitido, conexión, etc.).
 */
export async function uploadImage({
  bucket,
  path,
  file,
  contentType,
}: UploadImageInput): Promise<UploadImageResult> {
  const supabase = getSupabaseServiceClient();

  // `upsert: false` evita sobrescribir archivos existentes con el mismo
  // path. Como generamos siempre paths con UUID en el caller, una
  // colisión real indica un bug y preferimos un error explícito.
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType,
    upsert: false,
    // `cacheControl` largo: los archivos son inmutables (cada UUID es
    // único) así que el CDN puede cachear agresivamente.
    cacheControl: '31536000',
  });

  if (error) {
    throw new StorageUploadError(
      `Supabase rechazó la subida al bucket "${bucket}": ${error.message}`,
      error,
    );
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { publicUrl: data.publicUrl, path };
}

interface DeleteImageInput {
  bucket: StorageBucket;
  path: string;
}

/**
 * Elimina una imagen del bucket. Idempotente: si el path no existe
 * Supabase devuelve éxito (no error). Útil cuando el caller no quiere
 * comprobar antes si el archivo está.
 *
 * @throws StorageDeleteError si Supabase devuelve un error real
 *   (permisos, conexión, etc.).
 */
export async function deleteImage({ bucket, path }: DeleteImageInput): Promise<void> {
  const supabase = getSupabaseServiceClient();

  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    throw new StorageDeleteError(
      `Supabase rechazó el borrado en "${bucket}/${path}": ${error.message}`,
      error,
    );
  }
}

interface PublicUrlInput {
  bucket: StorageBucket;
  path: string;
}

/**
 * Devuelve la URL pública servida por el CDN de Supabase para un path.
 * No hace request: la URL se construye localmente con la base del
 * proyecto. Útil para mostrar imágenes ya subidas sin guardarlas en BD.
 */
export function getPublicUrl({ bucket, path }: PublicUrlInput): string {
  const supabase = getSupabaseServiceClient();
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
