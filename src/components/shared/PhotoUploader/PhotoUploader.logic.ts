'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
} from '@/lib/integrations/supabase/storage.types';
import type { StorageBucket } from '@/lib/integrations/supabase/storage.types';

import type { PhotoUploadState } from './PhotoUploader.types';

interface UsePhotoUploaderInput {
  bucket: StorageBucket;
  ownerId: string;
  maxFiles: number;
  initialUrls: readonly string[];
  onChange?: (urls: string[]) => void;
}

/**
 * Hook que orquesta el estado del PhotoUploader.
 *
 * Responsabilidades:
 *  - Mantener la lista de fotos (subidas previas + uploads en curso).
 *  - Validar tamaño/MIME antes de mandar al servidor (UX más rápida
 *    que esperar al 400 del backend).
 *  - Lanzar fetch a `/api/storage/upload` con FormData.
 *  - Notificar al consumidor (`onChange`) con la lista de URLs activas
 *    cada vez que cambia (subida exitosa o eliminación).
 *  - Gestionar mensajes de error agregados.
 *
 * No depende del DOM (más allá de `File`/`fetch`); el componente .tsx
 * es puramente presentacional.
 */
export function usePhotoUploader({
  bucket,
  ownerId,
  maxFiles,
  initialUrls,
  onChange,
}: UsePhotoUploaderInput) {
  // Lista de URLs que el consumidor ya ha persistido. Tratamos cada una
  // como un upload "done" sintético sin `path` para que el render sea
  // uniforme; al borrarlas, sólo desaparecen del estado local (el
  // backend de borrado real lo decide el consumidor en su `onChange`).
  const [uploads, setUploads] = useState<PhotoUploadState[]>(() =>
    initialUrls.map(
      (url, i): PhotoUploadState => ({
        id: `initial-${i}`,
        fileName: `photo-${i + 1}`,
        status: 'done',
        publicUrl: url,
      }),
    ),
  );

  const [globalErrors, setGlobalErrors] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Ref para evitar disparar onChange en el primer mount con las
  // URLs iniciales (no hay cambio real respecto al input del consumidor).
  const isFirstRender = useRef(true);

  // Notificación al consumidor con las URLs activas (subidas done).
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!onChange) return;
    const urls = uploads
      .filter((u) => u.status === 'done' && u.publicUrl)
      .map((u) => u.publicUrl as string);
    onChange(urls);
  }, [uploads, onChange]);

  const doneCount = uploads.filter((u) => u.status === 'done').length;
  const uploadingCount = uploads.filter((u) => u.status === 'uploading').length;
  const remaining = Math.max(0, maxFiles - doneCount - uploadingCount);

  /**
   * Valida un archivo en cliente antes de pedirle nada al backend.
   * Devuelve mensaje de error o null si pasa.
   */
  const validateFile = useCallback((file: File): string | null => {
    if (
      !ALLOWED_IMAGE_MIME_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_MIME_TYPES)[number])
    ) {
      return `Tipo no permitido: ${file.type || 'desconocido'}.`;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `Archivo demasiado grande (>${Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024)} MB).`;
    }
    return null;
  }, []);

  /**
   * Lanza la subida real al endpoint privado. Actualiza el estado
   * `uploading → done | error` según el resultado.
   */
  const uploadOne = useCallback(
    async (id: string, file: File) => {
      try {
        const form = new FormData();
        form.append('bucket', bucket);
        form.append('ownerId', ownerId);
        form.append('file', file);

        const res = await fetch('/api/storage/upload', {
          method: 'POST',
          body: form,
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as {
            error?: { message?: string };
          } | null;
          const message = body?.error?.message ?? `HTTP ${res.status}`;
          setUploads((prev) =>
            prev.map((u) => (u.id === id ? { ...u, status: 'error', errorMessage: message } : u)),
          );
          return;
        }
        const data = (await res.json()) as { publicUrl: string; path: string };
        setUploads((prev) =>
          prev.map((u) =>
            u.id === id ? { ...u, status: 'done', publicUrl: data.publicUrl, path: data.path } : u,
          ),
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error de red.';
        setUploads((prev) =>
          prev.map((u) => (u.id === id ? { ...u, status: 'error', errorMessage: message } : u)),
        );
      }
    },
    [bucket, ownerId],
  );

  /**
   * Handler principal cuando el usuario suelta archivos o los elige por
   * input. Hace bookkeeping del límite y dispara subidas en paralelo.
   */
  const handleFilesSelected = useCallback(
    (files: FileList | File[]) => {
      const list = Array.from(files);
      const accepted: { id: string; file: File }[] = [];
      const newErrors: string[] = [];

      for (const file of list) {
        if (accepted.length >= remaining) {
          newErrors.push(`Has alcanzado el máximo de ${maxFiles} fotos.`);
          break;
        }
        const error = validateFile(file);
        if (error) {
          newErrors.push(`${file.name}: ${error}`);
          continue;
        }
        // Identificador estable durante el ciclo de vida de la subida.
        // `crypto.randomUUID` está disponible en navegadores modernos
        // y en el server runtime de Next.
        accepted.push({ id: crypto.randomUUID(), file });
      }

      if (newErrors.length > 0) {
        setGlobalErrors((prev) => [...prev, ...newErrors]);
      }

      if (accepted.length === 0) return;

      setUploads((prev) => [
        ...prev,
        ...accepted.map(
          ({ id, file }): PhotoUploadState => ({
            id,
            fileName: file.name,
            status: 'uploading',
          }),
        ),
      ]);

      // Lanzamos las subidas en paralelo (no bloqueamos la UI con await
      // serial). Cada `uploadOne` actualiza su slot al terminar.
      for (const { id, file } of accepted) {
        void uploadOne(id, file);
      }
    },
    [maxFiles, remaining, uploadOne, validateFile],
  );

  /**
   * Quita una foto del estado local. No borra del bucket: el consumidor
   * recibirá el `onChange` con la lista actualizada y decidirá si
   * persistir el borrado o no (típicamente sí, en una llamada aparte).
   */
  const handleRemove = useCallback((id: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  }, []);

  const handleClearErrors = useCallback(() => {
    setGlobalErrors([]);
  }, []);

  return {
    uploads,
    globalErrors,
    isDragging,
    setIsDragging,
    handleFilesSelected,
    handleRemove,
    handleClearErrors,
    remaining,
    maxFilesReached: remaining === 0,
  };
}
