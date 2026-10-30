import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { BillingStatusBanner } from '@/components/features/provider-panel/BillingStatusBanner';
import { OnsitePaymentCard } from '@/components/features/provider-panel/OnsitePaymentCard';
import {
  PlanPageHeader,
  type PlanPageNotice,
} from '@/components/features/provider-panel/PlanPageHeader';
import { PlanPicker } from '@/components/features/provider-panel/PlanPicker';
import { PlanSummaryCard } from '@/components/features/provider-panel/PlanSummaryCard';
import { routing, type AppLocale } from '@/i18n/routing';
import { requireCurrentProvider } from '@/lib/auth/server';
import {
  CheckoutSessionMismatchError,
  confirmCheckoutSession,
  confirmOnsiteSetupSession,
  getOnsiteBillingSummary,
  getProviderBillingSummary,
} from '@/lib/services/billing';
import { listPublicPlans } from '@/lib/services/plans';
import {
  parsePlanPageQuery,
  resolveCheckoutState,
  type CheckoutConfirmOutcome,
  type PlanPageQuery,
} from '@/lib/validation';

interface PanelPlanPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: PanelPlanPageProps): Promise<Metadata> {
  const { locale } = await params;
  const safeLocale = hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;
  const t = await getTranslations({ locale: safeLocale, namespace: 'providerPanel.plan' });
  return { title: t('title'), robots: { index: false, follow: false } };
}

/**
 * Confirma la sesión de Checkout al volver de Stripe para enseñar el
 * plan nuevo sin esperar al webhook. Ningún fallo rompe la página: si
 * Stripe no responde, el webhook sincronizará igual.
 */
async function confirmReturn(
  sessionId: string,
  providerId: string,
): Promise<CheckoutConfirmOutcome> {
  try {
    const result = await confirmCheckoutSession(sessionId, providerId);
    return result ? 'synced' : 'pending';
  } catch (err) {
    if (err instanceof CheckoutSessionMismatchError) return 'mismatch';
    console.error('[panel/plan] confirmCheckoutSession failed:', err);
    return 'error';
  }
}

/**
 * Vuelta del Checkout de setup del cobro en el local: guarda ya el
 * método de pago para que la tarjeta lo muestre sin esperar al webhook.
 * Ningún fallo rompe la página (el webhook lo guardará igualmente).
 */
async function confirmOnsiteSetupReturn(sessionId: string, providerId: string): Promise<void> {
  try {
    await confirmOnsiteSetupSession(sessionId, providerId);
  } catch (err) {
    if (err instanceof CheckoutSessionMismatchError) return;
    console.error('[panel/plan] confirmOnsiteSetupSession failed:', err);
  }
}

/** Aviso de cabecera según la vuelta de Stripe. */
function pageNotice(
  query: PlanPageQuery,
  outcome: CheckoutConfirmOutcome | null,
): PlanPageNotice | null {
  if (query.checkout === 'cancelled') return 'checkoutCancelled';
  if (query.checkout === 'failed') return 'checkoutFailed';
  if (outcome === 'mismatch') return 'confirmFailed';
  return null;
}

/**
 * Plan del negocio (`/panel/plan`): resumen, avisos de facturación y
 * selector de planes. Las contrataciones y cambios se hacen en Stripe
 * (Checkout o portal) y vuelven aquí:
 *  - `?checkout=success&session_id=…` → confirma la sesión; si Stripe
 *    aún no ha creado la suscripción, el aviso «Activando…» refresca la
 *    página cada ~3 s.
 *  - `?checkout=cancelled` → aviso de que no se ha cobrado nada.
 *  - `?checkout=failed&plan=…` → el onboarding no pudo abrir el pago.
 *  - `?plan=<tier>` → destaca ese plan en el selector.
 *  - `?onsite_setup=success&session_id=…` → guarda el método de pago de
 *    las comisiones del cobro en el local (tarjeta «Cobro en el local»).
 */
export default async function PanelPlanPage({ params, searchParams }: PanelPlanPageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const panelLocale: AppLocale = locale;

  const { id: providerId } = await requireCurrentProvider(panelLocale);
  const query = parsePlanPageQuery(await searchParams);

  // La confirmación va antes que el resumen para que este ya refleje la
  // suscripción recién sincronizada.
  const outcome =
    query.checkout === 'success' && query.sessionId
      ? await confirmReturn(query.sessionId, providerId)
      : null;
  if (query.onsiteSetup === 'success' && query.sessionId) {
    await confirmOnsiteSetupReturn(query.sessionId, providerId);
  }

  const [summary, plans, onsite] = await Promise.all([
    getProviderBillingSummary(providerId),
    listPublicPlans(),
    getOnsiteBillingSummary(providerId),
  ]);
  const checkoutState = resolveCheckoutState(outcome, summary.subscriptionStatus);

  return (
    <div className="flex flex-col gap-6">
      <PlanPageHeader notice={pageNotice(query, outcome)} noticePlan={query.plan} />
      <BillingStatusBanner summary={summary} locale={panelLocale} checkoutState={checkoutState} />
      <PlanSummaryCard summary={summary} locale={panelLocale} showChangePlanLink={false} />
      <OnsitePaymentCard summary={onsite} locale={panelLocale} />
      <PlanPicker
        plans={plans}
        summary={summary}
        locale={panelLocale}
        preselectedTier={query.plan}
      />
    </div>
  );
}
