/**
 * Tests de la política de privacidad: los 4 idiomas tienen la misma
 * estructura y el email y la fecha llegan sustituidos.
 */
import { describe, expect, it, vi } from 'vitest';

import ca from '@/messages/legal/ca.json';
import de from '@/messages/legal/de.json';
import en from '@/messages/legal/en.json';
import es from '@/messages/legal/es.json';

vi.mock('server-only', () => ({}));

import { getPrivacyDocument, PRIVACY_CONTACT_EMAIL } from './privacy-document';

/** Forma de cada sección: cuántos párrafos e ítems tiene. */
function shape(messages: typeof es) {
  const sections = messages.privacy.sections as Array<{ paragraphs?: string[]; items?: string[] }>;
  return sections.map((section) => [section.paragraphs?.length ?? 0, section.items?.length ?? 0]);
}

describe('getPrivacyDocument', () => {
  it('los 4 idiomas tienen las mismas secciones, párrafos e ítems', () => {
    for (const messages of [ca, en, de]) expect(shape(messages)).toEqual(shape(es));
  });

  it.each(['es', 'ca', 'en', 'de'] as const)('%s: sin marcadores sin sustituir', (locale) => {
    const doc = getPrivacyDocument(locale);
    const text = JSON.stringify(doc);
    expect(text).not.toMatch(/\{(email|date)\}/);
    expect(text).toContain(PRIVACY_CONTACT_EMAIL);
    expect(doc.updated).toMatch(/2026/);
  });

  it('nombra a todos los proveedores que tratan datos', () => {
    const text = JSON.stringify(getPrivacyDocument('es'));
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
});
