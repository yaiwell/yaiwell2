import { describe, expect, it } from 'vitest';

import { REDIRECT_URL_PARAM, parseInternalRedirectUrl, withRedirectUrl } from './redirect-url';

/**
 * Tests del saneado del parámetro de retorno.
 *
 * El caso que justifica este módulo no es la comodidad de volver al
 * flujo de reserva, es el **redirect abierto**: sin validación,
 * `/entrar?redirect_url=https://phishing.example` autenticaría al
 * usuario bajo nuestro dominio y lo soltaría en un clon. Los casos
 * negativos son, por tanto, los importantes.
 */

describe('parseInternalRedirectUrl — rutas aceptadas', () => {
  it('acepta una ruta interna con query', () => {
    expect(parseInternalRedirectUrl('/centro/spa-abc/reservar?serviceId=svc-1')).toBe(
      '/centro/spa-abc/reservar?serviceId=svc-1',
    );
  });

  it('quita el prefijo de locale para no acabar en /es/es/...', () => {
    // Los helpers de `@/i18n/navigation` añaden el locale al navegar.
    expect(parseInternalRedirectUrl('/es/centro/spa-abc/reservar')).toBe(
      '/centro/spa-abc/reservar',
    );
    expect(parseInternalRedirectUrl('/de/mis-reservas')).toBe('/mis-reservas');
    expect(parseInternalRedirectUrl('/ca')).toBe('/');
  });

  it('no confunde un segmento que empieza por el locale con el prefijo', () => {
    expect(parseInternalRedirectUrl('/entrar')).toBe('/entrar');
    expect(parseInternalRedirectUrl('/design-system')).toBe('/design-system');
  });
});

describe('parseInternalRedirectUrl — destinos rechazados', () => {
  it('rechaza URLs absolutas a otro dominio', () => {
    expect(parseInternalRedirectUrl('https://yaiwell.phishing.example/entrar')).toBeNull();
    expect(parseInternalRedirectUrl('http://evil.example')).toBeNull();
  });

  it('rechaza rutas protocol-relative, que el navegador trata como otro host', () => {
    expect(parseInternalRedirectUrl('//evil.example/login')).toBeNull();
    expect(parseInternalRedirectUrl('/\\evil.example/login')).toBeNull();
  });

  it('rechaza esquemas no http (javascript:, data:)', () => {
    expect(parseInternalRedirectUrl('javascript:alert(1)')).toBeNull();
    expect(parseInternalRedirectUrl('data:text/html,<script>')).toBeNull();
  });

  it('rechaza rutas relativas y valores no string', () => {
    expect(parseInternalRedirectUrl('centro/spa-abc')).toBeNull();
    expect(parseInternalRedirectUrl(undefined)).toBeNull();
    expect(parseInternalRedirectUrl(42)).toBeNull();
    // Parámetro repetido en la URL: Next lo entrega como array.
    expect(parseInternalRedirectUrl(['/a', '/b'])).toBeNull();
  });

  it('rechaza la API y los valores desmesurados', () => {
    expect(parseInternalRedirectUrl('/api/webhooks/stripe')).toBeNull();
    expect(parseInternalRedirectUrl(`/${'x'.repeat(600)}`)).toBeNull();
  });
});

describe('withRedirectUrl', () => {
  it('añade el parámetro codificado', () => {
    expect(withRedirectUrl('/entrar', '/centro/spa-abc/reservar?serviceId=svc-1')).toBe(
      `/entrar?${REDIRECT_URL_PARAM}=%2Fcentro%2Fspa-abc%2Freservar%3FserviceId%3Dsvc-1`,
    );
  });

  it('respeta un href que ya trae query', () => {
    expect(withRedirectUrl('/registro?as=client', '/mis-reservas')).toBe(
      `/registro?as=client&${REDIRECT_URL_PARAM}=%2Fmis-reservas`,
    );
  });

  it('devuelve el href intacto sin destino de retorno', () => {
    expect(withRedirectUrl('/entrar', null)).toBe('/entrar');
  });

  it('produce un valor que el parser vuelve a aceptar (ida y vuelta)', () => {
    const target = '/centro/spa-abc/reservar?serviceId=svc-1';
    const href = withRedirectUrl('/entrar', target);
    const raw = decodeURIComponent(href.split('=')[1]);
    expect(parseInternalRedirectUrl(raw)).toBe(target);
  });
});
