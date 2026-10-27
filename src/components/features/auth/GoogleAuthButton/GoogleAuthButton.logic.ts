'use client';

import { useSignIn, useSignUp } from '@clerk/nextjs/legacy';
import { useLocale } from 'next-intl';
import { useCallback, useState } from 'react';

import { getPathname } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { mapClerkError } from '@/lib/auth';
// Import directo, no al barrel `@/lib/validation`: arrastra Prisma al bundle cliente.
import { REDIRECT_URL_PARAM } from '@/lib/validation/redirect-url';

import type { GoogleAuthButtonProps, GoogleAuthErrorCode } from './GoogleAuthButton.types';

/** Estrategia OAuth de Clerk para Google. */
const GOOGLE_STRATEGY = 'oauth_google';

/**
 * Construye las dos URLs del viaje a Google: la página que procesa la
 * vuelta (`/sso-callback`) y el destino final.
 *
 * El destino final es `/entrar`: su guard de servidor ya manda a cada
 * usuario con sesión a su área según el rol (cliente → `redirect_url` o
 * inicio, proveedor → panel u onboarding). Así no duplicamos esa
 * decisión en el cliente.
 */
export function buildGoogleRedirectUrls(locale: AppLocale, redirectUrl?: string | null) {
  const query = redirectUrl ? { [REDIRECT_URL_PARAM]: redirectUrl } : undefined;
  return {
    callbackUrl: getPathname({ href: { pathname: '/sso-callback', query }, locale }),
    completeUrl: getPathname({ href: { pathname: '/entrar', query }, locale }),
  };
}

/**
 * Hook del botón «Continuar con Google».
 *
 * Lanza el OAuth de Clerk por redirección (no popup: los bloqueadores
 * de ventanas y Safari en iOS lo rompen). En `signUp` añade el rol y,
 * si aplica, los datos del negocio, para que la cuenta nazca igual que
 * con el alta por email. `legalAccepted` se manda en `signUp` cuando el
 * formulario ha comprobado la casilla, y en `signIn` porque el botón
 * lleva el aviso de aceptación junto a él.
 */
export function useGoogleAuth({ mode, redirectUrl, prepareSignUp }: GoogleAuthButtonProps) {
  const locale = useLocale() as AppLocale;
  const { signIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [errorCode, setErrorCode] = useState<GoogleAuthErrorCode | null>(null);

  const isReady = mode === 'signIn' ? signInLoaded : signUpLoaded;

  const start = useCallback(async () => {
    if (isRedirecting) return;
    setErrorCode(null);

    const { callbackUrl, completeUrl } = buildGoogleRedirectUrls(locale, redirectUrl);
    const base = {
      strategy: GOOGLE_STRATEGY,
      redirectUrl: callbackUrl,
      redirectUrlComplete: completeUrl,
    } as const;

    try {
      if (mode === 'signUp') {
        const params = prepareSignUp?.();
        if (!params || !signUp) return;
        setIsRedirecting(true);
        await signUp.authenticateWithRedirect({
          ...base,
          unsafeMetadata: params.unsafeMetadata,
          legalAccepted: true,
        });
        return;
      }

      if (!signIn) return;
      setIsRedirecting(true);
      // En `/entrar` el botón lleva el aviso «al continuar aceptas las
      // condiciones»: si la cuenta no existe y Clerk la crea por
      // transferencia, queda registrado el consentimiento.
      await signIn.authenticateWithRedirect({ ...base, legalAccepted: true });
    } catch (err) {
      // Si Google no está activado en Clerk o falla la red, el SDK lanza
      // antes de salir de la página: volvemos a dejar el botón usable.
      setErrorCode(mapClerkError(err) === 'networkError' ? 'networkError' : 'unknown');
      setIsRedirecting(false);
    }
  }, [isRedirecting, locale, mode, prepareSignUp, redirectUrl, signIn, signUp]);

  return { start, isReady, isRedirecting, errorCode };
}
