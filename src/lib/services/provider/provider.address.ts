/**
 * Value object `GeolocatedAddress`: dirección postal + coordenadas que
 * SIEMPRE viajan juntas.
 *
 * Por qué existe este módulo (y por qué es un tipo *branded*):
 * hasta ahora el panel guardaba `Provider.address` como un `string`
 * suelto y nunca tocaba la columna PostGIS `location`. Resultado: un
 * centro que se mudaba corregía su calle y seguía apareciendo en el
 * mapa y en el filtro de distancia sobre las coordenadas viejas, sin
 * ningún error visible. Era un estado corrupto **silencioso**.
 *
 * La defensa es de tipos, no de disciplina: la marca (`brand`) es un
 * `unique symbol` que este módulo NO exporta, así que ningún otro
 * archivo puede construir un `GeolocatedAddress` con un literal. La
 * única fábrica es `parseGeolocatedAddress`, que exige texto + lat +
 * lng válidos. Como el repositorio solo acepta este tipo, escribir la
 * dirección sin coordenadas deja de compilar.
 *
 * El shape es agnóstico al proveedor de geocoding (hoy Mapbox): la UI
 * obtiene `{fullAddress, lat, lng}` del `AddressAutocomplete` y aquí
 * solo validamos rangos WGS84.
 */

import { z } from 'zod';

import { ProviderLocationRequiredError } from './provider.errors';

// Marca nominal. `declare const` no genera runtime, así que no hay nada
// que importar ni que falsificar desde fuera del módulo.
declare const geolocatedAddressBrand: unique symbol;

/**
 * Dirección validada y geolocalizada, lista para persistir.
 *
 * Solo `parseGeolocatedAddress` puede producir una instancia. Los
 * consumidores la tratan como opaca: leen sus campos, nunca la fabrican.
 */
export interface GeolocatedAddress {
  readonly address: string;
  /** Latitud WGS84 en grados decimales. */
  readonly lat: number;
  /** Longitud WGS84 en grados decimales. */
  readonly lng: number;
  readonly [geolocatedAddressBrand]: true;
}

/**
 * Cotas de la dirección: mismas que el alta (`provider-onboarding`)
 * para que un update no pueda colar algo que el wizard rechazaría.
 */
const geolocatedAddressSchema = z.object({
  address: z.string().trim().min(2).max(240),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/**
 * Valida un payload crudo y lo convierte en `GeolocatedAddress`.
 *
 * Distinguimos dos fallos a propósito porque la UI los cuenta distinto:
 *  - texto inválido → `ZodError` (el usuario revisa el campo).
 *  - coordenadas ausentes o fuera de rango → `ProviderLocationRequiredError`,
 *    que significa "elige una dirección de las sugerencias". Es el caso
 *    que se da si el geocoder falló o si el usuario tecleó libremente
 *    sin confirmar ninguna sugerencia.
 *
 * @param input — objeto con `address`, `lat` y `lng` (claves extra se ignoran).
 * @returns la dirección geolocalizada marcada.
 * @throws ProviderLocationRequiredError si faltan o no son válidas las coordenadas.
 * @throws ZodError si el texto de la dirección no cumple las cotas.
 */
export function parseGeolocatedAddress(input: unknown): GeolocatedAddress {
  const parsed = geolocatedAddressSchema.safeParse(input);
  if (parsed.success) {
    // El cast aplica la marca en el único punto del proyecto donde se
    // ha comprobado que texto y coordenadas llegan juntos y válidos.
    return parsed.data as GeolocatedAddress;
  }

  const failedOnCoordinates = parsed.error.issues.some(
    (issue) => issue.path[0] === 'lat' || issue.path[0] === 'lng',
  );
  if (failedOnCoordinates) {
    throw new ProviderLocationRequiredError();
  }
  throw parsed.error;
}
