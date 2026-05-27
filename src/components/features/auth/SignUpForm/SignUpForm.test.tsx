import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

/**
 * Mock del router de `@/i18n/navigation` antes de importar el componente.
 *
 * Esto nos permite verificar que el submit dispara `router.push('/')`
 * para el rol cliente sin necesidad de un entorno Next.js completo.
 */
const pushMock = vi.fn();
vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  Link: ({ children, ...rest }: ComponentProps<'a'>) => <a {...rest}>{children}</a>,
}));

import { SignUpForm } from './SignUpForm';

// Mensajes mínimos para que `useTranslations('signUp')` resuelva.
// Reflejan la estructura real del JSON de i18n.
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
      badge: 'Beauly',
      title: 'Belleza para hoy',
      subtitle: 'Profesionales cerca de ti.',
      footer: '© Beauly',
    },
    errors: {
      required: 'Campo obligatorio.',
      fullNameMin: 'Mínimo 2 caracteres.',
      businessNameMin: 'Mínimo 2 caracteres.',
      emailInvalid: 'Email no válido.',
      passwordShort: 'Mínimo 8 caracteres.',
      passwordMismatch: 'Las contraseñas no coinciden.',
      termsRequired: 'Debes aceptar los términos.',
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

describe('SignUpForm', () => {
  it('renderiza el título y los campos básicos en el rol cliente', () => {
    renderForm();

    expect(screen.getByRole('heading', { level: 1, name: 'Da el primer paso' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    expect(screen.getByLabelText('Repite la contraseña')).toBeInTheDocument();
    // El campo de nombre de centro NO debe aparecer en el rol cliente.
    expect(screen.queryByLabelText('Nombre del centro')).not.toBeInTheDocument();
  });

  it('muestra error si la contraseña es demasiado corta', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText('Nombre'), 'Jorge');
    await user.type(screen.getByLabelText('Email'), 'jorge@beauly.com');
    await user.type(screen.getByLabelText('Contraseña'), 'abc');
    await user.type(screen.getByLabelText('Repite la contraseña'), 'abc');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByText('Mínimo 8 caracteres.')).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('muestra error si la repetición de contraseña no coincide', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText('Nombre'), 'Jorge');
    await user.type(screen.getByLabelText('Email'), 'jorge@beauly.com');
    await user.type(screen.getByLabelText('Contraseña'), 'unaclavefuerte');
    await user.type(screen.getByLabelText('Repite la contraseña'), 'otraclavefuerte');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByText('Las contraseñas no coinciden.')).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('al enviar datos válidos como cliente redirige a "/"', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    pushMock.mockClear();
    renderForm();

    await user.type(screen.getByLabelText('Nombre'), 'Jorge');
    await user.type(screen.getByLabelText('Email'), 'jorge@beauly.com');
    await user.type(screen.getByLabelText('Contraseña'), 'unaclavefuerte');
    await user.type(screen.getByLabelText('Repite la contraseña'), 'unaclavefuerte');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    // Avanzamos el delay simulado del submit (800ms en el hook).
    await vi.advanceTimersByTimeAsync(1000);

    expect(pushMock).toHaveBeenCalledWith('/');
    vi.useRealTimers();
  });
});
