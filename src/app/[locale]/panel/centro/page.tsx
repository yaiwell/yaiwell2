import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { ProviderSettings } from '@/components/features/provider-panel/ProviderSettings';
import type { SettingsProvider } from '@/components/features/provider-panel/ProviderSettings/ProviderSettings.types';
import { requireCurrentProvider } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import type { LocalizedText } from '@/types/domain';

interface PanelSettingsPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Configuración del centro (`/panel/centro`).
 *
 * Server Component que lee los datos del proveedor autenticado y los
 * pasa al formulario `ProviderSettings`. La persistencia del botón
 * "Guardar" llegará con Fase 1; los inputs siguen siendo `defaultValue`
 * mientras tanto.
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

  const record = await prisma.provider.findUnique({
    where: { id },
    select: {
      businessName: true,
      vatNumber: true,
      description: true,
      address: true,
      photos: true,
    },
  });

  // `requireCurrentProvider` ya garantiza existencia; este check es
  // defensa contra una carrera muy improbable (borrado entre llamadas).
  if (!record) {
    notFound();
  }

  // Prisma tipa `description` como `JsonValue` opaco. Sabemos por el
  // wizard que siempre escribimos `{ es, ca, en?, de? }` — casteo al
  // tipo de dominio que el componente espera.
  const provider: SettingsProvider = {
    businessName: record.businessName,
    vatNumber: record.vatNumber,
    description: record.description as unknown as LocalizedText,
    address: record.address,
    photos: record.photos,
  };

  const panelLocale = locale as 'es' | 'ca' | 'en' | 'de';

  return <ProviderSettings provider={provider} locale={panelLocale} />;
}
