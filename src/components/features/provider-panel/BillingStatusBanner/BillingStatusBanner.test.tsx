import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import es from '@/messages/es.json';

import { buildSummary, PRO_ACTIVE } from '../plan-shared/plan-shared.test-fixtures';

import { BillingStatusBanner } from './BillingStatusBanner';

/**
 * Tests del aviso de facturación: solo aparece si hay algo relevante,
 * el cobro fallido abre el portal de la tarjeta y la fecha sale en hora
 * de Madrid.
 */

const actions = vi.hoisted(() => ({
  startPlanCheckoutAction: vi.fn(),
  openBillingPortalAction: vi.fn(),
}));
vi.mock('@/app/[locale]/panel/plan/actions', () => actions);
vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  Link: ({ children, ...rest }: ComponentProps<'a'>) => <a {...rest}>{children}</a>,
}));

const t = es.providerPanel.plan;

function renderBanner(props: Partial<ComponentProps<typeof BillingStatusBanner>> = {}) {
  return render(
    <NextIntlClientProvider
      locale="es"
      timeZone="Europe/Madrid"
      messages={{ providerPanel: { plan: t } }}
    >
      <BillingStatusBanner summary={buildSummary()} locale="es" {...props} />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('BillingStatusBanner', () => {
  it('sin nada relevante no pinta nada', () => {
    const { container } = renderBanner({ summary: buildSummary(PRO_ACTIVE) });
    expect(container).toBeEmptyDOMElement();
  });

  it('cobro fallido: alerta con botón para actualizar la tarjeta', async () => {
    const user = userEvent.setup();
    actions.openBillingPortalAction.mockResolvedValue({ ok: false, code: 'INTERNAL' });
    renderBanner({ summary: buildSummary({ ...PRO_ACTIVE, subscriptionStatus: 'past_due' }) });

    const banner = screen.getByRole('alert');
    expect(banner).toHaveAttribute('data-variant', 'past_due');
    expect(banner).toHaveTextContent('No hemos podido cobrar tu plan Pro');
    await user.click(screen.getByRole('button', { name: t.banner.past_due.cta }));
    expect(actions.openBillingPortalAction).toHaveBeenCalledWith('es', 'payment_method', undefined);
  });

  it('cancelación programada: fecha en castellano y enlace al plan en el dashboard', () => {
    renderBanner({
      summary: buildSummary({ ...PRO_ACTIVE, cancelAtPeriodEnd: true }),
      showPlanLink: true,
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      'Tu plan Pro termina el 29 de noviembre de 2026',
    );
    expect(screen.getByRole('link', { name: new RegExp(t.banner.viewPlan) })).toHaveAttribute(
      'href',
      '/panel/plan',
    );
  });

  it('activando: aviso de estado mientras Stripe confirma', () => {
    renderBanner({ checkoutState: 'activating' });
    expect(screen.getByRole('status')).toHaveTextContent(t.banner.activating.title);
  });
});
