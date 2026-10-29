/**
 * Tests de los documentos legales: los 4 idiomas tienen la misma
 * estructura y el email y la fecha llegan sustituidos.
 */
import { describe, expect, it, vi } from 'vitest';

import ca from '@/messages/legal/ca.json';
import de from '@/messages/legal/de.json';
import en from '@/messages/legal/en.json';
import es from '@/messages/legal/es.json';

vi.mock('server-only', () => ({}));

import { getLegalDocument, LEGAL_CONTACT_EMAIL } from './legal-document';
import type { LegalDocumentKind } from './legal.types';

const KINDS: LegalDocumentKind[] = ['privacy', 'terms', 'cookies'];

/** Forma de cada sección: cuántos párrafos e ítems tiene. */
function shape(messages: typeof es, kind: LegalDocumentKind) {
  const sections = messages[kind].sections as Array<{ paragraphs?: string[]; items?: string[] }>;
  return sections.map((section) => [section.paragraphs?.length ?? 0, section.items?.length ?? 0]);
}

describe('getLegalDocument', () => {
  it.each(KINDS)('%s: los 4 idiomas tienen las mismas secciones, párrafos e ítems', (kind) => {
    for (const messages of [ca, en, de]) expect(shape(messages, kind)).toEqual(shape(es, kind));
  });

  it.each(['es', 'ca', 'en', 'de'] as const)('%s: sin marcadores sin sustituir', (locale) => {
    for (const kind of KINDS) {
      const doc = getLegalDocument(kind, locale);
      expect(JSON.stringify(doc)).not.toMatch(/\{(email|date)\}/);
      expect(doc.updated).toMatch(/2026/);
    }
    expect(JSON.stringify(getLegalDocument('privacy', locale))).toContain(LEGAL_CONTACT_EMAIL);
  });

  it('la privacidad nombra a todos los proveedores que tratan datos', () => {
    const text = JSON.stringify(getLegalDocument('privacy', 'es'));
    for (const name of [
      'Clerk',
      'Google',
      'Stripe',
      'Supabase',
      'Vercel',
      'Resend',
      'Sentry',
      'Mapbox',
      'OpenStreetMap',
    ]) {
      expect(text).toContain(name);
    }
  });

  it('los términos recogen las reglas de cancelación de §4.bis', () => {
    const text = JSON.stringify(getLegalDocument('terms', 'es'));
    expect(text).toContain('2 horas antes');
    expect(text).toContain('última hora');
    expect(text).toContain('30 días');
  });
});
