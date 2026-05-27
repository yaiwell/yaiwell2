import { describe, expect, it } from 'vitest';

import { searchSuggestions } from './search-suggestions';

/**
 * Tests de la función `searchSuggestions`.
 *
 * Cubrimos:
 *  - Query demasiado corto → lista vacía.
 *  - Match exacto y case-insensitive.
 *  - Insensibilidad a acentos (clave para el mercado es/ca).
 *  - Inclusión de los tres tipos (category, service, provider).
 *  - Locale catalán devuelve los textos catalanes.
 *  - Rango de coincidencia coherente con el label devuelto.
 *  - Tope máximo de 7 sugerencias.
 */
describe('searchSuggestions', () => {
  it('devuelve lista vacía si el query tiene menos de 2 caracteres', () => {
    expect(searchSuggestions('')).toEqual([]);
    expect(searchSuggestions(' ')).toEqual([]);
    expect(searchSuggestions('a')).toEqual([]);
  });

  it('encuentra categorías por nombre sin importar mayúsculas', () => {
    const lower = searchSuggestions('belleza');
    const upper = searchSuggestions('BELLEZA');

    expect(lower.some((s) => s.type === 'category' && s.label === 'Belleza')).toBe(true);
    expect(upper.some((s) => s.type === 'category' && s.label === 'Belleza')).toBe(true);
  });

  it('ignora acentos al buscar (estetica = estética)', () => {
    const sinTilde = searchSuggestions('estetica');

    expect(sinTilde.some((s) => s.type === 'category' && s.label === 'Estética')).toBe(true);
  });

  it('devuelve servicios cuando el query coincide con su nombre', () => {
    const out = searchSuggestions('corte');

    const serviceHit = out.find((s) => s.type === 'service');
    expect(serviceHit).toBeDefined();
    // El sublabel referencia al proveedor para dar contexto al usuario.
    expect(serviceHit?.sublabel).toBeTruthy();
  });

  it('devuelve proveedores cuando el query coincide con el nombre del centro', () => {
    const out = searchSuggestions('atelier');

    const providerHit = out.find((s) => s.type === 'provider');
    expect(providerHit).toBeDefined();
    expect(providerHit?.label.toLowerCase()).toContain('atelier');
  });

  it('aplica el locale catalán a los textos de categoría', () => {
    const out = searchSuggestions('perruqueria', 'ca');

    expect(out.some((s) => s.type === 'category' && s.label === 'Perruqueria')).toBe(true);
  });

  it('expone un matchRange consistente con la posición del query en el label', () => {
    const [first] = searchSuggestions('mas');

    expect(first?.matchRange).not.toBeNull();
    if (first?.matchRange) {
      const [start, end] = first.matchRange;
      const slice = first.label.slice(start, end).toLowerCase();
      // Normalizamos también el slice para tolerar acentos en la comparación.
      const normalizedSlice = slice.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      expect(normalizedSlice).toBe('mas');
    }
  });

  it('no devuelve más de 7 sugerencias aunque haya muchas coincidencias', () => {
    // "a" no llega al mínimo; usamos un patrón muy presente: "a " en
    // nombres y descripciones para forzar sobreabundancia y validar el cap.
    const out = searchSuggestions('pa');

    expect(out.length).toBeLessThanOrEqual(7);
  });
});
