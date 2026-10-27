/**
 * Fachada del módulo RatingSummary.
 * Los consumidores importan siempre desde aquí, nunca de los archivos
 * internos del componente.
 */
export { RatingSummary } from './RatingSummary';
export { getRatingDisplay } from './RatingSummary.logic';
export type {
  RatingDisplay,
  RatingSummaryProps,
  RatingSummaryVariant,
} from './RatingSummary.types';
