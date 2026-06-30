import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { ProviderSettings } from '@/components/features/provider-panel/ProviderSettings';
import type { SettingsProvider } from '@/components/features/provider-panel/ProviderSettings/ProviderSettings.types';
import { StripeConnectCard } from '@/components/features/provider-panel/StripeConnectCard';
import { requireCurrentProvider } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import type { WeeklySchedule } from '@/lib/services/availability';
import {
  getProviderPaymentsStatus,
  StripeOperationError,
  type ConnectAccountStatus,
} from '@/lib/services/payments';
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

/**
 * Estado de pagos por defecto cuando Stripe no responde. Permite que
 * el bloque renderice como "desconectado" con un banner de error y un
 * CTA "Reintentar" en lugar de tumbar toda la página por un fallo de
 * la API externa.
 */
const FAILED_PAYMENTS_STATUS: ConnectAccountStatus = {
  exists: false,
  detailsSubmitted: false,
  chargesEnabled: false,
  payoutsEnabled: false,
  hasPendingRequirements: false,
};

interface PanelSettingsPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Configuración del centro (`/panel/centro`).
 *
 * Server Component que lee los datos del proveedor autenticado y los
 * pasa a 3 bloques de UI: configuración del centro (datos + horario),
 * estado de pagos (Stripe Connect) y card próximamente de multi-negocio.
 *
 * Carga en paralelo provider + schedule + estado de pagos para no
 * encadenar round-trips. Tolera fallos puntuales de cada fuente sin
 * romper la página entera.
 */
export default async function PanelSettingsPage({ params, searchParams }: PanelSettingsPageProps) {
  const { locale } = await params;
  const sp = await searchParams;

  if (!hasLocale(['es', 'ca', 'en', 'de'], locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const { id } = await requireCurrentProvider(locale);

  // Paralelizamos: provider, schedule y pagos son independientes.
  // Los catches devuelven sentinelas tipados ({ok:true, ...} / {ok:false})
  // en lugar de mutar variables externas — más limpio en concurrente.
  const [record, schedule, paymentsResult] = await Promise.all([
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
      if (err instanceof ProviderHasNoProfessionalError) {
        return EMPTY_SCHEDULE;
      }
      throw err;
    }),
    getProviderPaymentsStatus(id)
      .then((status) => ({ ok: true as const, status }))
      .catch((err) => {
        // Stripe puede fallar por outage, key mal configurada o cuenta
        // suspendida. Pintamos el bloque como "desconectado" con banner
        // de error en vez de tumbar la página entera.
        if (err instanceof StripeOperationError) {
          return { ok: false as const, status: FAILED_PAYMENTS_STATUS };
        }
        // Otros errores (provider no encontrado, etc.) sí los propagamos
        // — son señal de inconsistencia y conviene verlos en Sentry.
        throw err;
      }),
  ]);

  const paymentsStatus = paymentsResult.status;
  const paymentsFetchFailed = !paymentsResult.ok;

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

  // Notice de retorno del flujo de onboarding de Stripe — la URL del
  // return page y del refresh page redirigen aquí con un querystring
  // marcador. La card lo muestra como banner temporal.
  const inlineNotice =
    sp.stripe === 'return'
      ? ('return' as const)
      : sp.stripe === 'refresh-failed'
        ? ('refresh-failed' as const)
        : null;

  return (
    <div className="flex flex-col gap-6">
      <ProviderSettings provider={provider} schedule={schedule} locale={panelLocale} />
      <StripeConnectCard
        locale={panelLocale}
        status={paymentsStatus}
        fetchFailed={paymentsFetchFailed}
        inlineNotice={inlineNotice}
      />
    </div>
  );
}
