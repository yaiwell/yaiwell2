import { describe, expect, it, vi } from 'vitest';

import { routing } from '@/i18n/routing';
import ca from '@/messages/ca.json';
import de from '@/messages/de.json';
import en from '@/messages/en.json';
import es from '@/messages/es.json';

// Bajo Vitest no existe la condición de exports `react-server`, así que
// `next-intl/server` resuelve a su variante cliente y `getTranslations`
// lanza. Lo sustituimos por un lector de los mensajes reales para que la
// imagen se renderice con la copy de verdad (acentos y diéresis
// incluidos, que es donde suelen romper las fuentes).
const MESSAGES = { es, ca, en, de };

vi.mock('next-intl/server', () => ({
  getTranslations: async ({ locale, namespace }: { locale: string; namespace: string }) => {
    const root = MESSAGES[locale as keyof typeof MESSAGES] as Record<string, unknown>;
    const scope = namespace
      .split('.')
      .reduce<
        Record<string, unknown>
      >((acc, key) => acc[key] as Record<string, unknown>, root) as Record<string, string>;
    return (key: string) => scope[key];
  },
}));

// El import va después del `vi.mock` a propósito: Vitest hace hoisting
// del mock, pero así se lee el orden real de efectos.
import OpenGraphImage, { alt, contentType, generateStaticParams, size } from './opengraph-image';

/**
 * Lee ancho y alto de una cabecera PNG.
 *
 * El chunk IHDR va siempre justo detrás de la firma de 8 bytes: 4 bytes
 * de longitud, 4 de tipo (`IHDR`) y después ancho y alto como enteros
 * big-endian de 32 bits. Comprobamos los píxeles reales y no el objeto
 * `size` exportado porque el bug que arreglamos era exactamente ese: los
 * metadatos decían 1200x630 y el fichero servido no existía.
 */
function readPngSize(bytes: Uint8Array): { width: number; height: number; isPng: boolean } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  const isPng = signature.every((byte, i) => bytes[i] === byte);
  return { isPng, width: view.getUint32(16), height: view.getUint32(20) };
}

describe('[locale]/opengraph-image', () => {
  it('declara 1200x630 y PNG, lo que exige summary_large_image', () => {
    expect(size).toEqual({ width: 1200, height: 630 });
    expect(contentType).toBe('image/png');
    expect(alt.length).toBeGreaterThan(0);
  });

  it('prerenderiza una imagen por locale soportado', () => {
    expect(generateStaticParams()).toEqual(routing.locales.map((locale) => ({ locale })));
  });

  it('genera un PNG real de 1200x630 en cada idioma', async () => {
    for (const locale of routing.locales) {
      const response = await OpenGraphImage({ params: Promise.resolve({ locale }) });
      const bytes = new Uint8Array(await response.arrayBuffer());
      const png = readPngSize(bytes);

      expect(png.isPng).toBe(true);
      expect({ width: png.width, height: png.height }).toEqual(size);
    }
  }, 60_000);
});
