/**
 * Tests de las server actions de bloqueos de agenda.
 *
 * Se protege el borde: locale válido, autenticación del dueño, que el
 * `providerId` y el `User.id` salen de la sesión, la validación Zod de
 * la entrada, la traducción de errores a códigos opacos (con la lista
 * de citas formateada en Madrid y localizada en `CONFLICT`) y el
 * `revalidatePath` solo cuando la operación sale bien.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  requireCurrentProviderMock,
  findProviderMock,
  revalidatePathMock,
  createScheduleBlockMock,
  removeScheduleBlockMock,
} = vi.hoisted(() => ({
  requireCurrentProviderMock: vi.fn(),
  findProviderMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  createScheduleBlockMock: vi.fn(),
  removeScheduleBlockMock: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: revalidatePathMock }));
vi.mock('@/lib/auth/server', () => ({ requireCurrentProvider: requireCurrentProviderMock }));
vi.mock('@/lib/db/prisma', () => ({ prisma: { provider: { findUnique: findProviderMock } } }));
vi.mock('@/lib/services/schedule-blocks', async () => {
  // Errores y validación reales: la action los usa con `instanceof` y Zod.
  const errors = await import('@/lib/services/schedule-blocks/schedule-blocks.errors');
  const validation = await import('@/lib/services/schedule-blocks/schedule-blocks.validation');
  return {
    ...errors,
    ...validation,
    createScheduleBlock: createScheduleBlockMock,
    removeScheduleBlock: removeScheduleBlockMock,
  };
});

import type { AppLocale } from '@/i18n/routing';
import {
  ScheduleBlockConflictError,
  ScheduleBlockEndBeforeStartError,
  ScheduleBlockInPastError,
  ScheduleBlockInvalidInputError,
  ScheduleBlockNoProfessionalError,
  ScheduleBlockNotFoundError,
  ScheduleBlockProfessionalRequiredError,
  ScheduleBlockTooFarError,
  ScheduleBlockTooLongError,
} from '@/lib/services/schedule-blocks/schedule-blocks.errors';

import { createScheduleBlockAction, removeScheduleBlockAction } from './schedule-blocks.actions';

const INPUT = {
  startDateKey: '2026-11-10',
  startTime: '10:00',
  endDateKey: '2026-11-10',
  endTime: '14:00',
};

describe('schedule-blocks actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireCurrentProviderMock.mockResolvedValue({ id: 'provider-1' });
    findProviderMock.mockResolvedValue({ userId: 'user-1' });
    createScheduleBlockMock.mockResolvedValue({ id: 'blk-1' });
    removeScheduleBlockMock.mockResolvedValue(undefined);
  });

  it('crea el bloqueo con el negocio y el usuario de la sesión y revalida', async () => {
    const result = await createScheduleBlockAction('es', { ...INPUT, reason: ' Médico ' });

    expect(result).toEqual({ ok: true });
    expect(createScheduleBlockMock).toHaveBeenCalledWith(
      { ...INPUT, reason: 'Médico' },
      { providerId: 'provider-1', userId: 'user-1' },
    );
    expect(revalidatePathMock).toHaveBeenCalledWith('/es/panel/calendario');
  });

  it('rechaza una entrada mal formada sin tocar la sesión ni el service', async () => {
    const result = await createScheduleBlockAction('es', { ...INPUT, startTime: '10:03' });

    expect(result).toEqual({ ok: false, code: 'INVALID_INPUT' });
    expect(requireCurrentProviderMock).not.toHaveBeenCalled();
    expect(createScheduleBlockMock).not.toHaveBeenCalled();
  });

  it('rechaza campos de más (nadie elige el providerId desde el cliente)', async () => {
    const tampered = { ...INPUT, providerId: 'provider-2' } as typeof INPUT;

    const result = await createScheduleBlockAction('es', tampered);

    expect(result).toEqual({ ok: false, code: 'INVALID_INPUT' });
    expect(createScheduleBlockMock).not.toHaveBeenCalled();
  });

  it('rechaza un locale desconocido', async () => {
    const result = await removeScheduleBlockAction('fr' as AppLocale, 'blk-1');

    expect(result).toEqual({ ok: false, code: 'INVALID_INPUT' });
    expect(removeScheduleBlockMock).not.toHaveBeenCalled();
  });

  it('devuelve FORBIDDEN si no hay provider autenticado', async () => {
    requireCurrentProviderMock.mockRejectedValueOnce(new Error('NEXT_REDIRECT'));

    const result = await createScheduleBlockAction('es', INPUT);

    expect(result).toEqual({ ok: false, code: 'FORBIDDEN' });
    expect(createScheduleBlockMock).not.toHaveBeenCalled();
  });

  it('quita un bloqueo con el negocio de la sesión y revalida', async () => {
    const result = await removeScheduleBlockAction('ca', 'blk-1');

    expect(result).toEqual({ ok: true });
    expect(removeScheduleBlockMock).toHaveBeenCalledWith('blk-1', {
      providerId: 'provider-1',
      userId: 'user-1',
    });
    expect(revalidatePathMock).toHaveBeenCalledWith('/ca/panel/calendario');
  });

  it('un id vacío es INVALID_INPUT', async () => {
    const result = await removeScheduleBlockAction('es', '');

    expect(result).toEqual({ ok: false, code: 'INVALID_INPUT' });
    expect(removeScheduleBlockMock).not.toHaveBeenCalled();
  });

  it('CONFLICT devuelve las citas con fecha y hora de Madrid y el servicio localizado', async () => {
    createScheduleBlockMock.mockRejectedValueOnce(
      new ScheduleBlockConflictError([
        {
          bookingId: 'bk-1',
          // 10:30 Madrid (CET).
          startAt: new Date('2026-11-10T09:30:00.000Z'),
          clientName: 'Marta R.',
          serviceName: { es: 'Corte', en: 'Haircut' },
          professionalId: 'pro-1',
          professionalName: 'Ana',
        },
      ]),
    );

    const result = await createScheduleBlockAction('en', INPUT);

    expect(result).toMatchObject({
      ok: false,
      code: 'CONFLICT',
      conflicts: [
        {
          bookingId: 'bk-1',
          timeLabel: '10:30',
          clientName: 'Marta R.',
          serviceName: 'Haircut',
          professionalName: 'Ana',
        },
      ],
    });
    const [conflict] = (result as { conflicts: { dateLabel: string }[] }).conflicts;
    expect(conflict.dateLabel).toContain('10');
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it.each([
    [new ScheduleBlockInvalidInputError(), 'INVALID_INPUT'],
    [new ScheduleBlockEndBeforeStartError(), 'END_BEFORE_START'],
    [new ScheduleBlockInPastError(), 'IN_PAST'],
    [new ScheduleBlockTooLongError(), 'TOO_LONG'],
    [new ScheduleBlockTooFarError(), 'TOO_FAR'],
    [new ScheduleBlockNotFoundError(), 'NOT_FOUND'],
    [new ScheduleBlockProfessionalRequiredError(), 'PROFESSIONAL_REQUIRED'],
  ])('traduce %s al código opaco %s sin revalidar', async (error, code) => {
    createScheduleBlockMock.mockRejectedValueOnce(error);

    const result = await createScheduleBlockAction('es', INPUT);

    expect(result).toEqual({ ok: false, code });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it.each([new ScheduleBlockNoProfessionalError(), new Error('connection reset')])(
    'oculta %s como INTERNAL y lo registra',
    async (error) => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      createScheduleBlockMock.mockRejectedValueOnce(error);

      const result = await createScheduleBlockAction('es', INPUT);

      expect(result).toEqual({ ok: false, code: 'INTERNAL' });
      expect(consoleSpy).toHaveBeenCalledOnce();
      consoleSpy.mockRestore();
    },
  );
});
