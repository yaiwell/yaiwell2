import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Mock del router de `@/i18n/navigation` antes de importar el componente.
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
 * Mock del SDK de Clerk: `useSignUp` y `useUser` con implementaciones
 * controladas desde cada test.
 */
const signUpCreateMock = vi.fn();
const prepareVerificationMock = vi.fn();
const attemptVerificationMock = vi.fn();
const setActiveMock = vi.fn();
let mockUser: { publicMetadata?: { role?: string }; unsafeMetadata?: { role?: string } } | null =
  null;

vi.mock('@clerk/nextjs', () => ({
  useUser: () => ({ user: mockUser, isLoaded: true, isSignedIn: mockUser !== null }),
}));

vi.mock('@clerk/nextjs/legacy', () => ({
  useSignUp: () => ({
    isLoaded: true,
    signUp: {
      create: signUpCreateMock,
      prepareEmailAddressVerification: prepareVerificationMock,
      attemptEmailAddressVerification: attemptVerificationMock,
    },
    setActive: setActiveMock,
  }),
}));

import { SignUpForm } from './SignUpForm';

const messages = {
  signUp: {
    eyebrow: 'Crea tu cuenta',
    title: 'Da el primer paso',
    subtitle: 'Reserva en segundos.',
    tabs: { client: 'Soy cliente', provider: 'Soy profesional' },
    fields: {
      fullName: 'Nombre',
      contactName: 'Nombre del responsable',
      businessName: 'Nombre del centro',
      email: 'Email',
      password: 'Contraseña',
      passwordRepeat: 'Repite la contraseña',
    },
    verificationNotice: 'Verificaremos tus datos antes de publicarte.',
    termsLabel: 'Acepto los <terms>términos</terms> y la <privacy>privacidad</privacy>.',
    cta: { submit: 'Crear cuenta', submitting: 'Creando…' },
    socialDivider: 'o regístrate con',
    social: { google: 'Google', apple: 'Apple' },
    haveAccount: '¿Ya tienes cuenta? <link>Entra</link>',
    illustration: {
      badge: 'Yaiwell',
      title: 'Belleza para hoy',
      subtitle: 'Profesionales cerca de ti.',
      footer: '© Yaiwell',
    },
    verification: {
      eyebrow: 'Verificación',
      title: 'Confirma tu email',
      subtitle: 'Te hemos enviado un código a {email}.',
      codeLabel: 'Código de 6 dígitos',
      submit: 'Confirmar',
      submitting: 'Confirmando…',
      back: 'Volver y cambiar el email',
    },
    errors: {
      required: 'Campo obligatorio.',
      fullNameMin: 'Mínimo 2 caracteres.',
      businessNameMin: 'Mínimo 2 caracteres.',
      emailInvalid: 'Email no válido.',
      passwordShort: 'Mínimo 8 caracteres.',
      passwordMismatch: 'Las contraseñas no coinciden.',
      termsRequired: 'Debes aceptar los términos.',
      emailAlreadyExists: 'Ese email ya tiene cuenta.',
      passwordCompromised: 'Esa contraseña es insegura.',
      verificationCodeInvalid: 'Código incorrecto.',
      verificationCodeExpired: 'El código ha expirado.',
      invalidCredentials: 'Credenciales inválidas.',
      tooManyAttempts: 'Demasiados intentos.',
      sessionExists: 'Ya hay una sesión activa.',
      networkError: 'No hemos podido conectar.',
      unknown: 'Algo no ha ido bien.',
    },
  },
};

function renderForm() {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <SignUpForm />
    </NextIntlClientProvider>,
  );
}

function clerkError(code: string) {
  return { errors: [{ code, message: code }] };
}

describe('SignUpForm', () => {
  beforeEach(() => {
    replaceMock.mockClear();
    signUpCreateMock.mockReset();
    prepareVerificationMock.mockReset();
    attemptVerificationMock.mockReset();
    setActiveMock.mockReset();
    mockUser = null;
  });

  it('renderiza el título y los campos básicos en el rol cliente', () => {
    renderForm();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Da el primer paso' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    expect(screen.getByLabelText('Repite la contraseña')).toBeInTheDocument();
    expect(screen.queryByLabelText('Nombre del centro')).not.toBeInTheDocument();
  });

  it('muestra error local de contraseña corta sin pegar a Clerk', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText('Nombre'), 'Jorge');
    await user.type(screen.getByLabelText('Email'), 'jorge@yaiwell.com');
    await user.type(screen.getByLabelText('Contraseña'), 'abc');
    await user.type(screen.getByLabelText('Repite la contraseña'), 'abc');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByText('Mínimo 8 caracteres.')).toBeInTheDocument();
    expect(signUpCreateMock).not.toHaveBeenCalled();
  });

  it('muestra error si las contraseñas no coinciden', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText('Nombre'), 'Jorge');
    await user.type(screen.getByLabelText('Email'), 'jorge@yaiwell.com');
    await user.type(screen.getByLabelText('Contraseña'), 'unaclavefuerte');
    await user.type(screen.getByLabelText('Repite la contraseña'), 'otraclavefuerte');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByText('Las contraseñas no coinciden.')).toBeInTheDocument();
    expect(signUpCreateMock).not.toHaveBeenCalled();
  });

  it('tras submit válido pasa a la fase de verificación', async () => {
    const user = userEvent.setup();
    signUpCreateMock.mockResolvedValue({});
    prepareVerificationMock.mockResolvedValue({});

    renderForm();
    await user.type(screen.getByLabelText('Nombre'), 'Jorge');
    await user.type(screen.getByLabelText('Email'), 'jorge@yaiwell.com');
    await user.type(screen.getByLabelText('Contraseña'), 'unaclavefuerte');
    await user.type(screen.getByLabelText('Repite la contraseña'), 'unaclavefuerte');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() => {
      expect(signUpCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          emailAddress: 'jorge@yaiwell.com',
          password: 'unaclavefuerte',
          unsafeMetadata: expect.objectContaining({ role: 'client', fullName: 'Jorge' }),
        }),
      );
      expect(prepareVerificationMock).toHaveBeenCalledWith({ strategy: 'email_code' });
      expect(
        screen.getByRole('heading', { level: 1, name: 'Confirma tu email' }),
      ).toBeInTheDocument();
    });
  });

  it('mapea form_identifier_exists a emailAlreadyExists ancla al campo email', async () => {
    const user = userEvent.setup();
    signUpCreateMock.mockRejectedValue(clerkError('form_identifier_exists'));

    renderForm();
    await user.type(screen.getByLabelText('Nombre'), 'Jorge');
    await user.type(screen.getByLabelText('Email'), 'duplicado@yaiwell.com');
    await user.type(screen.getByLabelText('Contraseña'), 'unaclavefuerte');
    await user.type(screen.getByLabelText('Repite la contraseña'), 'unaclavefuerte');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() => {
      expect(screen.getByText('Ese email ya tiene cuenta.')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    });
  });

  it('mapea form_password_pwned a passwordCompromised ancla al campo password', async () => {
    const user = userEvent.setup();
    signUpCreateMock.mockRejectedValue(clerkError('form_password_pwned'));

    renderForm();
    await user.type(screen.getByLabelText('Nombre'), 'Jorge');
    await user.type(screen.getByLabelText('Email'), 'jorge@yaiwell.com');
    await user.type(screen.getByLabelText('Contraseña'), 'unaclavefuerte');
    await user.type(screen.getByLabelText('Repite la contraseña'), 'unaclavefuerte');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() => {
      expect(screen.getByText('Esa contraseña es insegura.')).toBeInTheDocument();
    });
  });

  it('en verificación: código incorrecto muestra error sin redirigir', async () => {
    const user = userEvent.setup();
    signUpCreateMock.mockResolvedValue({});
    prepareVerificationMock.mockResolvedValue({});
    attemptVerificationMock.mockRejectedValue(clerkError('form_code_incorrect'));

    renderForm();
    await user.type(screen.getByLabelText('Nombre'), 'Jorge');
    await user.type(screen.getByLabelText('Email'), 'jorge@yaiwell.com');
    await user.type(screen.getByLabelText('Contraseña'), 'unaclavefuerte');
    await user.type(screen.getByLabelText('Repite la contraseña'), 'unaclavefuerte');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await screen.findByRole('heading', { level: 1, name: 'Confirma tu email' });

    await user.type(screen.getByLabelText('Código de 6 dígitos'), '000000');
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => {
      expect(screen.getByText('Código incorrecto.')).toBeInTheDocument();
    });
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('en verificación: éxito completa la sesión y redirige según rol', async () => {
    const user = userEvent.setup();
    signUpCreateMock.mockResolvedValue({});
    prepareVerificationMock.mockResolvedValue({});
    attemptVerificationMock.mockResolvedValue({ status: 'complete', createdSessionId: 'sess_new' });
    mockUser = { unsafeMetadata: { role: 'client' } };

    renderForm();
    await user.type(screen.getByLabelText('Nombre'), 'Jorge');
    await user.type(screen.getByLabelText('Email'), 'jorge@yaiwell.com');
    await user.type(screen.getByLabelText('Contraseña'), 'unaclavefuerte');
    await user.type(screen.getByLabelText('Repite la contraseña'), 'unaclavefuerte');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await screen.findByRole('heading', { level: 1, name: 'Confirma tu email' });

    await user.type(screen.getByLabelText('Código de 6 dígitos'), '123456');
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => {
      expect(attemptVerificationMock).toHaveBeenCalledWith({ code: '123456' });
      expect(setActiveMock).toHaveBeenCalledWith({ session: 'sess_new' });
      expect(replaceMock).toHaveBeenCalledWith('/');
    });
  });
});
