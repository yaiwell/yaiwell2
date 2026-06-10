import { describe, expect, it } from 'vitest';

import {
  buildProviderSlugWithId,
  parseProviderIdFromSlugWithId,
  slugifyBusinessName,
} from './provider-slug';

/**
 * Tests del helper de slug + id del proveedor.
 *
 * Este helper alimenta las URLs públicas `/centro/[slug]-[id]`. Cualquier
 * cambio en el formato afecta SEO y enlaces compartidos, por eso lo
 * cubrimos exhaustivamente: forma feliz, ids con slugs largos, segmentos
 * mal formados y ausencia de id.
 */
describe('buildProviderSlugWithId', () => {
  it('compone el segmento concatenando slug y id con guión', () => {
    // Arrange
    const provider = { slug: 'atelier-norte', id: 'prov-01' };

    // Act
    const segment = buildProviderSlugWithId(provider);

    // Assert
    expect(segment).toBe('atelier-norte-prov-01');
  });

  it('preserva los guiones del slug cuando el slug es compuesto', () => {
    const provider = { slug: 'casa-mar-massatges', id: 'prov-02' };

    const segment = buildProviderSlugWithId(provider);

    expect(segment).toBe('casa-mar-massatges-prov-02');
  });
});

describe('parseProviderIdFromSlugWithId', () => {
  it('extrae el id `prov-NN` del final del segmento', () => {
    const id = parseProviderIdFromSlugWithId('atelier-norte-prov-01');

    expect(id).toBe('prov-01');
  });

  it('extrae correctamente el id cuando el slug tiene varios guiones', () => {
    const id = parseProviderIdFromSlugWithId('casa-mar-massatges-prov-02');

    expect(id).toBe('prov-02');
  });

  it('acepta ids con múltiples dígitos', () => {
    const id = parseProviderIdFromSlugWithId('mega-centro-prov-1234');

    expect(id).toBe('prov-1234');
  });

  it('devuelve null cuando el segmento no termina con el patrón `prov-NN`', () => {
    const id = parseProviderIdFromSlugWithId('atelier-norte');

    expect(id).toBeNull();
  });

  it('devuelve null cuando el sufijo no es numérico', () => {
    const id = parseProviderIdFromSlugWithId('atelier-norte-prov-abc');

    expect(id).toBeNull();
  });

  it('es round-trip con buildProviderSlugWithId', () => {
    const provider = { slug: 'studio-zen', id: 'prov-99' };

    const segment = buildProviderSlugWithId(provider);
    const parsedId = parseProviderIdFromSlugWithId(segment);

    expect(parsedId).toBe(provider.id);
  });
});

/**
 * Tests del slugify usado por el wizard de onboarding (#57) para
 * sugerir un slug al usuario partiendo del nombre del negocio.
 */
describe('slugifyBusinessName', () => {
  it('pasa a minúsculas y reemplaza espacios por guiones', () => {
    expect(slugifyBusinessName('Atelier Norte')).toBe('atelier-norte');
  });

  it('elimina acentos y diacríticos comunes (ñ, ç, è, ü)', () => {
    expect(slugifyBusinessName('Peluquería Niño')).toBe('peluqueria-nino');
    expect(slugifyBusinessName('Espai Çinc')).toBe('espai-cinc');
    expect(slugifyBusinessName('Crème Brûlée')).toBe('creme-brulee');
  });

  it('colapsa runs de separadores en un único guion', () => {
    expect(slugifyBusinessName('Casa   Mar   --   Massatges')).toBe('casa-mar-massatges');
  });

  it('elimina símbolos, apóstrofos y emojis', () => {
    expect(slugifyBusinessName(`L'Atelier - 100% bio 💆`)).toBe('l-atelier-100-bio');
  });

  it('recorta guiones de los extremos', () => {
    expect(slugifyBusinessName('  --- Studio Zen --- ')).toBe('studio-zen');
  });

  it('devuelve cadena vacía si no hay alfanuméricos', () => {
    expect(slugifyBusinessName('***')).toBe('');
    expect(slugifyBusinessName('   ')).toBe('');
  });

  it('preserva números', () => {
    expect(slugifyBusinessName('Estudio 360 Wellness')).toBe('estudio-360-wellness');
  });
});
