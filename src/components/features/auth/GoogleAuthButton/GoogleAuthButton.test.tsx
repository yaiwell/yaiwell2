import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import messages from '@/messages/es.json';

import { GoogleAuthButton } from './GoogleAuthButton';
import { buildGoogleRedirectUrls } from './GoogleAuthButton.logic';

const signInRedirect = vi.fn();
const signUpRedirect = vi.fn();

vi.mock('@clerk/nextjs/legacy', () => ({
  useSignIn: () => ({ isLoaded: true, signIn: { authenticateWithRedirect: signInRedirect } }),
  useSignUp: () => ({ isLoaded: true, signUp: { authenticateWithRedirect: signUpRedirect } }),
}));

function renderButton(props: Parameters<typeof GoogleAuthButton>[0]) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <GoogleAuthButton {...props} />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  signInRedirect.mockReset().mockResolvedValue(undefined);
  signUpRedirect.mockReset().mockResolvedValue(undefined);
});

describe('buildGoogleRedirectUrls', () => {
  it('vuelve por /sso-callback y termina en /entrar con el idioma', () => {
    expect(buildGoogleRedirectUrls('ca')).toEqual({
      callbackUrl: '/ca/sso-callback',
      completeUrl: '/ca/entrar',
    });
  });

  it('conserva el redirect_url de una reserva a medias', () => {
    const { callbackUrl, completeUrl } = buildGoogleRedirectUrls('es', '/centro/spa-1/reservar');
    expect(callbackUrl).toBe('/es/sso-callback?redirect_url=%2Fcentro%2Fspa-1%2Freservar');
    expect(completeUrl).toBe('/es/entrar?redirect_url=%2Fcentro%2Fspa-1%2Freservar');
  });
});

describe('GoogleAuthButton', () => {
  it('en /entrar lanza el OAuth de Google con el aviso de condiciones aceptado', async () => {
    renderButton({ mode: 'signIn' });

    fireEvent.click(screen.getByRole('button', { name: 'Continuar con Google' }));

    await waitFor(() =>
      expect(signInRedirect).toHaveBeenCalledWith({
        strategy: 'oauth_google',
        redirectUrl: '/es/sso-callback',
        redirectUrlComplete: '/es/entrar',
        legalAccepted: true,
      }),
    );
    expect(screen.getByText(/crearemos una de cliente/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abriendo Google…' })).toHaveAccessibleDescription(
      /Al continuar aceptas las condiciones de uso y la política de privacidad/,
    );
  });

  it('en /registro manda el rol y las condiciones aceptadas', async () => {
    renderButton({
      mode: 'signUp',
      prepareSignUp: () => ({ unsafeMetadata: { role: 'provider', businessName: 'Studio Luz' } }),
    });

    fireEvent.click(screen.getByRole('button', { name: 'Continuar con Google' }));

    await waitFor(() =>
      expect(signUpRedirect).toHaveBeenCalledWith(
        expect.objectContaining({
          strategy: 'oauth_google',
          unsafeMetadata: { role: 'provider', businessName: 'Studio Luz' },
          legalAccepted: true,
        }),
      ),
    );
  });

  it('no sale de la página si el formulario de alta no está completo', () => {
    renderButton({ mode: 'signUp', prepareSignUp: () => null });

    fireEvent.click(screen.getByRole('button', { name: 'Continuar con Google' }));

    expect(signUpRedirect).not.toHaveBeenCalled();
  });

  it('si Clerk falla (p. ej. Google sin activar) avisa y deja reintentar', async () => {
    signInRedirect.mockRejectedValueOnce({ errors: [{ code: 'strategy_for_user_invalid' }] });
    renderButton({ mode: 'signIn' });

    fireEvent.click(screen.getByRole('button', { name: 'Continuar con Google' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No hemos podido conectar con Google',
    );
    expect(screen.getByRole('button', { name: 'Continuar con Google' })).toBeEnabled();
  });
});
