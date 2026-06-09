/**
 * API pública de la integración Supabase.
 *
 * Importar siempre desde este barrel; el interior puede cambiar (swap
 * de SDK, mocks, caching) sin tocar los call sites.
 */

export { getSupabaseServiceClient, getSupabaseAnonClient } from './client';
export { uploadImage, deleteImage, getPublicUrl } from './storage';
export { StorageConfigError, StorageUploadError, StorageDeleteError } from './storage.errors';
export { STORAGE_BUCKETS, ALLOWED_IMAGE_MIME_TYPES, MAX_FILE_SIZE_BYTES } from './storage.types';
export type { StorageBucket, UploadImageResult } from './storage.types';
