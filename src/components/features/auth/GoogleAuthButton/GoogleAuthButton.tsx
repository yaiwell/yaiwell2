'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { useGoogleAuth } from './GoogleAuthButton.logic';
import { googleAuthButtonStyles as s } from './GoogleAuthButton.styles';
import type { GoogleAuthButtonProps } from './GoogleAuthButton.types';

/** Logo «G» multicolor de Google, como piden sus pautas para botones de acceso. */
function GoogleLogo() {
  return (
    <svg className={s.logo} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3a7.16 7.16 0 0 1-10.68-3.77H1.37v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.38 14.32a7.2 7.2 0 0 1 0-4.64v-3.1H1.37a12 12 0 0 0 0 10.84l4.01-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.6 4.59 1.8l3.44-3.44A11.97 11.97 0 0 0 1.37 6.58l4.01 3.1A7.16 7.16 0 0 1 12 4.77Z"
      />
    </svg>
  );
}

/**
 * Botón «Continuar con Google» de `/entrar` y `/registro`.
 *
 * La lógica (Clerk, URLs de vuelta, datos de alta) vive en
 * `useGoogleAuth`; aquí solo la UI. En `/entrar` añade una nota: si
 * quien entra no tiene cuenta, Clerk la crea como cliente (las cuentas
 * de profesional se crean desde `/registro`).
 */
export function GoogleAuthButton(props: GoogleAuthButtonProps) {
  const t = useTranslations('googleAuth');
  const { start, isReady, isRedirecting, errorCode } = useGoogleAuth(props);
  const noteId = useId();
  const showNote = props.mode === 'signIn';

  return (
    <div className={s.root}>
      <button
        type="button"
        className={s.button}
        onClick={start}
        disabled={!isReady || isRedirecting}
        aria-busy={isRedirecting}
        aria-describedby={showNote ? noteId : undefined}
        data-component={`${props.mode === 'signIn' ? 'sign-in' : 'sign-up'}-social-google`}
      >
        {isRedirecting ? <Loader2 className={s.spinner} aria-hidden="true" /> : <GoogleLogo />}
        {isRedirecting ? t('redirecting') : t('continue')}
      </button>
      {errorCode && (
        <p role="alert" className={s.error} data-component="google-auth-error">
          {t(`errors.${errorCode}`)}
        </p>
      )}
      {showNote && (
        <p id={noteId} className={s.note}>
          {t('signInNote')}
        </p>
      )}
      {/* Contenedor del captcha anti-bots de Clerk para el alta con Google. */}
      {props.mode === 'signUp' && <div id="clerk-captcha" />}
    </div>
  );
}
