/**
 * Tipos compartidos del wrapper de Supabase Storage.
 *
 * Los nombres de bucket viven aquí en vez de en `storage.ts` para que
 * los puedan importar componentes (cliente) sin arrastrar el SDK
 * server-only.
 */

/**
 * Buckets disponibles en Yaiwell.
 * Cualquier escritura sobre Storage debe usar uno de estos identificadores.
 * Mantener sincronizado con la migración `5_storage_buckets`.
 */
export type StorageBucket = 'provider-photos' | 'service-photos' | 'avatars';

/**
 * Conjunto de buckets válidos en runtime — útil para validaciones Zod
 * y para componentes que necesitan comprobar pertenencia.
 */
export const STORAGE_BUCKETS: readonly StorageBucket[] = [
  'provider-photos',
  'service-photos',
  'avatars',
] as const;

/**
 * MIME types permitidos para imágenes. Replicamos los del bucket en SQL
 * porque la validación se hace también en el backend antes de tocar
 * Storage.
 */
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
] as const;

/**
 * Tamaño máximo en bytes por archivo (5 MB). Sincronizado con la
 * migración SQL.
 */
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Resultado de una subida exitosa.
 */
export interface UploadImageResult {
  /** URL pública servida por el CDN de Supabase. */
  publicUrl: string;
  /** Path interno dentro del bucket (`<ownerId>/<uuid>.<ext>`). */
  path: string;
}
