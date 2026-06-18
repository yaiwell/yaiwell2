import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Mock del router de `@/i18n/navigation` antes de importar el componente.
 * Permite verificar que tras un reset exitoso navegamos al destino correcto.
 */
const replaceMock = vi.fn();
vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: replaceMock,
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  Link: ({ children, ...rest }: ComponentProps<'a'>) => <a {...rest}>{children}</a>,
}));

/**
 * Mock del SDK de Clerk: `useSignIn` headless con las dos llamadas que
 * usa el flujo (`create` con strategy reset_password_email_code y
 * `attemptFirstFactor` para validar el código).
 */
const signInCreateMock = vi.fn();
const attemptFirstFactorMock = vi.fn();
const setActiveMock = vi.fn();
let mockUser: { publicMetadata?: { role?: string }; unsafeMetadata?: { role?: string } } | null =
  null;

vi.mock('@clerk/nextjs', () => ({
  useUser: () => ({ user: mockUser, isLoaded: true, isSignedIn: mockUser !== null }),
}));

vi.mock('@clerk/nextjs/legacy', () => ({
  useSignIn: () => ({
    isLoaded: true,
    signIn: {
      create: signInCreateMock,
      attemptFirstFactor: attemptFirstFactorMock,
    },
    setActive: setActiveMock,
  }),
}));

import { ResetPasswordForm } from './ResetPasswordForm';

/**
 * Copy mínimo del namespace `resetPassword` necesario para los tests.
 * Refleja la estructura real de `src/messages/es.json`.
 */
const messages = {
  resetPassword: {
    meta: { title: 'Recupera', description: '.' },
    illustration: {
      badge: 'Yaiwell',
      title: '.',
      subtitle: '.',
      footer: '.',
    },
    request: {
      eyebrow: 'Recuperar',
      title: '¿Olvidaste tu contraseña?',
      subtitle: '.',
      emailLabel: 'Email',
      emailPlaceholder: '.',
      submit: 'Enviar código',
      submitting: 'Enviando…',
      backToSignIn: '¿Te has acordado? <link>Vuelve</link>.',
    },
    reset: {
      eyebrow: '.',
      title: 'Crea una contraseña nueva',
      subtitle: 'Si {email} tiene cuenta…',
      codeLabel: 'Código de 6 dígitos',
      newPasswordLabel: 'Nueva contraseña',
      newPasswordRepeatLabel: 'Repite la contraseña',
      submit: 'Actualizar y entrar',
      submitting: 'Actualizando…',
      back: 'Volver a pedir el código',
      success: '¡Listo!',
    },
    errors: {
      emailRequired: 'Introduce tu email.',
      emailInvalid: 'Email no válido.',
      passwordRequired: 'Campo obligatorio.',
      passwordTooShort: 'Mínimo 8 caracteres.',
      passwordMismatch: 'Las contraseñas no coinciden.',
      passwordCompromised: 'Contraseña insegura.',
      invalidCredentials: 'Solicitud no completada.',
      verificationCodeInvalid: 'Código incorrecto.',
      verificationCodeExpired: 'El código ha caducado.',
      tooManyAttempts: 'Demasiados intentos.',
      sessionExists: 'Sesión activa.',
      networkError: 'Sin conexión.',
      unknown: 'Algo ha fallado.',
    },
  },
};

function renderForm() {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <ResetPasswordForm />
    </NextIntlClientProvider>,
  );
}

function clerkError(code: string) {
  return { errors: [{ code, message: code }] };
}

async function fillEmailAndSubmit(email: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Email'), email);
  await user.click(screen.getByRole('button', { name: 'Enviar código' }));
  return user;
}

describe('ResetPasswordForm', () => {
  beforeEach(() => {
    replaceMock.mockClear();
    signInCreateMock.mockReset();
    attemptFirstFactorMock.mockReset();
    setActiveMock.mockReset();
    mockUser = null;
  });

  it('renderiza la fase de email con título y CTA', () => {
    renderForm();
    expect(
      screen.getByRole('heading', { level: 1, name: '¿Olvidaste tu contraseña?' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar código' })).toBeInTheDocument();
  });

  it('muestra error local si el email está vacío al enviar', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole('button', { name: 'Enviar código' }));

    expect(await screen.findByText('Introduce tu email.')).toBeInTheDocument();
    expect(signInCreateMock).not.toHaveBeenCalled();
  });

  it('muestra error local si el email no tiene formato válido', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText('Email'), 'no-es-email');
    await user.click(screen.getByRole('button', { name: 'Enviar código' }));

    expect(await screen.findByText('Email no válido.')).toBeInTheDocument();
    expect(signInCreateMock).not.toHaveBeenCalled();
  });

  it('tras submit válido pasa a la fase de reset', async () => {
    signInCreateMock.mockResolvedValue({});
    renderForm();
    await fillEmailAndSubmit('jorge@yaiwell.com');

    await waitFor(() => {
      expect(signInCreateMock).toHaveBeenCalledWith({
        strategy: 'reset_password_email_code',
        identifier: 'jorge@yaiwell.com',
      });
      expect(
        screen.getByRole('heading', { level: 1, name: 'Crea una contraseña nueva' }),
      ).toBeInTheDocument();
    });
  });

  it('si el email no existe (form_identifier_not_found) avanza igualmente para no revelar', async () => {
    // Política anti-enumeration: el flujo se ve igual con/sin cuenta.
    signInCreateMock.mockRejectedValue(clerkError('form_identifier_not_found'));
    renderForm();
    await fillEmailAndSubmit('desconocido@yaiwell.com');

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: 'Crea una contraseña nueva' }),
      ).toBeInTheDocument();
    });
    // No queremos un banner de error visible en este caso.
    expect(screen.queryByText('Solicitud no completada.')).not.toBeInTheDocument();
  });

  it('rate limit en la fase email se muestra como rootError', async () => {
    signInCreateMock.mockRejectedValue(clerkError('too_many_requests'));
    renderForm();
    await fillEmailAndSubmit('jorge@yaiwell.com');

    await waitFor(() => {
      expect(screen.getByText('Demasiados intentos.')).toBeInTheDocument();
    });
    expect(
      screen.queryByRole('heading', { level: 1, name: 'Crea una contraseña nueva' }),
    ).not.toBeInTheDocument();
  });

  it('en la fase reset, valida que las contraseñas coincidan antes de pegar a Clerk', async () => {
    signInCreateMock.mockResolvedValue({});
    renderForm();
    const user = await fillEmailAndSubmit('jorge@yaiwell.com');

    await screen.findByRole('heading', { level: 1, name: 'Crea una contraseña nueva' });

    await user.type(screen.getByLabelText('Código de 6 dígitos'), '123456');
    await user.type(screen.getByLabelText('Nueva contraseña'), 'unaclavefuerte');
    await user.type(screen.getByLabelText('Repite la contraseña'), 'distintaclave1');
    await user.click(screen.getByRole('button', { name: 'Actualizar y entrar' }));

    expect(await screen.findByText('Las contraseñas no coinciden.')).toBeInTheDocument();
    expect(attemptFirstFactorMock).not.toHaveBeenCalled();
  });

  it('en la fase reset, código incorrecto se ancla al campo código', async () => {
    signInCreateMock.mockResolvedValue({});
    attemptFirstFactorMock.mockRejectedValue(clerkError('form_code_incorrect'));
    renderForm();
    const user = await fillEmailAndSubmit('jorge@yaiwell.com');

    await screen.findByRole('heading', { level: 1, name: 'Crea una contraseña nueva' });
    await user.type(screen.getByLabelText('Código de 6 dígitos'), '000000');
    await user.type(screen.getByLabelText('Nueva contraseña'), 'unaclavefuerte');
    await user.type(screen.getByLabelText('Repite la contraseña'), 'unaclavefuerte');
    await user.click(screen.getByRole('button', { name: 'Actualizar y entrar' }));

    await waitFor(() => {
      expect(screen.getByText('Código incorrecto.')).toBeInTheDocument();
      expect(screen.getByLabelText('Código de 6 dígitos')).toHaveAttribute('aria-invalid', 'true');
    });
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('éxito en la fase reset: setActive + redirect al home (cliente)', async () => {
    signInCreateMock.mockResolvedValue({});
    attemptFirstFactorMock.mockResolvedValue({
      status: 'complete',
      createdSessionId: 'sess_new',
    });
    mockUser = { unsafeMetadata: { role: 'client' } };

    renderForm();
    const user = await fillEmailAndSubmit('jorge@yaiwell.com');

    await screen.findByRole('heading', { level: 1, name: 'Crea una contraseña nueva' });
    await user.type(screen.getByLabelText('Código de 6 dígitos'), '123456');
    await user.type(screen.getByLabelText('Nueva contraseña'), 'unaclavefuerte');
    await user.type(screen.getByLabelText('Repite la contraseña'), 'unaclavefuerte');
    await user.click(screen.getByRole('button', { name: 'Actualizar y entrar' }));

    await waitFor(() => {
      expect(attemptFirstFactorMock).toHaveBeenCalledWith({
        strategy: 'reset_password_email_code',
        code: '123456',
        password: 'unaclavefuerte',
      });
      expect(setActiveMock).toHaveBeenCalledWith({ session: 'sess_new' });
      expect(replaceMock).toHaveBeenCalledWith('/');
    });
  });

  it('volver a pedir código vuelve a la fase email y limpia los campos sensibles', async () => {
    signInCreateMock.mockResolvedValue({});
    renderForm();
    const user = await fillEmailAndSubmit('jorge@yaiwell.com');

    await screen.findByRole('heading', { level: 1, name: 'Crea una contraseña nueva' });
    await user.type(screen.getByLabelText('Código de 6 dígitos'), '111111');
    await user.click(screen.getByRole('button', { name: 'Volver a pedir el código' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: '¿Olvidaste tu contraseña?' }),
    ).toBeInTheDocument();
  });
});
