import { ImageOff } from 'lucide-react';

import { cn } from '@/lib/utils';

import {
  photoPlaceholderIcon,
  photoPlaceholderIconWrapper,
  photoPlaceholderLabel,
  photoPlaceholderRoot,
} from './PhotoPlaceholder.styles';
import type { PhotoPlaceholderProps } from './PhotoPlaceholder.types';

/**
 * Relleno visual para los huecos de foto de un proveedor sin fotos.
 *
 * Existe porque `photos = []` es el estado NORMAL de cualquier centro
 * recién dado de alta: el wizard de onboarding todavía no tiene paso de
 * fotos. Antes de este componente, indexar `photos[0]` dejaba el `src`
 * de `next/image` en `undefined` y tumbaba la página entera.
 *
 * Es un Server Component (sin `'use client'`) para poder usarse tanto
 * en árboles de servidor como dentro de componentes cliente.
 *
 * @param label — texto ya traducido; si falta, el bloque es decorativo.
 * @param size — tamaño del icono y del texto según el hueco a rellenar.
 */
export function PhotoPlaceholder({
  label,
  size = 'md',
  className,
  dataComponent = 'photo-placeholder',
}: PhotoPlaceholderProps) {
  return (
    <div
      className={cn(photoPlaceholderRoot({ size }), className)}
      data-component={dataComponent}
      // Sin texto el bloque no aporta nada a un lector de pantalla: el
      // nombre del centro ya viaja en el contenido contiguo. Con texto
      // lo dejamos visible en el árbol de accesibilidad para que se
      // anuncie como un párrafo normal (nada de `role="img"`, que
      // ocultaría el propio texto que acabamos de escribir).
      aria-hidden={label ? undefined : true}
    >
      <span className={photoPlaceholderIconWrapper({ size })}>
        <ImageOff className={photoPlaceholderIcon({ size })} aria-hidden />
      </span>
      {label ? <span className={photoPlaceholderLabel({ size })}>{label}</span> : null}
    </div>
  );
}
