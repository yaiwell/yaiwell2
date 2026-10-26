/**
 * Tests de la verificación de la cabecera de Vercel Cron.
 */

import { describe, expect, it } from 'vitest';

import { verifyCronAuthorization } from './cron-auth';

describe('verifyCronAuthorization', () => {
  it('autoriza el Bearer exacto', () => {
    expect(verifyCronAuthorization('Bearer s3cr3t', 's3cr3t')).toBe('authorized');
  });

  it('rechaza sin cabecera, con otro secreto o sin el prefijo Bearer', () => {
    expect(verifyCronAuthorization(null, 's3cr3t')).toBe('unauthorized');
    expect(verifyCronAuthorization('Bearer otro', 's3cr3t')).toBe('unauthorized');
    expect(verifyCronAuthorization('s3cr3t', 's3cr3t')).toBe('unauthorized');
  });

  it('marca como no configurado si falta el secreto', () => {
    // Un secreto vacío no puede autorizar nada, ni siquiera "Bearer ".
    expect(verifyCronAuthorization('Bearer ', '')).toBe('unconfigured');
  });
});
