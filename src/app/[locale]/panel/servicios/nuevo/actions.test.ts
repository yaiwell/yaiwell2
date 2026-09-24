/**
 * Tests de las server actions de alta y edición de servicio.
 *
 * Lo que aquí se protege es el P0 nº 4 de `docs/pantallas-2026-09-23.md`:
 * un servicio creado con el panel en catalán, inglés o alemán nacía sin
 * clave `es` y salía con el nombre en blanco en la ficha pública, el
 * buscador y el flujo de reserva.
 *
 * Mockeamos Clerk, Prisma, el service de onboarding y el `redirect` de
 * next-intl: lo que se verifica es el `LocalizedText` que la action
 * construye, no la persistencia.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  authMock,
  ensureUserMock,
  requireCurrentProviderMock,
  createFirstServiceMock,
  prismaMock,
  redirectMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  ensureUserMock: vi.fn(),
  requireCurrentProviderMock: vi.fn(),
  createFirstServiceMock: vi.fn(),
  prismaMock: {
    service: { findUnique: vi.fn(), update: vi.fn() },
    category: { findUnique: vi.fn() },
  },
  redirectMock: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({ auth: authMock }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/i18n/navigation', () => ({ redirect: redirectMock }));
vi.mock('@/lib/auth/server', () => ({ requireCurrentProvider: requireCurrentProviderMock }));
vi.mock('@/lib/db/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/services/user', () => ({ ensureUserFromClerk: ensureUserMock }));
vi.mock('@/lib/services/provider-onboarding', () => ({
  createFirstServiceForProvider: createFirstServiceMock,
  CategoryNotFoundError: class CategoryNotFoundError extends Error {},
  ProviderForOnboardingNotFoundError: class ProviderForOnboardingNotFoundError extends Error {},
}));

import { createServiceAction, updateServiceAction } from './actions';

const RAW = {
  rootCategoryId: 'cat-root',
  typeId: null,
  subtypeId: null,
  name: 'Haarschnitt',
  description: 'Klassischer Haarschnitt',
  durationMinutes: '30',
  priceEuros: '25',
};

describe('createServiceAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: 'clerk_1' });
    ensureUserMock.mockResolvedValue({ id: 'user-1' });
    requireCurrentProviderMock.mockResolvedValue({ id: 'provider-1' });
    createFirstServiceMock.mockResolvedValue({ serviceId: 'service-1' });
  });

  it('guarda también el castellano cuando el panel está en alemán', async () => {
    await createServiceAction('de', RAW);

    expect(createFirstServiceMock).toHaveBeenCalledOnce();
    const [, payload] = createFirstServiceMock.mock.calls[0];
    expect(payload.name).toEqual({ es: 'Haarschnitt', de: 'Haarschnitt' });
    expect(payload.description).toEqual({
      es: 'Klassischer Haarschnitt',
      de: 'Klassischer Haarschnitt',
    });
  });

  it('guarda también el castellano cuando el panel está en catalán', async () => {
    await createServiceAction('ca', { ...RAW, name: 'Tall de cabell', description: '' });

    const [, payload] = createFirstServiceMock.mock.calls[0];
    expect(payload.name).toEqual({ es: 'Tall de cabell', ca: 'Tall de cabell' });
    expect(payload.description).toBeUndefined();
  });

  it('no duplica nada cuando el panel ya está en castellano', async () => {
    await createServiceAction('es', { ...RAW, name: 'Corte de pelo', description: '' });

    const [, payload] = createFirstServiceMock.mock.calls[0];
    expect(payload.name).toEqual({ es: 'Corte de pelo' });
  });

  it('rechaza un nombre vacío sin llegar al service', async () => {
    const result = await createServiceAction('de', { ...RAW, name: '   ' });

    expect(result).toMatchObject({ ok: false, code: 'VALIDATION' });
    expect(createFirstServiceMock).not.toHaveBeenCalled();
  });
});

describe('updateServiceAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: 'clerk_1' });
    requireCurrentProviderMock.mockResolvedValue({ id: 'provider-1' });
    prismaMock.category.findUnique.mockResolvedValue({ id: 'cat-root' });
    prismaMock.service.update.mockResolvedValue({ id: 'service-1' });
  });

  /** Devuelve el `data` con el que se llamó a `prisma.service.update`. */
  function updateData() {
    return prismaMock.service.update.mock.calls[0][0].data;
  }

  it('no pierde los idiomas que no se tocaron', async () => {
    prismaMock.service.findUnique.mockResolvedValue({
      id: 'service-1',
      providerId: 'provider-1',
      deletedAt: null,
      name: { es: 'Corte de pelo', ca: 'Tall de cabell', de: 'Haarschnitt' },
      description: { es: 'Descripción', ca: 'Descripció' },
    });

    await updateServiceAction('service-1', 'de', {
      ...RAW,
      name: 'Haarschnitt XL',
      description: '',
    });

    expect(updateData().name).toEqual({
      es: 'Corte de pelo',
      ca: 'Tall de cabell',
      de: 'Haarschnitt XL',
    });
    // Descripción no tocada: se conserva íntegra.
    expect(updateData().description).toEqual({ es: 'Descripción', ca: 'Descripció' });
  });

  it('cura el castellano de un servicio antiguo creado sin `es`', async () => {
    prismaMock.service.findUnique.mockResolvedValue({
      id: 'service-1',
      providerId: 'provider-1',
      deletedAt: null,
      name: { de: 'Haarschnitt' },
      description: { de: 'Klassisch' },
    });

    await updateServiceAction('service-1', 'de', {
      ...RAW,
      name: 'Haarschnitt XL',
      description: '',
    });

    expect(updateData().name).toEqual({ es: 'Haarschnitt XL', de: 'Haarschnitt XL' });
    // Descripción intacta salvo por el castellano que le faltaba.
    expect(updateData().description).toEqual({ es: 'Klassisch', de: 'Klassisch' });
  });

  it('rechaza un nombre vacío', async () => {
    prismaMock.service.findUnique.mockResolvedValue({
      id: 'service-1',
      providerId: 'provider-1',
      deletedAt: null,
      name: { es: 'Corte' },
      description: {},
    });

    const result = await updateServiceAction('service-1', 'ca', { ...RAW, name: '  ' });

    expect(result).toMatchObject({ ok: false, code: 'VALIDATION' });
    expect(prismaMock.service.update).not.toHaveBeenCalled();
  });
});
