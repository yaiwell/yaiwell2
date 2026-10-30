import { describe, expect, it } from 'vitest';

import {
  NO_SHOW_MARK_WINDOW_MS,
  NO_SHOW_UNDO_WINDOW_MS,
  canCompleteBooking,
  canMarkNoShow,
  canUndoNoShow,
  getNoShowMarkWindow,
  getAutoCompleteCutoff,
  isAutoCompleteDue,
} from './booking-no-show';

const START = new Date('2026-11-02T10:00:00.000Z');
const at = (ms: number) => new Date(START.getTime() + ms);
const HOUR = 60 * 60 * 1000;

describe('getNoShowMarkWindow', () => {
  it('antes del inicio no se puede marcar', () => {
    expect(getNoShowMarkWindow(START, at(-1))).toBe('not_started');
  });

  it('en el inicio exacto ya se puede', () => {
    expect(getNoShowMarkWindow(START, START)).toBe('open');
  });

  it('a las 72 h justas todavía se puede (límite incluido)', () => {
    expect(getNoShowMarkWindow(START, at(NO_SHOW_MARK_WINDOW_MS))).toBe('open');
  });

  it('un milisegundo después de las 72 h se cierra', () => {
    expect(getNoShowMarkWindow(START, at(NO_SHOW_MARK_WINDOW_MS + 1))).toBe('closed');
  });
});

describe('canMarkNoShow', () => {
  it('solo sobre confirmed', () => {
    expect(canMarkNoShow({ status: 'confirmed', startAt: START }, at(HOUR))).toBe(true);
    for (const status of ['pending', 'completed', 'cancelled', 'refunded', 'no_show']) {
      expect(canMarkNoShow({ status, startAt: START }, at(HOUR))).toBe(false);
    }
  });

  it('fuera de la ventana no', () => {
    expect(canMarkNoShow({ status: 'confirmed', startAt: START }, at(-1))).toBe(false);
    expect(
      canMarkNoShow({ status: 'confirmed', startAt: START }, at(NO_SHOW_MARK_WINDOW_MS + 1)),
    ).toBe(false);
  });
});

describe('canUndoNoShow', () => {
  const noShowAt = at(2 * HOUR);

  it('dentro de las 24 h, límite incluido', () => {
    expect(canUndoNoShow({ status: 'no_show', noShowAt }, noShowAt)).toBe(true);
    expect(
      canUndoNoShow(
        { status: 'no_show', noShowAt },
        new Date(noShowAt.getTime() + NO_SHOW_UNDO_WINDOW_MS),
      ),
    ).toBe(true);
  });

  it('pasadas las 24 h ya no', () => {
    expect(
      canUndoNoShow(
        { status: 'no_show', noShowAt },
        new Date(noShowAt.getTime() + NO_SHOW_UNDO_WINDOW_MS + 1),
      ),
    ).toBe(false);
  });

  it('sin no_show o sin fecha no hay nada que deshacer', () => {
    expect(canUndoNoShow({ status: 'confirmed', noShowAt }, noShowAt)).toBe(false);
    expect(canUndoNoShow({ status: 'no_show', noShowAt: null }, noShowAt)).toBe(false);
  });
});

describe('cierre automático de reservas', () => {
  it('a las 72 h justas aún no; un instante después sí', () => {
    expect(isAutoCompleteDue(START, at(72 * HOUR))).toBe(false);
    expect(isAutoCompleteDue(START, at(72 * HOUR + 1))).toBe(true);
  });

  it('el corte del cron es now − 72 h', () => {
    const now = at(100 * HOUR);
    expect(getAutoCompleteCutoff(now).getTime()).toBe(at(28 * HOUR).getTime());
  });

  it('el cierre automático empieza justo donde acaba la ventana de no presentado', () => {
    const boundary = at(NO_SHOW_MARK_WINDOW_MS);
    expect(canMarkNoShow({ status: 'confirmed', startAt: START }, boundary)).toBe(true);
    expect(isAutoCompleteDue(START, boundary)).toBe(false);
    const after = at(NO_SHOW_MARK_WINDOW_MS + 1);
    expect(canMarkNoShow({ status: 'confirmed', startAt: START }, after)).toBe(false);
    expect(isAutoCompleteDue(START, after)).toBe(true);
  });
});

describe('canCompleteBooking', () => {
  const START = new Date('2026-11-10T12:00:00.000Z');

  it('a partir del inicio, solo si está confirmada', () => {
    expect(canCompleteBooking({ status: 'confirmed', startAt: START }, START)).toBe(true);
    expect(
      canCompleteBooking({ status: 'confirmed', startAt: START }, new Date(START.getTime() + 1)),
    ).toBe(true);
    expect(canCompleteBooking({ status: 'pending', startAt: START }, START)).toBe(false);
  });

  it('1 minuto antes del inicio no se puede', () => {
    expect(
      canCompleteBooking(
        { status: 'confirmed', startAt: START },
        new Date(START.getTime() - 60_000),
      ),
    ).toBe(false);
  });
});
