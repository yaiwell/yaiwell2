import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { ProviderSettings } from '@/components/features/provider-panel/ProviderSettings';
import type { SettingsProvider } from '@/components/features/provider-panel/ProviderSettings/ProviderSettings.types';
import { requireCurrentProvider } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import type { WeeklySchedule } from '@/lib/services/availability';
import { getProviderSchedule, ProviderHasNoProfessionalError } from '@/lib/services/provider';
import type { LocalizedText } from '@/types/domain';

/**
 * Horario semanal "vacío" (7 días cerrados) que pintamos en el editor
 * si el provider está en el caso patológico de no tener Professional
 * (no debería ocurrir si el wizard lo creó). Permite que la pantalla
 * carge igualmente para que el dueño vea el form; al guardar la action
 * devolverá `NO_PROFESSIONAL` y se mostrará el copy correspondiente.
 */
const EMPTY_SCHEDULE: WeeklySchedule = {
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: [],
};

interface PanelSettingsPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Configuración del centro (`/panel/centro`).
 *
 * Server Component que lee los datos del proveedor autenticado y los
 * pasa al formulario `ProviderSettings` (Client). El botón "Guardar"
 * persiste businessName, vatNumber, description y address via la server
 * action `updateProviderSettingsAction`; el resto de campos del form
 * (phone, email, ciudad/CP, horario) quedan inertes hasta que el wizard
 * de onboarding y la UI los recojan.
 *
 * `requireCurrentProvider` ya garantiza que llegamos aquí con un
 * Provider creado (redirige a `/onboarding` si falta). Hacemos un
 * segundo query Prisma para traer los campos extra que el formulario
 * necesita (description JSON, address, photos, vatNumber) — el helper
 * intencionadamente devuelve un subset mínimo para el header del panel.
 */
export default async function PanelSettingsPage({ params }: PanelSettingsPageProps) {
  const { locale } = await params;

  if (!hasLocale(['es', 'ca', 'en', 'de'], locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const { id } = await requireCurrentProvider(locale);

  // Paralelizamos: la lectura del provider y la del schedule son
  // independientes, ahorrar el round-trip secuencial reduce TTFB.
  const [record, schedule] = await Promise.all([
    prisma.provider.findUnique({
      where: { id },
      select: {
        businessName: true,
        vatNumber: true,
        description: true,
        address: true,
        photos: true,
      },
    }),
    getProviderSchedule(id).catch((err) => {
      // Caso patológico: provider sin Professional. Pintamos el editor
      // con horario vacío para que el dueño pueda al menos ver la UI.
      // Al pulsar Guardar, la action devolverá NO_PROFESSIONAL y la
      // notice de error guiará al usuario.
      if (err instanceof ProviderHasNoProfessionalError) {
        return EMPTY_SCHEDULE;
      }
      throw err;
    }),
  ]);

  // `requireCurrentProvider` ya garantiza existencia; este check es
  // defensa contra una carrera muy improbable (borrado entre llamadas).
  if (!record) {
    notFound();
  }

  // Prisma tipa `description` como `JsonValue` opaco. Sabemos por el
  // wizard que siempre escribimos `{ es, ca, en?, de? }` — casteo al
  // tipo de dominio que el componente espera.
  const provider: SettingsProvider = {
    id,
    businessName: record.businessName,
    vatNumber: record.vatNumber,
    description: record.description as unknown as LocalizedText,
    address: record.address,
    photos: record.photos,
  };

  const panelLocale = locale as 'es' | 'ca' | 'en' | 'de';

  return <ProviderSettings provider={provider} schedule={schedule} locale={panelLocale} />;
}
