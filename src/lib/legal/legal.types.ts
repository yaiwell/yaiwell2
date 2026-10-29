/**
 * Tipos de los documentos legales. Contenido ya traducido y listo para
 * pintar.
 */

/** Documentos legales publicados; cada uno tiene su clave en `messages/legal`. */
export type LegalDocumentKind = 'privacy' | 'terms' | 'cookies';
export interface LegalSection {
  heading: string;
  /** Párrafos; se pintan después de la lista. */
  paragraphs: string[];
  items: string[];
}

export interface LegalDocumentContent {
  title: string;
  metaTitle: string;
  description: string;
  /** Línea «Última actualización: …» ya formateada. */
  updated: string;
  intro: string;
  sections: LegalSection[];
}
