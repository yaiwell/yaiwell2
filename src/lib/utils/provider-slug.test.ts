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
// UUID v4 de muestra: 8-4-4-4-12 hex. Usamos varios distintos en los
// tests para no quemar el mismo en todos los casos y para verificar la
// normalización a minúsculas.
const UUID_A = '70a8dc5a-2fed-4aa4-907c-ad93a49eb879';
const UUID_B = '01234567-89ab-4cde-8f01-234567890abc';
const UUID_C = 'abcdef01-2345-4678-9abc-def012345678';

describe('buildProviderSlugWithId', () => {
  it('compone el segmento concatenando slug y UUID con guión', () => {
    const provider = { slug: 'atelier-norte', id: UUID_A };

    const segment = buildProviderSlugWithId(provider);

    expect(segment).toBe(`atelier-norte-${UUID_A}`);
  });

  it('preserva los guiones del slug cuando el slug es compuesto', () => {
    const provider = { slug: 'casa-mar-massatges', id: UUID_B };

    const segment = buildProviderSlugWithId(provider);

    expect(segment).toBe(`casa-mar-massatges-${UUID_B}`);
  });
});

describe('parseProviderIdFromSlugWithId', () => {
  it('extrae el UUID del final del segmento', () => {
    const id = parseProviderIdFromSlugWithId(`atelier-norte-${UUID_A}`);

    expect(id).toBe(UUID_A);
  });

  it('extrae correctamente el UUID cuando el slug tiene varios guiones', () => {
    const id = parseProviderIdFromSlugWithId(`casa-mar-massatges-${UUID_B}`);

    expect(id).toBe(UUID_B);
  });

  it('normaliza UUIDs en mayúsculas a minúsculas', () => {
    const id = parseProviderIdFromSlugWithId(`studio-aura-${UUID_C.toUpperCase()}`);

    expect(id).toBe(UUID_C);
  });

  it('devuelve null cuando el segmento no termina con un UUID válido', () => {
    expect(parseProviderIdFromSlugWithId('atelier-norte')).toBeNull();
  });

  it('devuelve null cuando el sufijo es un id antiguo tipo prov-NN', () => {
    // Patrón heredado de Fase 0 (fake-data). Ya no aplica con BD real.
    expect(parseProviderIdFromSlugWithId('atelier-norte-prov-01')).toBeNull();
  });

  it('devuelve null cuando el UUID está truncado', () => {
    expect(parseProviderIdFromSlugWithId('atelier-norte-70a8dc5a-2fed-4aa4-907c')).toBeNull();
  });

  it('es round-trip con buildProviderSlugWithId', () => {
    const provider = { slug: 'studio-zen', id: UUID_C };

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
