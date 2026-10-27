import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ConnectAccountStatus } from '@/lib/services/payments';
import es from '@/messages/es.json';

import { StripeConnectCard } from './StripeConnectCard';
import type { StripeConnectCardProps } from './StripeConnectCard.types';

/**
 * Tests de la tarjeta de pagos de `/panel/centro`.
 *
 * Recorren cada estado (sin cuenta, alta sin terminar, faltan datos, en
 * revisión, cobros sin payouts, activo, Stripe caído y cuenta Custom) y
 * comprueban badge, CTA y que la cuenta Custom no ofrece acciones que
 * llamen a Stripe.
 */

const actions = vi.hoisted(() => ({
  startStripeOnboardingAction: vi.fn(),
  continueStripeOnboardingAction: vi.fn(),
  openStripeDashboardAction: vi.fn(),
  refreshStripeStatusAction: vi.fn(),
}));

vi.mock('@/app/[locale]/panel/centro/stripe/actions', () => actions);

const t = es.providerPanel.payments;
const messages = { providerPanel: { payments: t } };

const EXPRESS: ConnectAccountStatus = {
  exists: true,
  detailsSubmitted: true,
  chargesEnabled: true,
  payoutsEnabled: true,
  hasPendingRequirements: false,
  hasPastDueRequirements: false,
  disabledReason: null,
  isDisabled: false,
  businessType: 'individual',
  dashboardType: 'express',
};

const NONE: ConnectAccountStatus = {
  exists: false,
  detailsSubmitted: false,
  chargesEnabled: false,
  payoutsEnabled: false,
  hasPendingRequirements: false,
  hasPastDueRequirements: false,
  disabledReason: null,
  isDisabled: false,
  businessType: null,
  dashboardType: null,
};

function renderCard(props: Partial<StripeConnectCardProps> & { status: ConnectAccountStatus }) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <StripeConnectCard locale="es" {...props} />
    </NextIntlClientProvider>,
  );
}

const button = (name: string) => screen.getByRole('button', { name });
const queryButton = (name: string) => screen.queryByRole('button', { name });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('StripeConnectCard — estados', () => {
  it('sin cuenta: selector autónomo/empresa y "Conectar con Stripe"', () => {
    renderCard({ status: NONE });

    expect(screen.getByText(t.status.disconnected)).toBeInTheDocument();
    expect(screen.getByRole('group', { name: t.businessType.legend })).toBeInTheDocument();
    const individual = screen.getByRole('radio', {
      name: new RegExp(t.businessType.individual.label),
    });
    const company = screen.getByRole('radio', { name: new RegExp(t.businessType.company.label) });
    expect(individual).not.toBeChecked();
    expect(company).not.toBeChecked();
    expect(button(t.cta.connect)).toBeEnabled();
    expect(queryButton(t.cta.dashboard)).not.toBeInTheDocument();
  });

  it('alta sin terminar: "Continuar el alta" y ayuda para cambiar de tipo', () => {
    renderCard({ status: { ...EXPRESS, detailsSubmitted: false, chargesEnabled: false } });

    expect(screen.getByText(t.status.onboardingIncomplete)).toBeInTheDocument();
    expect(button(t.cta.continue)).toBeInTheDocument();
    expect(screen.getByText(t.notices.changeType)).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(queryButton(t.cta.dashboard)).not.toBeInTheDocument();
  });

  it('requisitos pendientes: aviso y "Completar datos"', () => {
    renderCard({ status: { ...EXPRESS, hasPendingRequirements: true } });

    expect(screen.getByText(t.status.requirementsDue)).toBeInTheDocument();
    expect(screen.getByText(t.description.requirementsDue)).toBeInTheDocument();
    expect(button(t.cta.completeData)).toBeInTheDocument();
    expect(button(t.cta.dashboard)).toBeInTheDocument();
  });

  it('cobros sin payouts: explica que el banco se activará después', () => {
    renderCard({ status: { ...EXPRESS, payoutsEnabled: false } });

    expect(screen.getByText(t.status.payoutsPending)).toBeInTheDocument();
    expect(screen.getByText(t.description.payoutsPending)).toBeInTheDocument();
    expect(button(t.cta.refresh)).toBeInTheDocument();
  });

  it('alta enviada sin cobros ni requisitos: en revisión', () => {
    renderCard({ status: { ...EXPRESS, chargesEnabled: false, payoutsEnabled: false } });

    expect(screen.getByText(t.status.inReview)).toBeInTheDocument();
  });

  it('todo activo: estado verde, tipo de cuenta y acceso al dashboard', () => {
    renderCard({ status: { ...EXPRESS, businessType: 'company' } });

    expect(screen.getByText(t.status.active)).toBeInTheDocument();
    expect(screen.getByText('Tipo de cuenta: Empresa / sociedad')).toBeInTheDocument();
    expect(button(t.cta.dashboard)).toBeInTheDocument();
    expect(button(t.cta.refresh)).toBeInTheDocument();
  });

  it('Stripe caído: solo aviso y "Actualizar estado", sin CTA de alta', () => {
    renderCard({ status: NONE, fetchFailed: true });

    expect(screen.getByText(t.notices.fetchFailed)).toBeInTheDocument();
    expect(queryButton(t.cta.connect)).not.toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(button(t.cta.refresh)).toBeInTheDocument();
  });

  it('cuenta Custom: muestra el estado pero ni login link ni AccountLink', () => {
    renderCard({
      status: { ...EXPRESS, dashboardType: 'custom', hasPendingRequirements: true },
    });

    expect(screen.getByText(t.status.requirementsDue)).toBeInTheDocument();
    expect(screen.getByText(t.notices.managedBySupport)).toBeInTheDocument();
    expect(queryButton(t.cta.dashboard)).not.toBeInTheDocument();
    expect(queryButton(t.cta.completeData)).not.toBeInTheDocument();
    expect(button(t.cta.refresh)).toBeInTheDocument();
  });

  it('cuenta deshabilitada por Stripe: nunca "En revisión", remite a soporte', () => {
    renderCard({
      status: {
        ...EXPRESS,
        chargesEnabled: false,
        payoutsEnabled: false,
        disabledReason: 'rejected.other',
        isDisabled: true,
      },
    });

    expect(screen.getByText(t.status.disabled)).toBeInTheDocument();
    expect(screen.getByText(t.description.disabled)).toBeInTheDocument();
    expect(screen.queryByText(t.status.inReview)).not.toBeInTheDocument();
    expect(queryButton(t.cta.completeData)).not.toBeInTheDocument();
    expect(button(t.cta.refresh)).toBeInTheDocument();
  });

  it('al volver de Stripe con el alta a medias avisa de que no está terminada', () => {
    renderCard({
      status: { ...EXPRESS, detailsSubmitted: false, chargesEnabled: false },
      inlineNotice: 'return',
    });

    expect(screen.getByText(t.notices.returnIncomplete)).toBeInTheDocument();
  });
});

describe('StripeConnectCard — acciones', () => {
  it('no conecta sin elegir tipo y avisa', async () => {
    const user = userEvent.setup();
    renderCard({ status: NONE });

    await user.click(button(t.cta.connect));

    expect(actions.startStripeOnboardingAction).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(t.errors.INVALID_INPUT);
  });

  it('conecta con el tipo elegido', async () => {
    actions.startStripeOnboardingAction.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    renderCard({ status: NONE });

    await user.click(screen.getByRole('radio', { name: new RegExp(t.businessType.company.label) }));
    await user.click(button(t.cta.connect));

    expect(actions.startStripeOnboardingAction).toHaveBeenCalledWith('es', {
      businessType: 'company',
    });
  });

  it('avisa si ya existe una cuenta de otro tipo', async () => {
    actions.startStripeOnboardingAction.mockResolvedValue({
      ok: false,
      code: 'ALREADY_CONNECTED',
      existingType: 'individual',
    });
    const user = userEvent.setup();
    renderCard({ status: NONE });

    await user.click(screen.getByRole('radio', { name: new RegExp(t.businessType.company.label) }));
    await user.click(button(t.cta.connect));

    expect(
      await screen.findByText(
        t.errors.ALREADY_CONNECTED.replace('{type}', t.businessType.individual.label),
      ),
    ).toBeInTheDocument();
  });

  it('muestra el error devuelto por la action', async () => {
    actions.continueStripeOnboardingAction.mockResolvedValue({ ok: false, code: 'STRIPE_FAILED' });
    const user = userEvent.setup();
    renderCard({ status: { ...EXPRESS, detailsSubmitted: false } });

    await user.click(button(t.cta.continue));

    expect(await screen.findByText(t.errors.STRIPE_FAILED)).toBeInTheDocument();
  });
});
