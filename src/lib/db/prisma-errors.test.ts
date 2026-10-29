import { describe, expect, it } from 'vitest';

import { isExclusionViolation } from './prisma-errors';

const CONSTRAINT = 'bookings_no_overlap_confirmed';

/** Forma real de Prisma 7 + adapter-pg (capturada contra Supabase). */
const realPrismaError = {
  name: 'PrismaClientKnownRequestError',
  code: 'P2010',
  message:
    'Raw query failed. Code: `23P01`. Message: `conflicting key value violates exclusion constraint "bookings_no_overlap_confirmed"`',
  meta: {
    driverAdapterError: {
      name: 'DriverAdapterError',
      cause: {
        originalCode: '23P01',
        originalMessage: `conflicting key value violates exclusion constraint "${CONSTRAINT}"`,
        kind: 'postgres',
        code: '23P01',
      },
    },
  },
};

describe('isExclusionViolation', () => {
  it('reconoce el error real de Prisma 7 con adapter-pg', () => {
    expect(isExclusionViolation(realPrismaError, CONSTRAINT)).toBe(true);
  });

  it('lo encuentra en meta.driverAdapterError aunque el mensaje exterior no diga nada', () => {
    const err = { ...realPrismaError, message: 'Request failed' };
    expect(isExclusionViolation(err, CONSTRAINT)).toBe(true);
  });

  it.each([
    ['code directo', { code: '23P01' }],
    ['cause del adaptador', { message: 'x', cause: { originalCode: '23P01' } }],
  ])('detecta la violación por %s', (_, err) => {
    expect(isExclusionViolation(err, CONSTRAINT)).toBe(true);
  });

  it('con nombre de restricción, no confunde otra exclusión', () => {
    const other = {
      meta: {
        driverAdapterError: {
          cause: {
            originalCode: '23P01',
            originalMessage:
              'conflicting key value violates exclusion constraint "otra_restriccion"',
          },
        },
      },
    };
    expect(isExclusionViolation(other, CONSTRAINT)).toBe(false);
    expect(isExclusionViolation(other)).toBe(true);
  });

  it.each([
    ['unique', { code: 'P2002' }],
    ['otro SQLSTATE', { meta: { code: '23505' } }],
    ['no objeto', 'boom'],
    ['null', null],
  ])('no confunde %s con una violación de exclusión', (_, err) => {
    expect(isExclusionViolation(err)).toBe(false);
  });
});
