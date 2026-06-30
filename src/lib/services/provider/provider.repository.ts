import 'server-only';

/**
 * Repositorio del dominio `provider` (operaciones del panel).
 *
 * Capa fina sobre Prisma: solo lectura/escritura, ninguna regla de
 * negocio. Las reglas (ownership, fusión de `LocalizedText`) viven en
 * `provider.service.ts`.
 *
 * Convivencia con otros módulos:
 *  - `provider-onboarding.repository.ts` cubre el alta inicial.
 *  - `providers.repository.ts` cubre la lectura pública (hoy fake).
 *  - Este repo cubre los updates puntuales del panel.
 */

import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';
import type { LocalizedText } from '@/types/domain';

/** Subset del Provider necesario para componer el update de settings. */
export interface ProviderSettingsRow {
  id: string;
  description: LocalizedText;
}

export interface UpdateSettingsArgs {
  businessName: string;
  vatNumber: string | null;
  description: LocalizedText;
  address: string;
}

export const providerRepository = {
  /**
   * Lee los campos necesarios para componer un update de settings.
   * El service lo usa para fusionar `description` antes de escribir.
   */
  async findSettings(providerId: string): Promise<ProviderSettingsRow | null> {
    const row = await prisma.provider.findFirst({
      where: { id: providerId, deletedAt: null },
      select: { id: true, description: true },
    });
    if (!row) return null;
    // `description` en Prisma viene como `JsonValue` opaco. Sabemos por
    // el resto del dominio que es un `LocalizedText`; el cast lo aclara
    // sin propagar la opacidad fuera del repo.
    return {
      id: row.id,
      description: (row.description as unknown as LocalizedText) ?? {},
    };
  },

  /** Persiste los campos editables del centro. Update atómico. */
  async updateSettings(providerId: string, args: UpdateSettingsArgs): Promise<void> {
    await prisma.provider.update({
      where: { id: providerId },
      data: {
        businessName: args.businessName,
        vatNumber: args.vatNumber,
        // El cast preserva la forma literal y mantiene la firma jsonb
        // que Prisma espera para columnas Json.
        description: args.description as unknown as Prisma.InputJsonValue,
        address: args.address,
      },
    });
  },

  /**
   * Devuelve el `id` y el `schedule` del **primer** Professional del
   * provider (orden por `createdAt` ascendente).
   *
   * MVP: para autónomos hay 1 Professional y representa al dueño; para
   * centros, el primer Professional creado actúa como "horario por
   * defecto del local" hasta que llegue la gestión multi-profesional
   * en el panel (deuda explícita en TODO). Si no hay ninguno (caso
   * patológico — el wizard siempre crea uno), devolvemos null y el
   * service lanza `ProviderHasNoProfessionalError`.
   */
  async findFirstProfessional(
    providerId: string,
  ): Promise<{ id: string; schedule: unknown } | null> {
    const row = await prisma.professional.findFirst({
      where: { providerId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true, schedule: true },
    });
    return row;
  },

  /**
   * Actualiza el `schedule` JSON de un Professional concreto. La
   * validación de la forma del JSON la hace el service con
   * `weeklyScheduleSchema` antes de llegar aquí.
   */
  async updateProfessionalSchedule(
    professionalId: string,
    schedule: Prisma.InputJsonValue,
  ): Promise<void> {
    await prisma.professional.update({
      where: { id: professionalId },
      data: { schedule },
    });
  },
};
