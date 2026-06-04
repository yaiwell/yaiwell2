import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as NextIntlNav from '@/i18n/navigation';

import { SignInForm } from './SignInForm';

/**
 * Mock del router de next-intl: queremos verificar que el submit
 * navega al destino correcto sin levantar Next.js real en el test.
 */
const replaceMock = vi.fn();
vi.mock('@/i18n/navigation', async () => {
  const actual = await vi.importActual<typeof NextIntlNav>('@/i18n/navigation');
  return {
    ...actual,
    useRouter: () => ({
      push: vi.fn(),
      replace: replaceMock,
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    }),
  };
});

/**
 * Mock del SDK de Clerk: exponemos `useSignIn` y `useUser` con
 * implementaciones controladas desde cada test. `signInCreateMock`
 * y `setActiveMock` se resetean en `beforeEach`.
 */
const signInCreateMock = vi.fn();
const setActiveMock = vi.fn();
let mockUser: { publicMetadata?: { role?: string }; unsafeMetadata?: { role?: string } } | null =
  null;

vi.mock('@clerk/nextjs', () => ({
  useUser: () => ({ user: mockUser, isLoaded: true, isSignedIn: mockUser !== null }),
}));

vi.mock('@clerk/nextjs/legacy', () => ({
  useSignIn: () => ({
    isLoaded: true,
    signIn: { create: signInCreateMock },
    setActive: setActiveMock,
  }),
}));

/**
 * Mensajes mínimos del namespace `signIn` usados por el componente.
 * Mantenemos solo lo necesario para los tests; si añadimos copy al
 * componente este mock crecerá en consecuencia.
 */
const messages = {
  signIn: {
    meta: { title: 'Entrar', description: 'Accede a tu cuenta.' },
    title: 'Entra en Yaiwell',
    subtitle: 'Reserva belleza y bienestar en segundos.',
    aside: {
      badge: 'Acceso',
      title: 'Tu agenda contigo.',
      subtitle: 'Gestiona tus reservas.',
      bullet1: 'Disponibilidad real.',
      bullet2: 'Cancelación gratuita hasta 2h antes.',
    },
    tabs: {
      ariaLabel: 'Tipo de cuenta',
      client: 'Soy cliente',
      provider: 'Soy profesional',
      clientDescription: 'Acceso cliente.',
      providerDescription: 'Acceso profesional.',
    },
    fields: {
      emailLabel: 'Email',
      emailPlaceholder: 'tu@email.com',
      passwordLabel: 'Contraseña',
      passwordPlaceholder: 'Tu contraseña',
      remember: 'Recordarme',
      forgot: '¿Olvidaste tu contraseña?',
    },
    actions: { submit: 'Entrar', submitting: 'Entrando…' },
    divider: 'o continúa con',
    social: {
      google: 'Google',
      googleAria: 'Google (próximamente)',
      apple: 'Apple',
      appleAria: 'Apple (próximamente)',
      comingSoon: 'Próximamente',
    },
    footer: { noAccount: '¿No tienes cuenta?', createOne: 'Crea una' },
    errors: {
      emailRequired: 'Introduce tu email para continuar.',
      emailInvalid: 'Ese email no parece válido.',
      passwordRequired: 'Introduce tu contraseña.',
      invalidCredentials: 'Email o contraseña incorrectos.',
      tooManyAttempts: 'Demasiados intentos. Espera unos minutos.',
      sessionExists: 'Ya hay una sesión activa.',
      networkError: 'No hemos podido conectar. Revisa tu conexión.',
      unknown: 'Algo no ha ido bien. Inténtalo de nuevo.',
    },
  },
};

function renderForm() {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <SignInForm />
    </NextIntlClientProvider>,
  );
}

/**
 * Helper: simula un error con la forma estándar del SDK de Clerk
 * (`{ errors: [{ code }] }`) que es lo que consume `mapClerkError`.
 */
function clerkError(code: string) {
  return { errors: [{ code, message: code }] };
}

describe('SignInForm', () => {
  beforeEach(() => {
    replaceMock.mockClear();
    signInCreateMock.mockReset();
    setActiveMock.mockReset();
    mockUser = null;
  });

  it('renderiza encabezado, tabs cliente/proveedor y campos básicos', () => {
    renderForm();

    expect(screen.getByRole('heading', { level: 1, name: 'Entra en Yaiwell' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Soy cliente' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Soy profesional' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
  });

  it('muestra error local si se envía con el email vacío sin pegar a Clerk', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Introduce tu email para continuar.');
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(signInCreateMock).not.toHaveBeenCalled();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('navega a "/" tras un sign-in completo como cliente', async () => {
    const user = userEvent.setup();
    signInCreateMock.mockResolvedValue({ status: 'complete', createdSessionId: 'sess_1' });
    mockUser = { publicMetadata: { role: 'client' } };

    renderForm();
    await user.type(screen.getByLabelText('Email'), 'jorge@yaiwell.com');
    await user.type(screen.getByLabelText('Contraseña'), 'super-secret');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(signInCreateMock).toHaveBeenCalledWith({
        identifier: 'jorge@yaiwell.com',
        password: 'super-secret',
      });
      expect(setActiveMock).toHaveBeenCalledWith({ session: 'sess_1' });
      expect(replaceMock).toHaveBeenCalledWith('/');
    });
  });

  it('navega a "/panel" si el rol del usuario es provider', async () => {
    const user = userEvent.setup();
    signInCreateMock.mockResolvedValue({ status: 'complete', createdSessionId: 'sess_p' });
    mockUser = { publicMetadata: { role: 'provider' } };

    renderForm();
    await user.type(screen.getByLabelText('Email'), 'centro@yaiwell.com');
    await user.type(screen.getByLabelText('Contraseña'), 'pw-12345678');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/panel');
    });
  });

  it('mapea form_password_incorrect a invalidCredentials', async () => {
    const user = userEvent.setup();
    signInCreateMock.mockRejectedValue(clerkError('form_password_incorrect'));

    renderForm();
    await user.type(screen.getByLabelText('Email'), 'jorge@yaiwell.com');
    await user.type(screen.getByLabelText('Contraseña'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Email o contraseña incorrectos.');
    });
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('mapea too_many_requests a tooManyAttempts', async () => {
    const user = userEvent.setup();
    signInCreateMock.mockRejectedValue(clerkError('too_many_requests'));

    renderForm();
    await user.type(screen.getByLabelText('Email'), 'jorge@yaiwell.com');
    await user.type(screen.getByLabelText('Contraseña'), 'whatever');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Demasiados intentos. Espera unos minutos.',
      );
    });
  });

  it('mapea un TypeError de red a networkError', async () => {
    const user = userEvent.setup();
    signInCreateMock.mockRejectedValue(new TypeError('Failed to fetch'));

    renderForm();
    await user.type(screen.getByLabelText('Email'), 'jorge@yaiwell.com');
    await user.type(screen.getByLabelText('Contraseña'), 'whatever');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'No hemos podido conectar. Revisa tu conexión.',
      );
    });
  });
});
