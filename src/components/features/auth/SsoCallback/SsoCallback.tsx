'use client';

import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ssoCallbackStyles as s } from './SsoCallback.styles';
import type { SsoCallbackProps } from './SsoCallback.types';

/**
 * Pantalla de vuelta de Google: Clerk termina el OAuth, activa la
 * sesión y navega al destino.
 *
 * Si la cuenta no existía y se entró desde `/entrar`, Clerk la crea
 * aquí mismo (transferencia de sign-in a sign-up); si existía y se
 * entró desde `/registro`, hace lo contrario. Si a Clerk le faltara
 * algún dato obligatorio, manda a `/registro` para completarlo.
 */
export function SsoCallback({ completeUrl, signInUrl, signUpUrl }: SsoCallbackProps) {
  const t = useTranslations('googleAuth.callback');

  return (
    <section className={s.root} role="status" aria-live="polite" data-component="sso-callback">
      <Loader2 className={s.spinner} aria-hidden="true" />
      <h1 className={s.title}>{t('title')}</h1>
      <p className={s.description}>{t('description')}</p>
      <AuthenticateWithRedirectCallback
        signInFallbackRedirectUrl={completeUrl}
        signUpFallbackRedirectUrl={completeUrl}
        signInUrl={signInUrl}
        signUpUrl={signUpUrl}
        continueSignUpUrl={signUpUrl}
      />
      {/* Contenedor del captcha anti-bots de Clerk: si la transferencia
          a sign-up lo pide y no existe, el alta falla en silencio. */}
      <div id="clerk-captcha" />
    </section>
  );
}
