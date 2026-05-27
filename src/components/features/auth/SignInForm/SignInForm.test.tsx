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
const pushMock = vi.fn();
vi.mock('@/i18n/navigation', async () => {
  const actual = await vi.importActual<typeof NextIntlNav>('@/i18n/navigation');
  return {
    ...actual,
    useRouter: () => ({
      push: pushMock,
      replace: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    }),
  };
});

/**
 * Mensajes mínimos del namespace `signIn` usados por el componente.
 * Mantenemos sólo lo necesario para los tests: si añadimos copy al
 * componente y se rompe, este mock crecerá en consecuencia.
 */
const messages = {
  signIn: {
    meta: {
      title: 'Entrar · Beauly',
      description: 'Accede a tu cuenta Beauly.',
    },
    title: 'Entra en Beauly',
    subtitle: 'Reserva belleza y bienestar en segundos.',
    aside: {
      badge: 'Acceso',
      title: 'Tu agenda contigo a todas partes.',
      subtitle: 'Gestiona tus reservas y descubre profesionales cerca.',
      bullet1: 'Disponibilidad real en tiempo real.',
      bullet2: 'Cancelación gratuita hasta 2h antes.',
    },
    tabs: {
      ariaLabel: 'Tipo de cuenta',
      client: 'Soy cliente',
      provider: 'Soy profesional',
      clientDescription: 'Acceso al área cliente.',
      providerDescription: 'Acceso al panel del centro.',
    },
    fields: {
      emailLabel: 'Email',
      emailPlaceholder: 'tu@email.com',
      passwordLabel: 'Contraseña',
      passwordPlaceholder: 'Tu contraseña',
      remember: 'Recordarme',
      forgot: '¿Olvidaste tu contraseña?',
    },
    actions: {
      submit: 'Entrar',
      submitting: 'Entrando…',
    },
    divider: 'o continúa con',
    social: {
      google: 'Google',
      googleAria: 'Continuar con Google (próximamente)',
      apple: 'Apple',
      appleAria: 'Continuar con Apple (próximamente)',
      comingSoon: 'Próximamente',
    },
    footer: {
      noAccount: '¿No tienes cuenta?',
      createOne: 'Crea una',
    },
    errors: {
      emailRequired: 'Introduce tu email para continuar.',
      emailInvalid: 'Ese email no parece válido.',
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

describe('SignInForm', () => {
  beforeEach(() => {
    pushMock.mockClear();
  });

  it('renderiza encabezado, tabs cliente/proveedor y campos básicos', () => {
    renderForm();

    // El título h1 es la entrada visible principal.
    expect(screen.getByRole('heading', { level: 1, name: 'Entra en Beauly' })).toBeInTheDocument();

    // Las dos pestañas existen y son accesibles por rol.
    expect(screen.getByRole('tab', { name: 'Soy cliente' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Soy profesional' })).toBeInTheDocument();

    // Inputs principales.
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
  });

  it('muestra error de validación si se envía con el email vacío', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    // El alert con el mensaje de "email requerido" debe aparecer y el
    // input quedar marcado como inválido para tecnologías asistivas.
    expect(screen.getByRole('alert')).toHaveTextContent('Introduce tu email para continuar.');
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('navega a "/" tras un submit válido como cliente', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText('Email'), 'jorge@beauly.com');
    await user.type(screen.getByLabelText('Contraseña'), 'super-secret');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    // El submit es asíncrono por el delay mock; esperamos a que el
    // router haya recibido el push antes de afirmar.
    await screen.findByRole('button', { name: 'Entrando…' });

    // Esperamos a que se resuelva la promesa de 600 ms del logic.
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/');
    });
  });
});
