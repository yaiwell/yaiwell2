import type { StorageBucket } from '@/lib/integrations/supabase/storage.types';

/**
 * Tipos específicos del componente PhotoUploader.
 *
 * Mantenemos `StorageBucket` re-importado del wrapper de Storage para
 * que el consumidor pueda usar el componente sin importar de dos
 * fachadas distintas.
 */

/**
 * Cada foto subida queda representada por su path interno + URL pública.
 * El consumidor guarda normalmente solo la URL pública (en
 * `Provider.photos[]` o `Service.photos[]`), pero el path es útil para
 * borrar más tarde.
 */
export interface UploadedPhoto {
  path: string;
  publicUrl: string;
}

export interface PhotoUploaderProps {
  /** Bucket destino. */
  bucket: StorageBucket;
  /**
   * Identificador del dueño que se usará como primer segmento del path:
   *  - `avatars`: el `clerkId` del usuario.
   *  - `provider-photos` / `service-photos`: el `providerId`.
   */
  ownerId: string;
  /** Número máximo de fotos permitidas (incluye las iniciales). */
  maxFiles?: number;
  /**
   * URLs (publicUrl) ya subidas previamente que queremos mostrar como
   * "ya en la galería". El componente las trata como inmutables salvo
   * cuando el usuario las elimina.
   */
  initialUrls?: string[];
  /**
   * Callback invocado cada vez que cambia el conjunto de URLs activas
   * (subidas + eliminadas). El consumidor decide cómo persistir.
   */
  onChange?: (urls: string[]) => void;
}

/**
 * Estado de una subida en curso o ya finalizada.
 */
export interface PhotoUploadState {
  id: string;
  fileName: string;
  status: 'uploading' | 'done' | 'error';
  publicUrl?: string;
  path?: string;
  errorMessage?: string;
}
