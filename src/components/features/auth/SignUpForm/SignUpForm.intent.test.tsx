/**
 * Tests de la preselección de rol y plan en el alta.
 *
 * Cubren el camino que abre `/profesionales`: los CTAs mandan a
 * `/registro?as=provider&plan=pro` y el formulario debe arrancar en la
 * pestaña de profesional con el plan recordado. Antes arrancaba
 * siempre en `client` y el plan se perdía.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  Link: ({ children, ...rest }: ComponentProps<'a'>) => <a {...rest}>{children}</a>,
}));

const signUpCreateMock = vi.fn();
const prepareVerificationMock = vi.fn();

vi.mock('@clerk/nextjs', () => ({
  useUser: () => ({ user: null, isLoaded: true, isSignedIn: false }),
}));

vi.mock('@clerk/nextjs/legacy', () => ({
  useSignUp: () => ({
    isLoaded: true,
    signUp: {
      create: signUpCreateMock,
      prepareEmailAddressVerification: prepareVerificationMock,
      attemptEmailAddressVerification: vi.fn(),
    },
    setActive: vi.fn(),
  }),
}));

import { SignUpForm } from './SignUpForm';
import type { SignUpFormProps } from './SignUpForm.types';
import { signUpMessages as messages } from './SignUpForm.test-fixtures';

function renderForm(props: SignUpFormProps = {}) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <SignUpForm {...props} />
    </NextIntlClientProvider>,
  );
}

/** Rellena el formulario de proveedor y lo envía. */
async function submitAsProvider(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Nombre del responsable'), 'Jorge');
  await user.type(screen.getByLabelText('Nombre del centro'), 'Estudio Beauly');
  await user.type(screen.getByLabelText('Email'), 'jorge@yaiwell.com');
  await user.type(screen.getByLabelText('Contraseña'), 'unaclavefuerte');
  await user.type(screen.getByLabelText('Repite la contraseña'), 'unaclavefuerte');
  await user.click(screen.getByRole('checkbox'));
  await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));
}

beforeEach(() => {
  signUpCreateMock.mockReset();
  prepareVerificationMock.mockReset();
  signUpCreateMock.mockResolvedValue({});
  prepareVerificationMock.mockResolvedValue({});
});

describe('SignUpForm — intención de alta desde la URL', () => {
  it('sin parámetros arranca en la pestaña de cliente', () => {
    renderForm();

    expect(screen.getByRole('tab', { name: 'Soy cliente' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    // El campo exclusivo de proveedor no está presente.
    expect(screen.queryByLabelText('Nombre del centro')).not.toBeInTheDocument();
  });

  it('con `as=provider` arranca en la pestaña de profesional', () => {
    renderForm({ initialRole: 'provider' });

    expect(screen.getByRole('tab', { name: 'Soy profesional' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByLabelText('Nombre del centro')).toBeInTheDocument();
  });

  it('un rol inválido nunca llega aquí: sin prop, el rol es cliente', () => {
    // La page descarta `?as=admin` con Zod y no pasa nada; el
    // formulario aplica entonces su valor por defecto.
    renderForm({ initialRole: undefined });

    expect(screen.getByRole('tab', { name: 'Soy cliente' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('el plan elegido viaja a Clerk en unsafeMetadata.selectedPlan', async () => {
    const user = userEvent.setup();
    renderForm({ initialRole: 'provider', initialPlan: 'pro' });

    await submitAsProvider(user);

    await waitFor(() => {
      expect(signUpCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          unsafeMetadata: expect.objectContaining({
            role: 'provider',
            businessName: 'Estudio Beauly',
            selectedPlan: 'pro',
          }),
        }),
      );
    });
  });

  it('sin plan en la URL no se inventa ninguno', async () => {
    const user = userEvent.setup();
    renderForm({ initialRole: 'provider' });

    await submitAsProvider(user);

    await waitFor(() => expect(signUpCreateMock).toHaveBeenCalled());

    const metadata = signUpCreateMock.mock.calls[0][0].unsafeMetadata;
    expect(metadata).not.toHaveProperty('selectedPlan');
  });
});
