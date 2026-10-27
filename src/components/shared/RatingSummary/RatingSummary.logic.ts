/**
 * La regla de nota vive en `@/lib/utils/rating` porque también la usan la
 * sección de reseñas, el panel del proveedor y el filtro de búsqueda.
 * Este módulo solo la reexpone para el componente.
 */
export { formatRatingValue, getRatingDisplay } from '@/lib/utils/rating';
export type { RatingDisplay } from '@/lib/utils/rating';
