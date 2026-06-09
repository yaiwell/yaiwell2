'use client';

import { ImagePlus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useRef } from 'react';

import { cn } from '@/lib/utils';

import { usePhotoUploader } from './PhotoUploader.logic';
import { photoUploaderStyles as s } from './PhotoUploader.styles';
import type { PhotoUploaderProps } from './PhotoUploader.types';

/**
 * Componente reutilizable de subida de imágenes con drag & drop,
 * previsualizaciones y manejo de errores. Es la UI pura: toda la
 * orquestación de estado y red vive en `usePhotoUploader`.
 *
 * Accesibilidad:
 *  - El input file está oculto visualmente (`sr-only`) pero asociado
 *    por `htmlFor` al label de la dropzone para que sea navegable
 *    por teclado.
 *  - Los errores se anuncian con `aria-live="polite"`.
 *  - El estado de drag se anuncia visualmente; no robamos foco.
 */
export function PhotoUploader({
  bucket,
  ownerId,
  maxFiles = 8,
  initialUrls = [],
  onChange,
}: PhotoUploaderProps) {
  const t = useTranslations('photoUploader');
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  // Contador de drag-enter/leave para evitar parpadeo cuando el cursor
  // pasa sobre hijos del dropZone. Vive en ref porque solo necesita
  // persistir entre eventos, no provocar re-render.
  const dragCountRef = useRef(0);

  const {
    uploads,
    globalErrors,
    isDragging,
    setIsDragging,
    handleFilesSelected,
    handleRemove,
    remaining,
    maxFilesReached,
  } = usePhotoUploader({ bucket, ownerId, maxFiles, initialUrls, onChange });

  const onDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    dragCountRef.current += 1;
    setIsDragging(true);
  };
  const onDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    dragCountRef.current = Math.max(0, dragCountRef.current - 1);
    if (dragCountRef.current === 0) setIsDragging(false);
  };
  const onDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    // `preventDefault` es obligatorio en dragover para que onDrop dispare.
    e.preventDefault();
  };
  const onDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    dragCountRef.current = 0;
    setIsDragging(false);
    if (maxFilesReached) return;
    if (e.dataTransfer.files?.length) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    handleFilesSelected(e.target.files);
    // Limpiamos para que volver a elegir el mismo archivo dispare el handler.
    e.target.value = '';
  };

  return (
    <div className={s.wrapper} data-component="photo-uploader">
      <label
        htmlFor={inputId}
        className={cn(s.dropZone, isDragging && s.dropZoneActive)}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        data-active={isDragging ? 'true' : 'false'}
      >
        <ImagePlus aria-hidden="true" className={s.dropZoneIcon} />
        <p className={s.dropZoneTitle}>{t('title')}</p>
        <p className={s.dropZoneHint}>{t('drop')}</p>
        <button
          type="button"
          className={s.browseButton}
          onClick={() => inputRef.current?.click()}
          disabled={maxFilesReached}
          data-component="photo-uploader-browse"
        >
          {t('browse')}
        </button>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          className={s.hiddenInput}
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          onChange={onInputChange}
          disabled={maxFilesReached}
        />
        {maxFilesReached && (
          <p className={s.maxFilesNote}>{t('maxFilesReached', { max: maxFiles })}</p>
        )}
      </label>

      {globalErrors.length > 0 && (
        <ul className={s.errorList} aria-live="polite" data-component="photo-uploader-errors">
          {globalErrors.map((msg, i) => (
            <li key={`err-${i}`}>{msg}</li>
          ))}
        </ul>
      )}

      {uploads.length > 0 && (
        <ul className={s.gallery} aria-label={t('title')}>
          {uploads.map((u) => (
            <li
              key={u.id}
              className={s.galleryItem}
              data-status={u.status}
              data-component="photo-uploader-item"
            >
              {u.publicUrl && (
                // Usamos <img> en vez de next/image porque las URLs de Storage
                // son cross-origin no allow-listadas en next.config y ya las
                // sirve Supabase con cache largo desde su CDN.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={u.publicUrl} alt={u.fileName} className={s.galleryImage} />
              )}
              {u.status === 'uploading' && (
                <div className={s.galleryUploading} aria-live="polite">
                  {t('uploading')}
                </div>
              )}
              {u.status === 'error' && (
                <div className={s.galleryError} role="alert">
                  {u.errorMessage ?? t('error')}
                </div>
              )}
              <button
                type="button"
                className={s.removeButton}
                onClick={() => handleRemove(u.id)}
                aria-label={t('remove')}
                data-component="photo-uploader-remove"
              >
                <X aria-hidden="true" className={s.removeIcon} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className={s.maxFilesNote} aria-live="polite">
        {t('remaining', { count: remaining, max: maxFiles })}
      </p>
    </div>
  );
}
