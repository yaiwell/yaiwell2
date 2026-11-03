import { cn } from '@/lib/utils';

import { getProfessionalInitials } from './ProfessionalAvatar.logic';
import { professionalAvatarImage, professionalAvatarRoot } from './ProfessionalAvatar.styles';
import type { ProfessionalAvatarProps } from './ProfessionalAvatar.types';

/**
 * Avatar de un profesional: su foto o, si no tiene, sus iniciales.
 *
 * Es decorativo (`aria-hidden`): todos los consumidores pintan el nombre
 * al lado, así que un `alt` repetiría lo mismo al lector de pantalla.
 *
 * Server Component (sin `'use client'`) para poder usarse en la ficha
 * del centro y dentro del flujo de reserva.
 */
export function ProfessionalAvatar({ name, photo, size, className }: ProfessionalAvatarProps) {
  return (
    <span
      className={cn(professionalAvatarRoot({ size }), className)}
      aria-hidden
      data-component="professional-avatar"
    >
      {photo ? (
        // Fotos subidas al storage de Supabase: `<img>` simple, igual que
        // el resto de fotos de usuario, sin configurar dominios de `next/image`.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" className={professionalAvatarImage} loading="lazy" />
      ) : (
        getProfessionalInitials(name)
      )}
    </span>
  );
}
