import { fakeProviders } from '@/lib/fake-data/providers';
import { fakeServices } from '@/lib/fake-data/services';
import type { Provider, Service } from '@/types/domain';

/**
 * Repositorio de proveedores: única frontera entre la lógica de
 * negocio y la fuente de datos.
 *
 * HOY: lee del array `fakeProviders` en memoria.
 * MAÑANA: sustituiremos el cuerpo de cada método por queries Prisma
 *         contra la BD real. La firma pública NO debe cambiar.
 *
 * El acceso fuera de este módulo debe ser SIEMPRE vía estas funciones,
 * nunca importando `fakeProviders` directamente desde el service. Así
 * el día del swap a Prisma cambiamos un solo archivo.
 */
export const providersRepository = {
  /**
   * Devuelve todos los proveedores activos.
   * En Prisma será `prisma.provider.findMany({ where: { deletedAt: null, verified: true } })`.
   */
  async findAll(): Promise<Provider[]> {
    return fakeProviders;
  },

  /**
   * Localiza un proveedor por id.
   * En Prisma será `prisma.provider.findUnique({ where: { id } })`.
   */
  async findById(id: string): Promise<Provider | null> {
    return fakeProviders.find((p) => p.id === id) ?? null;
  },

  /**
   * Localiza un proveedor por slug.
   * En Prisma será `prisma.provider.findUnique({ where: { slug } })`.
   */
  async findBySlug(slug: string): Promise<Provider | null> {
    return fakeProviders.find((p) => p.slug === slug) ?? null;
  },

  /**
   * Localiza un servicio dentro del catálogo de un proveedor concreto.
   *
   * Devolvemos `null` si el servicio no existe o si existe pero
   * pertenece a otro `providerId`: esto evita filtrar accidentalmente
   * un servicio bajo la URL de un centro que no es el suyo y nos
   * permite responder con 404 limpio desde la página.
   *
   * En Prisma será:
   * `prisma.service.findFirst({ where: { id: serviceId, providerId } })`.
   */
  async findServiceByProvider(providerId: string, serviceId: string): Promise<Service | null> {
    return fakeServices.find((s) => s.id === serviceId && s.providerId === providerId) ?? null;
  },
};
