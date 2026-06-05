/**
 * Tests de los helpers de rol.
 *
 * Cubrimos:
 *  - `getRoleFromUser`: cadena public → unsafe → default cliente.
 *  - Sanitización de valores inválidos (string vacío, número, role no
 *    soportado tipo 'superuser').
 *  - `getRoleFromSessionClaims`: ambas formas conocidas (`publicMetadata`
 *    y `metadata`) más null cuando no hay claims útiles.
 *  - `resolvePostAuthDestination`: cliente → `/`, provider → `/panel`,
 *    admin → `/admin`.
 */

import { describe, expect, it } from 'vitest';

import { getRoleFromSessionClaims, getRoleFromUser, resolvePostAuthDestination } from './role';

describe('getRoleFromUser', () => {
  it('devuelve client cuando el user es null', () => {
    expect(getRoleFromUser(null)).toBe('client');
  });

  it('lee role de publicMetadata cuando es válido', () => {
    expect(getRoleFromUser({ publicMetadata: { role: 'provider' } })).toBe('provider');
    expect(getRoleFromUser({ publicMetadata: { role: 'admin' } })).toBe('admin');
  });

  it('cae a unsafeMetadata cuando publicMetadata no aporta rol válido', () => {
    expect(
      getRoleFromUser({
        publicMetadata: { role: 'superuser' },
        unsafeMetadata: { role: 'provider' },
      }),
    ).toBe('provider');
  });

  it('cae al default client cuando ambos metadata son inválidos', () => {
    expect(
      getRoleFromUser({
        publicMetadata: { role: '' },
        unsafeMetadata: { role: 42 },
      }),
    ).toBe('client');
  });

  it('publicMetadata gana sobre unsafeMetadata cuando ambos son válidos', () => {
    expect(
      getRoleFromUser({
        publicMetadata: { role: 'admin' },
        unsafeMetadata: { role: 'provider' },
      }),
    ).toBe('admin');
  });
});

describe('getRoleFromSessionClaims', () => {
  it('devuelve null si no hay claims', () => {
    expect(getRoleFromSessionClaims(null)).toBeNull();
    expect(getRoleFromSessionClaims(undefined)).toBeNull();
  });

  it('lee rol de claims.publicMetadata.role', () => {
    expect(getRoleFromSessionClaims({ publicMetadata: { role: 'provider' } })).toBe('provider');
  });

  it('lee rol de claims.metadata.role (forma alternativa de Clerk)', () => {
    expect(getRoleFromSessionClaims({ metadata: { role: 'admin' } })).toBe('admin');
  });

  it('publicMetadata gana sobre metadata', () => {
    expect(
      getRoleFromSessionClaims({
        publicMetadata: { role: 'admin' },
        metadata: { role: 'client' },
      }),
    ).toBe('admin');
  });

  it('devuelve null si los roles no son válidos', () => {
    expect(getRoleFromSessionClaims({ publicMetadata: { role: 'guest' } })).toBeNull();
  });
});

describe('resolvePostAuthDestination', () => {
  it('client → /', () => {
    expect(resolvePostAuthDestination('client')).toBe('/');
  });

  it('provider → /panel', () => {
    expect(resolvePostAuthDestination('provider')).toBe('/panel');
  });

  it('admin → /admin', () => {
    expect(resolvePostAuthDestination('admin')).toBe('/admin');
  });
});
