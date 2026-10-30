import { describe, expect, it } from 'vitest';

import {
  addMonthsUtc,
  computeOnlineOnlyUntil,
  countSanctionsInWindow,
  type SanctionForCalc,
} from './sanctions.calc';

const d = (iso: string) => new Date(iso);
const s = (iso: string, revokedAt: Date | null = null): SanctionForCalc => ({
  occurredAt: d(iso),
  revokedAt,
});

describe('addMonthsUtc', () => {
  it('suma meses naturales', () => {
    expect(addMonthsUtc(d('2026-01-15T10:00:00Z'), 3).toISOString()).toBe(
      '2026-04-15T10:00:00.000Z',
    );
  });

  it('ajusta al último día del mes', () => {
    expect(addMonthsUtc(d('2026-01-31T10:00:00Z'), 1).toISOString()).toBe(
      '2026-02-28T10:00:00.000Z',
    );
    expect(addMonthsUtc(d('2028-01-31T10:00:00Z'), 1).toISOString()).toBe(
      '2028-02-29T10:00:00.000Z',
    );
  });

  it('resta meses y cruza de año', () => {
    expect(addMonthsUtc(d('2026-02-10T00:00:00Z'), -12).toISOString()).toBe(
      '2025-02-10T00:00:00.000Z',
    );
  });
});

describe('computeOnlineOnlyUntil', () => {
  const NOW = d('2026-06-01T12:00:00Z');

  it('sin sanciones, o con menos de 3, no hay bloqueo', () => {
    expect(computeOnlineOnlyUntil([], NOW)).toBeNull();
    expect(
      computeOnlineOnlyUntil([s('2026-05-01T10:00:00Z'), s('2026-05-20T10:00:00Z')], NOW),
    ).toBeNull();
  });

  it('3 en 12 meses bloquean 3 meses desde la tercera', () => {
    const until = computeOnlineOnlyUntil(
      [s('2026-01-10T10:00:00Z'), s('2026-03-10T10:00:00Z'), s('2026-05-10T10:00:00Z')],
      NOW,
    );
    expect(until?.toISOString()).toBe('2026-08-10T10:00:00.000Z');
  });

  it('el orden de entrada no importa', () => {
    const until = computeOnlineOnlyUntil(
      [s('2026-05-10T10:00:00Z'), s('2026-01-10T10:00:00Z'), s('2026-03-10T10:00:00Z')],
      NOW,
    );
    expect(until?.toISOString()).toBe('2026-08-10T10:00:00.000Z');
  });

  it('a 12 meses justos entre la primera y la tercera cuenta (límite incluido)', () => {
    const until = computeOnlineOnlyUntil(
      [s('2025-05-10T10:00:00Z'), s('2025-11-10T10:00:00Z'), s('2026-05-10T10:00:00Z')],
      NOW,
    );
    expect(until?.toISOString()).toBe('2026-08-10T10:00:00.000Z');
  });

  it('a 12 meses y un milisegundo ya no cuenta', () => {
    expect(
      computeOnlineOnlyUntil(
        [s('2025-05-10T10:00:00Z'), s('2025-11-10T10:00:00Z'), s('2026-05-10T10:00:00.001Z')],
        NOW,
      ),
    ).toBeNull();
  });

  it('las de más de 12 meses no cuentan para un trío nuevo', () => {
    // Dos antiguas (2024) y una reciente: no hay tres dentro de 12 meses.
    expect(
      computeOnlineOnlyUntil(
        [s('2024-03-01T10:00:00Z'), s('2024-09-01T10:00:00Z'), s('2026-05-01T10:00:00Z')],
        NOW,
      ),
    ).toBeNull();
  });

  it('un trío cuya primera tiene ya más de 12 meses sigue bloqueando sus 3 meses', () => {
    // Tercera hace ~2 semanas; la primera, hace más de 12 meses respecto
    // a hoy pero a menos de 12 de la tercera: el bloqueo nació y sigue vivo.
    const until = computeOnlineOnlyUntil(
      [s('2025-05-20T10:00:00Z'), s('2026-01-01T10:00:00Z'), s('2026-05-15T10:00:00Z')],
      NOW,
    );
    expect(until?.toISOString()).toBe('2026-08-15T10:00:00.000Z');
  });

  it('las revocadas no cuentan', () => {
    expect(
      computeOnlineOnlyUntil(
        [
          s('2026-01-10T10:00:00Z'),
          s('2026-03-10T10:00:00Z', d('2026-03-11T10:00:00Z')),
          s('2026-05-10T10:00:00Z'),
        ],
        NOW,
      ),
    ).toBeNull();
  });

  it('un bloqueo ya vencido devuelve null', () => {
    expect(
      computeOnlineOnlyUntil(
        [s('2025-01-10T10:00:00Z'), s('2025-02-10T10:00:00Z'), s('2025-03-10T10:00:00Z')],
        NOW,
      ),
    ).toBeNull();
  });

  it('en el instante exacto del vencimiento ya no hay bloqueo', () => {
    const sanctions = [
      s('2026-01-01T12:00:00Z'),
      s('2026-02-01T12:00:00Z'),
      s('2026-03-01T12:00:00Z'),
    ];
    expect(computeOnlineOnlyUntil(sanctions, d('2026-06-01T11:59:59.999Z'))).not.toBeNull();
    expect(computeOnlineOnlyUntil(sanctions, d('2026-06-01T12:00:00Z'))).toBeNull();
  });

  it('una cuarta sanción durante el bloqueo lo prolonga', () => {
    const until = computeOnlineOnlyUntil(
      [
        s('2026-02-01T10:00:00Z'),
        s('2026-03-01T10:00:00Z'),
        s('2026-04-01T10:00:00Z'),
        s('2026-05-20T10:00:00Z'),
      ],
      NOW,
    );
    expect(until?.toISOString()).toBe('2026-08-20T10:00:00.000Z');
  });

  it('un trío que no cumple la ventana no anula otro que sí', () => {
    // [ene-2025, feb, mar] no cumple (más de 12 meses); [feb, mar, abr]
    // sí y bloquea hasta julio.
    const until = computeOnlineOnlyUntil(
      [
        s('2025-01-01T10:00:00Z'),
        s('2026-02-01T10:00:00Z'),
        s('2026-03-01T10:00:00Z'),
        s('2026-04-01T10:00:00Z'),
      ],
      NOW,
    );
    expect(until?.toISOString()).toBe('2026-07-01T10:00:00.000Z');
  });
});

describe('countSanctionsInWindow', () => {
  const NOW = d('2026-06-01T12:00:00Z');

  it('cuenta solo las vigentes de los últimos 12 meses (límite incluido)', () => {
    expect(
      countSanctionsInWindow(
        [
          s('2025-06-01T12:00:00Z'),
          s('2025-06-01T11:59:59Z'),
          s('2026-01-01T12:00:00Z', d('2026-01-02T00:00:00Z')),
          s('2026-05-01T12:00:00Z'),
        ],
        NOW,
      ),
    ).toBe(2);
  });
});

describe('computeOnlineOnlyUntil · sanción registrada tarde', () => {
  const late = (occurred: string, created: string): SanctionForCalc => ({
    occurredAt: d(occurred),
    createdAt: d(created),
    revokedAt: null,
  });

  it('el bloqueo cuenta desde el registro (marcada 72 h después de la cita)', () => {
    const until = computeOnlineOnlyUntil(
      [
        s('2026-01-01T10:00:00Z'),
        s('2026-03-01T10:00:00Z'),
        late('2026-05-15T10:00:00Z', '2026-05-18T10:00:00Z'),
      ],
      d('2026-06-01T00:00:00Z'),
    );
    expect(until?.toISOString()).toBe('2026-08-18T10:00:00.000Z');
  });

  it('la ventana de 12 meses sigue midiéndose desde la cita, no desde el registro', () => {
    // La tercera cita cae 12 meses y 1 día después de la primera: no hay
    // trío aunque se registrara antes de que pasaran 12 meses desde nada.
    const until = computeOnlineOnlyUntil(
      [
        s('2025-05-14T10:00:00Z'),
        s('2025-12-01T10:00:00Z'),
        late('2026-05-15T10:00:00Z', '2026-05-15T12:00:00Z'),
      ],
      d('2026-06-01T00:00:00Z'),
    );
    expect(until).toBeNull();
  });

  it('un createdAt anterior a la cita (datos raros) no adelanta el bloqueo', () => {
    const until = computeOnlineOnlyUntil(
      [
        s('2026-01-01T10:00:00Z'),
        s('2026-03-01T10:00:00Z'),
        late('2026-05-15T10:00:00Z', '2026-05-10T10:00:00Z'),
      ],
      d('2026-06-01T00:00:00Z'),
    );
    expect(until?.toISOString()).toBe('2026-08-15T10:00:00.000Z');
  });
});
