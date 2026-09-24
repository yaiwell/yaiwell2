/**
 * Tests del value object `GeolocatedAddress`.
 *
 * El bloque más importante de este archivo es el de "garantía de
 * compilación": no comprueba comportamiento en runtime sino que el
 * compilador RECHAZA escribir la dirección sin coordenadas. Como
 * `npm run typecheck` incluye los tests, si alguien vuelve a abrir esa
 * puerta el pipeline se pone rojo aquí.
 */

import { describe, expect, it } from 'vitest';

import { ensureSpanish } from '@/lib/i18n';
import { ZodError } from 'zod';

import { parseGeolocatedAddress, type GeolocatedAddress } from './provider.address';
import { ProviderLocationRequiredError } from './provider.errors';
import type { UpdateSettingsArgs } from './provider.repository';

describe('parseGeolocatedAddress', () => {
  it('devuelve texto y coordenadas cuando el payload es completo', () => {
    const result = parseGeolocatedAddress({
      address: 'Carrer Major 12, Palma',
      lat: 39.5696,
      lng: 2.6502,
    });

    expect(result.address).toBe('Carrer Major 12, Palma');
    expect(result.lat).toBe(39.5696);
    expect(result.lng).toBe(2.6502);
  });

  it('ignora claves extra del formulario (businessName, description…)', () => {
    const result = parseGeolocatedAddress({
      businessName: 'Atelier',
      description: ensureSpanish({ es: 'hola' }),
      address: 'Calle Real 1',
      lat: 40,
      lng: -3,
    });

    expect(Object.keys(result).sort()).toEqual(['address', 'lat', 'lng']);
  });

  it('lanza ProviderLocationRequiredError si faltan las coordenadas', () => {
    expect(() => parseGeolocatedAddress({ address: 'Calle Real 1' })).toThrow(
      ProviderLocationRequiredError,
    );
  });

  it('lanza ProviderLocationRequiredError si las coordenadas están fuera de rango', () => {
    expect(() => parseGeolocatedAddress({ address: 'Calle Real 1', lat: 91, lng: 0 })).toThrow(
      ProviderLocationRequiredError,
    );
    expect(() => parseGeolocatedAddress({ address: 'Calle Real 1', lat: 0, lng: 181 })).toThrow(
      ProviderLocationRequiredError,
    );
  });

  it('lanza ProviderLocationRequiredError si las coordenadas no son números', () => {
    expect(() =>
      parseGeolocatedAddress({ address: 'Calle Real 1', lat: '39.5', lng: '2.6' }),
    ).toThrow(ProviderLocationRequiredError);
  });

  it('lanza ZodError (no LOCATION_REQUIRED) si el texto no cumple las cotas', () => {
    // El texto vacío es culpa del campo, no del geocoder: la UI lo
    // traduce a "revisa los campos" en lugar de "elige una sugerencia".
    expect(() => parseGeolocatedAddress({ address: '', lat: 39.5, lng: 2.6 })).toThrow(ZodError);
  });
});

describe('garantía de compilación: dirección y coordenadas son inseparables', () => {
  it('no permite construir un GeolocatedAddress a mano', () => {
    // @ts-expect-error — falta la marca nominal: el único constructor
    // válido es `parseGeolocatedAddress`, que exige lat y lng.
    const forged: GeolocatedAddress = { address: 'Calle Nueva 1', lat: 39.5, lng: 2.6 };
    void forged;

    expect(true).toBe(true);
  });

  it('no permite pasar al repositorio una dirección como string suelto', () => {
    const args: UpdateSettingsArgs = {
      businessName: 'Atelier',
      vatNumber: null,
      description: ensureSpanish({ es: 'hola' }),
      // @ts-expect-error — este era exactamente el P0: actualizar el
      // texto de la calle dejando intacta la columna PostGIS `location`.
      address: 'Calle Nueva 1',
    };
    void args;

    expect(true).toBe(true);
  });

  it('acepta el repositorio una dirección salida del parser', () => {
    const args: UpdateSettingsArgs = {
      businessName: 'Atelier',
      vatNumber: null,
      description: ensureSpanish({ es: 'hola' }),
      address: parseGeolocatedAddress({ address: 'Calle Nueva 1', lat: 39.5, lng: 2.6 }),
    };

    expect(args.address.lat).toBe(39.5);
  });
});
