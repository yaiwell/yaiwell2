/**
 * Tipos de ProfessionalAvatar.
 */
export interface ProfessionalAvatarProps {
  /** Nombre del profesional: de él salen las iniciales. */
  name: string;
  /** URL pública de la foto; `null` o ausente pinta iniciales. */
  photo?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}
