import type { LegalDocumentContent } from '@/lib/legal/legal.types';

/**
 * Props del documento legal. El contenido llega ya traducido desde el
 * servidor (`@/lib/legal`).
 */
export interface LegalDocumentProps {
  document: LegalDocumentContent;
}
