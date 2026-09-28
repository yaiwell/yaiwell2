/**
 * Tests del repositorio público de proveedores.
 *
 * Mockeamos Prisma para inspeccionar el SQL generado. Es la única forma
 * de verificar sin BD de dónde salen los `categoryIds`, y el bug que
 * estos tests vienen a impedir demuestra por qué hace falta: el filtro
 * de categorías de `/buscar` devolvía **cero resultados siempre**
 * porque agregaba `provider_categories`, una tabla que nunca ha tenido
 * ni una fila —no la escribe el seed, ni el onboarding, ni ningún
 * service—. Con Prisma mockeado, ni un solo test de service podía
 * detectarlo: una lista vacía es un resultado legítimo.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({ prisma: prismaMock }));

import { providersRepository } from './providers.repository';

/**
 * Reconstruye el SQL del último `$queryRaw`.
 *
 * Con template tag, Prisma recibe el array de trozos de texto como
 * primer argumento. Nos basta con unirlos: los valores interpolados no
 * nos interesan, solo la forma de la consulta.
 */
function lastQuerySql(): string {
  const call = prismaMock.$queryRaw.mock.calls.at(-1);
  const strings = call?.[0] as { raw?: readonly string[] } & readonly string[];
  const chunks = Array.from(strings ?? []);
  // Los fragmentos `Prisma.sql` interpolados llegan como valores con su
  // propio `.strings`; los aplanamos para ver la consulta completa.
  const interpolated = (call ?? [])
    .slice(1)
    .flatMap((value) =>
      value && typeof value === 'object' && 'strings' in value
        ? Array.from((value as { strings: readonly string[] }).strings)
        : [],
    );
  return [...chunks, ...interpolated].join(' ');
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$queryRaw.mockResolvedValue([]);
});

describe('providersRepository — origen de categoryIds', () => {
  it('NO deriva las categorías de provider_categories, que está vacía', async () => {
    await providersRepository.findAll();

    expect(lastQuerySql()).not.toContain('provider_categories');
  });

  it('deriva las categorías de los servicios publicados del proveedor', async () => {
    await providersRepository.findAll();
    const sql = lastQuerySql();

    expect(sql).toContain('FROM services s');
    expect(sql).toContain('JOIN categories c ON c.id = s."categoryId"');
  });

  it('incluye la ascendencia para que filtrar por la raíz encuentre sus hijas', async () => {
    await providersRepository.findAll();
    const sql = lastQuerySql();

    // Quien pulsa "Belleza" espera ver manicuras: hay que subir por la
    // cadena de padres, no quedarse en la categoría hoja del servicio.
    expect(sql).toContain('c."parentId"');
    expect(sql).toContain('parent."parentId"');
  });

  it('ignora los servicios pausados y los borrados', async () => {
    await providersRepository.findAll();
    const sql = lastQuerySql();

    // Un proveedor cuyo único servicio de belleza está pausado no debe
    // seguir apareciendo bajo "Belleza".
    expect(sql).toContain('s."isActive" = true');
    expect(sql).toContain('s."deletedAt" IS NULL');
  });

  it('aplica el mismo criterio en findById y findBySlug, no solo en el listado', async () => {
    // Las tres consultas compartían el mismo subquery copiado tres
    // veces: si una se queda atrás, la ficha y el listado discrepan.
    await providersRepository.findById('a1b2c3d4-e5f6-4789-8abc-def012345678');
    expect(lastQuerySql()).toContain('FROM services s');

    await providersRepository.findBySlug('atelier-nou');
    expect(lastQuerySql()).toContain('FROM services s');
  });
});
