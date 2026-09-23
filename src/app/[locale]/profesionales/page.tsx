import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { ForProvidersLanding } from '@/components/features/marketing';
import { routing } from '@/i18n/routing';
import { isSentryEnabled } from '@/lib/integrations/sentry';
import { listPublicPlans, PlansNotSeededError, type PublicPlan } from '@/lib/services/plans';

interface ForProvidersPageProps {
  // En Next.js 16 `params` es una promesa.
  params: Promise<{ locale: string }>;
}

/**
 * Render dinámico obligatorio.
 *
 * La landing dejó de ser estática al leer las tarifas de BD: si la
 * prerenderizáramos, `next build` intentaría conectar a Postgres (que
 * en Vercel puede no estar disponible en build — ver el comentario de
 * inicialización perezosa en `lib/db/prisma.ts`) y, peor, congelaría
 * una comisión que puede cambiar sin redeploy.
 */
export const dynamic = 'force-dynamic';

/**
 * Genera los metadatos SEO de la landing /profesionales.
 *
 * Hereda el template `%s | Yaiwell` definido en el layout raíz, así que
 * sólo aportamos el título específico ("Para profesionales") y una
 * description orientada a SEO comercial (palabras clave: marketplace,
 * gratis, sin permanencia).
 */
export async function generateMetadata({ params }: ForProvidersPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};

  const t = await getTranslations({ locale, namespace: 'forProviders.meta' });

  return {
    title: t('title'),
    description: t('description'),
    openGraph: {
      title: t('title'),
      description: t('description'),
    },
    twitter: {
      title: t('title'),
      description: t('description'),
    },
  };
}

/**
 * Landing comercial /profesionales.
 *
 * Server Component que:
 *  - Valida el locale y activa `setRequestLocale` para que los textos
 *    se resuelvan con el idioma de la URL.
 *  - Lee las tarifas reales de la tabla `Plan` vía el servicio `plans`
 *    (nunca Prisma directo desde la page: CLAUDE.md §3).
 *  - Renderiza el orquestador `ForProvidersLanding`, que compone las
 *    cinco secciones (hero, beneficios, planes, FAQ y CTA final).
 *
 * Si la tabla de planes está vacía (entorno sin seed) NO publicamos
 * precios: la sección desaparece y el incidente queda registrado en
 * los logs del servidor. Es la única degradación aceptable — volver a
 * un array de tarifas hardcodeadas reintroduciría exactamente el bug
 * que este cambio elimina.
 */
export default async function ForProvidersPage({ params }: ForProvidersPageProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  let plans: PublicPlan[] | null = null;
  try {
    plans = await listPublicPlans();
  } catch (error) {
    if (!(error instanceof PlansNotSeededError)) throw error;
    // Degradación controlada: el resto del embudo (hero, beneficios,
    // FAQ, CTA) sigue captando altas aunque falte el catálogo.
    reportMissingPlans(error);
  }

  return (
    <div data-component="for-providers-page" className="contents">
      <ForProvidersLanding plans={plans} />
    </div>
  );
}

/**
 * Registra que la landing se ha servido sin precios.
 *
 * Una landing comercial sin tarifas es una incidencia de entorno (BD
 * sin seed), no un caso de uso: queremos alerta, no sólo una línea de
 * log. Cargamos Sentry de forma diferida y sólo con DSN configurado,
 * igual que en `checkout.refund.service.ts`.
 */
function reportMissingPlans(error: PlansNotSeededError): void {
  console.error('[profesionales] %s — sección de precios omitida.', error.code);

  if (!isSentryEnabled()) {
    return;
  }
  void import('@sentry/nextjs')
    .then((Sentry) => {
      Sentry.captureException(error, { tags: { domain: 'plans' } });
    })
    .catch(() => {
      // Sin telemetría nos quedamos con el console.error de arriba. La
      // landing no debe romperse por no poder reportar.
    });
}
