/**
 * Tipos de los documentos legales (privacidad y, más adelante, términos
 * y cookies). Contenido ya traducido y listo para pintar.
 */
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
