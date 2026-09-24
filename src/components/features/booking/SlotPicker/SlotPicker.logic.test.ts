import { afterEach, describe, expect, it } from 'vitest';

import { formatSlotTime, splitSlotsByDayPart } from './SlotPicker.logic';

/**
 * Tests de la partición mañana/tarde del SlotPicker.
 *
 * El bug que cubren: `splitSlotsByDayPart` repartía los huecos con
 * `Date#getHours()` (hora del navegador) mientras `formatSlotTime` los
 * etiquetaba en `Europe/Madrid`. Un usuario fuera del huso de Madrid
 * leía un hueco "13:30" colocado bajo "Tarde".
 *
 * Cómo se simula el navegador extranjero: `process.env.TZ` cambia la
 * zona local del proceso Node en caliente (soportado desde Node 16.2),
 * que es lo que lee `Date#getHours()`. La aserción de control de cada
 * caso comprueba que el cambio de zona realmente ha surtido efecto; si
 * un día dejara de funcionar, el test fallaría en vez de volverse mudo.
 */

const ORIGINAL_TZ = process.env.TZ;

afterEach(() => {
  process.env.TZ = ORIGINAL_TZ;
});

/** Construye un slot de una hora a partir del instante ISO de inicio. */
function slotAt(startAtIso: string) {
  return {
    startAtIso,
    endAtIso: new Date(new Date(startAtIso).getTime() + 60 * 60_000).toISOString(),
    available: true,
  };
}

// 13:30 hora de Madrid en verano (CEST, UTC+2) → 11:30 UTC.
const SLOT_1330_MADRID = slotAt('2026-06-15T11:30:00.000Z');
// 14:30 hora de Madrid en verano → 12:30 UTC.
const SLOT_1430_MADRID = slotAt('2026-06-15T12:30:00.000Z');

describe('splitSlotsByDayPart', () => {
  it('reparte por la hora del centro y no por la del navegador (Berlín)', () => {
    process.env.TZ = 'Europe/Berlin';

    const { morning, afternoon } = splitSlotsByDayPart([SLOT_1330_MADRID, SLOT_1430_MADRID]);

    // 13:30 < 14:00 → mañana; 14:30 → tarde. La etiqueta que ve el
    // usuario y la sección en la que cae deben coincidir siempre.
    expect(formatSlotTime(SLOT_1330_MADRID, 'es')).toBe('13:30');
    expect(morning).toEqual([SLOT_1330_MADRID]);
    expect(afternoon).toEqual([SLOT_1430_MADRID]);
  });

  it('reparte por la hora del centro y no por la del navegador (Canarias)', () => {
    process.env.TZ = 'Atlantic/Canary';
    // Control: en Canarias (UTC+1 en verano) el navegador vería 12:30
    // para el hueco de las 13:30 de Madrid.
    expect(new Date(SLOT_1330_MADRID.startAtIso).getHours()).toBe(12);

    const { morning, afternoon } = splitSlotsByDayPart([SLOT_1330_MADRID, SLOT_1430_MADRID]);

    expect(formatSlotTime(SLOT_1330_MADRID, 'es')).toBe('13:30');
    expect(formatSlotTime(SLOT_1430_MADRID, 'es')).toBe('14:30');
    expect(morning).toEqual([SLOT_1330_MADRID]);
    // Este es el caso que el código anterior fallaba: el navegador
    // canario leía 13:30 y mandaba el hueco a "Mañana" con etiqueta
    // "14:30".
    expect(afternoon).toEqual([SLOT_1430_MADRID]);
  });

  it('no manda a "Tarde" un hueco de mañana cuando el navegador va por delante', () => {
    process.env.TZ = 'Europe/Helsinki';
    // Control: Helsinki (UTC+3 en verano) lee 14:30 para el hueco de
    // las 13:30 de Madrid. Con `getHours()` caía en "Tarde".
    expect(new Date(SLOT_1330_MADRID.startAtIso).getHours()).toBe(14);

    const { morning, afternoon } = splitSlotsByDayPart([SLOT_1330_MADRID]);

    expect(morning).toEqual([SLOT_1330_MADRID]);
    expect(afternoon).toEqual([]);
  });

  it('usa el horario de invierno correcto (CET) para los huecos de enero', () => {
    process.env.TZ = 'UTC';
    // 13:30 de Madrid en invierno (CET, UTC+1) → 12:30 UTC.
    const winterSlot = slotAt('2026-01-15T12:30:00.000Z');

    const { morning, afternoon } = splitSlotsByDayPart([winterSlot]);

    expect(formatSlotTime(winterSlot, 'es')).toBe('13:30');
    expect(morning).toEqual([winterSlot]);
    expect(afternoon).toEqual([]);
  });

  it('mantiene el orden original dentro de cada bloque', () => {
    const early = slotAt('2026-06-15T07:00:00.000Z'); // 09:00 Madrid
    const late = slotAt('2026-06-15T16:00:00.000Z'); // 18:00 Madrid

    const { morning, afternoon } = splitSlotsByDayPart([
      early,
      SLOT_1430_MADRID,
      SLOT_1330_MADRID,
      late,
    ]);

    expect(morning).toEqual([early, SLOT_1330_MADRID]);
    expect(afternoon).toEqual([SLOT_1430_MADRID, late]);
  });
});
