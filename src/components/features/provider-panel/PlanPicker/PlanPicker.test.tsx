import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PublicPlan } from '@/lib/services/plans';
import es from '@/messages/es.json';

import { buildSummary, PRO_ACTIVE } from '../plan-shared/plan-shared.test-fixtures';

import { PlanPicker } from './PlanPicker';

/**
 * Tests del selector de planes de `/panel/plan`: cada tarjeta pinta la
 * CTA que toca y el clic lleva a la action correcta; en éxito el
 * navegador va a la URL de Stripe y en fallo aparece el aviso.
 */

const actions = vi.hoisted(() => ({
  startPlanCheckoutAction: vi.fn(),
  openBillingPortalAction: vi.fn(),
}));
vi.mock('@/app/[locale]/panel/plan/actions', () => actions);

const PLANS: PublicPlan[] = [
  { tier: 'free', monthlyPriceCents: 0, commissionRateBps: 1200, maxServices: 1 },
  { tier: 'basic', monthlyPriceCents: 1900, commissionRateBps: 1000, maxServices: 10 },
  { tier: 'pro', monthlyPriceCents: 4900, commissionRateBps: 800, maxServices: 50 },
  { tier: 'premium', monthlyPriceCents: 9900, commissionRateBps: 600, maxServices: 999 },
];

const t = es.providerPanel.plan;
const assign = vi.fn();

/** Botón de la tarjeta de un plan (por su `data-component`). */
function cta(tier: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(`[data-component="plan-cta-${tier}"]`);
  if (!el) throw new Error(`no CTA for ${tier}`);
  return el;
}

function renderPicker(summary = buildSummary()) {
  return render(
    <NextIntlClientProvider locale="es" messages={{ providerPanel: { plan: t } }}>
      <PlanPicker plans={PLANS} summary={summary} locale="es" />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('location', { ...window.location, assign });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PlanPicker', () => {
  it('en Gratis ofrece contratar los planes de pago', () => {
    renderPicker();
    expect(cta('free')).toBeDisabled();
    expect(cta('pro')).toHaveAttribute('data-cta', 'subscribe');
    expect(screen.getByText('49 €')).toBeInTheDocument();
    expect(screen.getAllByText(t.card.vatIncluded)).toHaveLength(3);
  });

  it('contratar abre el Checkout y lleva al navegador a Stripe', async () => {
    const user = userEvent.setup();
    actions.startPlanCheckoutAction.mockResolvedValue({ ok: true, url: 'https://stripe.test/c' });
    renderPicker();

    await user.click(cta('pro'));

    expect(actions.startPlanCheckoutAction).toHaveBeenCalledWith('es', 'pro');
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://stripe.test/c'));
  });

  it('con suscripción viva cambia por el portal y Gratis cancela', async () => {
    const user = userEvent.setup();
    actions.openBillingPortalAction.mockResolvedValue({ ok: false, code: 'STRIPE_FAILED' });
    renderPicker(buildSummary(PRO_ACTIVE));

    expect(cta('pro')).toHaveAttribute('data-cta', 'current');
    expect(cta('free')).toHaveAttribute('data-cta', 'downgrade_free');
    await user.click(cta('premium'));

    expect(actions.openBillingPortalAction).toHaveBeenCalledWith('es', 'change', 'premium');
    expect(await screen.findByRole('alert')).toHaveTextContent(t.errors.STRIPE_FAILED);
    expect(assign).not.toHaveBeenCalled();
  });

  it('con una bajada programada bloquea el resto de planes', () => {
    renderPicker(
      buildSummary({
        ...PRO_ACTIVE,
        scheduledTier: 'basic',
        scheduledChangeAt: new Date('2026-11-29T10:00:00Z'),
      }),
    );
    expect(cta('basic')).toHaveAttribute('data-cta', 'scheduled');
    expect(cta('premium')).toBeDisabled();
    expect(screen.getByText(t.picker.lockedHint)).toBeInTheDocument();
  });
});
