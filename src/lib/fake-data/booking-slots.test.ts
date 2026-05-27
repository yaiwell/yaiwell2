import { describe, expect, it } from 'vitest';

import {
  buildUpcomingDays,
  generateBookingSlots,
  getDateKey,
  toAvailabilitySlot,
} from './booking-slots';

/**
 * Tests del generador determinista de slots de reserva mock.
 *
 * Foco: comprobamos que la misma entrada produce la misma salida
 * (determinismo) y que las reglas de horario/duración se respetan
 * (no se ofrecen slots fuera de horario ni huecos que se solapen
 * con el cierre).
 */
describe('generateBookingSlots', () => {
  // Anclamos la fecha lejos en el futuro para que ningún slot quede
  // descartado por estar "en el pasado" durante los tests.
  const futureDate = new Date(2099, 5, 15); // 15 junio 2099
  const now = new Date(2099, 5, 14); // un día antes

  it('produce exactamente el mismo resultado para la misma entrada (determinismo)', () => {
    const first = generateBookingSlots('prov-01', 'svc-01', futureDate, 60, now);
    const second = generateBookingSlots('prov-01', 'svc-01', futureDate, 60, now);

    expect(first).toEqual(second);
  });

  it('produce resultados distintos para proveedores distintos', () => {
    const a = generateBookingSlots('prov-01', 'svc-01', futureDate, 60, now);
    const b = generateBookingSlots('prov-02', 'svc-01', futureDate, 60, now);

    // No comprobamos cantidad sino qué slots quedan ocupados:
    // el patrón de huecos debe diferir entre proveedores.
    const aPattern = a.map((s) => s.available).join('');
    const bPattern = b.map((s) => s.available).join('');

    expect(aPattern).not.toEqual(bPattern);
  });

  it('no genera ningún slot que termine después del cierre de la tarde', () => {
    const slots = generateBookingSlots('prov-01', 'svc-01', futureDate, 60, now);

    // Cierre de tarde a las 20:30 según el horario tipo del centro.
    const closingMinutes = 20 * 60 + 30;
    for (const slot of slots) {
      const end = new Date(slot.endAtIso);
      const endMinutes = end.getHours() * 60 + end.getMinutes();
      expect(endMinutes).toBeLessThanOrEqual(closingMinutes);
    }
  });

  it('respeta la pausa entre las 14:00 y las 16:00 (no hay slots cuyo inicio esté dentro)', () => {
    const slots = generateBookingSlots('prov-01', 'svc-01', futureDate, 60, now);

    for (const slot of slots) {
      const start = new Date(slot.startAtIso);
      const startMinutes = start.getHours() * 60 + start.getMinutes();
      const inLunchBreak = startMinutes >= 14 * 60 && startMinutes < 16 * 60;
      expect(inLunchBreak).toBe(false);
    }
  });

  it('descarta slots cuya hora de inicio ya pasó respecto a now', () => {
    // Configuramos `now` a las 12:00 del mismo día del calendario para
    // garantizar que se filtran los slots de la mañana anteriores.
    const today = new Date(2099, 5, 15, 0, 0, 0);
    const noon = new Date(2099, 5, 15, 12, 0, 0);

    const slots = generateBookingSlots('prov-01', 'svc-01', today, 60, noon);

    for (const slot of slots) {
      expect(new Date(slot.startAtIso).getTime()).toBeGreaterThan(noon.getTime());
    }
  });

  it('marca aproximadamente entre el 20% y el 40% de los slots como ocupados', () => {
    const slots = generateBookingSlots('prov-05', 'svc-13', futureDate, 60, now);
    const occupiedRatio = slots.filter((s) => !s.available).length / slots.length;

    // La distribución objetivo es 30%. Damos un margen amplio para
    // robustez contra cambios de horario sin sacrificar la verificación.
    expect(occupiedRatio).toBeGreaterThan(0.15);
    expect(occupiedRatio).toBeLessThan(0.45);
  });
});

describe('getDateKey', () => {
  it('compone YYYY-MM-DD con cero a la izquierda', () => {
    const date = new Date(2026, 0, 5); // 5 enero 2026

    expect(getDateKey(date)).toBe('2026-01-05');
  });
});

describe('buildUpcomingDays', () => {
  it('devuelve N días consecutivos a partir del día inicial', () => {
    const from = new Date(2026, 4, 20); // 20 mayo 2026

    const days = buildUpcomingDays(from, 7);

    expect(days).toHaveLength(7);
    expect(days[0].getDate()).toBe(20);
    expect(days[6].getDate()).toBe(26);
  });

  it('normaliza la hora a 00:00 para evitar arrastrar minutos del input', () => {
    const fromWithTime = new Date(2026, 4, 20, 17, 42, 11);

    const [first] = buildUpcomingDays(fromWithTime, 1);

    expect(first.getHours()).toBe(0);
    expect(first.getMinutes()).toBe(0);
    expect(first.getSeconds()).toBe(0);
  });
});

describe('toAvailabilitySlot', () => {
  it('convierte ISO strings a Date manteniendo el instante exacto', () => {
    const slot = {
      startAtIso: '2026-05-20T10:00:00.000Z',
      endAtIso: '2026-05-20T11:00:00.000Z',
      available: true,
    };

    const converted = toAvailabilitySlot(slot);

    expect(converted.startAt.toISOString()).toBe(slot.startAtIso);
    expect(converted.endAt.toISOString()).toBe(slot.endAtIso);
  });
});
