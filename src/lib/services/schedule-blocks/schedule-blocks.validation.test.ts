import { describe, expect, it } from 'vitest';

import { createScheduleBlockSchema, scheduleBlockIdSchema } from './schedule-blocks.validation';

const VALID = {
  startDateKey: '2026-11-10',
  startTime: '10:00',
  endDateKey: '2026-11-10',
  endTime: '14:30',
};

describe('createScheduleBlockSchema', () => {
  it('acepta una entrada válida y omite el motivo vacío', () => {
    const parsed = createScheduleBlockSchema.parse({ ...VALID, reason: '   ' });
    expect(parsed).toEqual(VALID);
  });

  it('recorta el motivo', () => {
    expect(createScheduleBlockSchema.parse({ ...VALID, reason: ' Médico ' }).reason).toBe('Médico');
  });

  it('admite 24:00 solo como hora de fin', () => {
    expect(createScheduleBlockSchema.safeParse({ ...VALID, endTime: '24:00' }).success).toBe(true);
    expect(createScheduleBlockSchema.safeParse({ ...VALID, startTime: '24:00' }).success).toBe(
      false,
    );
  });

  it('exige pasos de 5 minutos', () => {
    expect(createScheduleBlockSchema.safeParse({ ...VALID, startTime: '10:03' }).success).toBe(
      false,
    );
    expect(createScheduleBlockSchema.safeParse({ ...VALID, endTime: '14:31' }).success).toBe(false);
  });

  it('rechaza fechas y horas mal formadas', () => {
    expect(
      createScheduleBlockSchema.safeParse({ ...VALID, startDateKey: '2026-02-30' }).success,
    ).toBe(false);
    expect(createScheduleBlockSchema.safeParse({ ...VALID, startTime: '9:00' }).success).toBe(
      false,
    );
    expect(
      createScheduleBlockSchema.safeParse({ ...VALID, endDateKey: '10/11/2026' }).success,
    ).toBe(false);
  });

  it('rechaza un motivo de más de 200 caracteres', () => {
    expect(createScheduleBlockSchema.safeParse({ ...VALID, reason: 'x'.repeat(201) }).success).toBe(
      false,
    );
  });

  it('rechaza campos de más (p. ej. un providerId del cliente)', () => {
    expect(createScheduleBlockSchema.safeParse({ ...VALID, providerId: 'p-2' }).success).toBe(
      false,
    );
  });
});

describe('scheduleBlockIdSchema', () => {
  it('rechaza ids vacíos', () => {
    expect(scheduleBlockIdSchema.safeParse('  ').success).toBe(false);
    expect(scheduleBlockIdSchema.safeParse('blk-1').success).toBe(true);
  });
});
