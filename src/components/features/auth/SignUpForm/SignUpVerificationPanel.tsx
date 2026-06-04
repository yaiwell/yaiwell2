'use client';

import type { useTranslations } from 'next-intl';

import type { AuthErrorCode } from '@/lib/auth';

import { signUpFormStyles as s } from './SignUpForm.styles';
import { SIGN_UP_FIELD_IDS } from './SignUpForm.types';

/**
 * Panel de verificación por código OTP (fase 2 del alta).
 *
 * Vive entre `signUp.create` y `setActive`. Muestra el email al que
 * enviamos el código y un input de 6 dígitos. Si el usuario detecta
 * que el email estaba mal, puede volver a la fase form (esto descarta
 * el `signUp` pendiente; aceptable para MVP).
 *
 * El componente es presentacional puro: toda la lógica (estado del
 * código, `attemptEmailAddressVerification`, redirect) vive en el
 * hook `useSignUpForm` y se inyecta como props.
 */
export interface SignUpVerificationPanelProps {
  /** Traductor del namespace `signUp` (compartido con el form). */
  t: ReturnType<typeof useTranslations<'signUp'>>;
  /** Email al que se envió el código (solo informativo, no editable). */
  email: string;
  /** Código tecleado por el usuario (string, validamos longitud aquí). */
  verificationCode: string;
  /** Error global del intento de verificación, ya tipado. */
  rootError: AuthErrorCode | null;
  /** Mapeo exhaustivo código→copy construido en el padre con next-intl. */
  errorMessages: Record<AuthErrorCode, string>;
  /** Indica que la petición a Clerk está en vuelo. */
  isSubmitting: boolean;
  /** Setter del código (el padre filtra a dígitos antes de pasarlo). */
  setVerificationCode: (code: string) => void;
  /** Handler del submit del form interno. */
  submitVerification: (event: React.FormEvent<HTMLFormElement>) => void;
  /** Vuelta a la fase 1 si el usuario quiere corregir datos. */
  resetToForm: () => void;
}

export function SignUpVerificationPanel(props: SignUpVerificationPanelProps) {
  const {
    t,
    email,
    verificationCode,
    rootError,
    errorMessages,
    isSubmitting,
    setVerificationCode,
    submitVerification,
    resetToForm,
  } = props;

  return (
    <form
      className={s.verificationCard}
      onSubmit={submitVerification}
      data-component="sign-up-verification"
    >
      <header className={s.header}>
        <span className={s.eyebrow}>{t('verification.eyebrow')}</span>
        <h1 className={s.title}>{t('verification.title')}</h1>
        <p className={s.subtitle}>{t('verification.subtitle', { email })}</p>
      </header>

      {rootError ? (
        <p className={s.rootError} role="alert" data-component="sign-up-verification-error">
          {errorMessages[rootError]}
        </p>
      ) : null}

      <div className={s.field}>
        <label className={s.label} htmlFor={SIGN_UP_FIELD_IDS.verificationCode}>
          {t('verification.codeLabel')}
        </label>
        <input
          id={SIGN_UP_FIELD_IDS.verificationCode}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          pattern="[0-9]{6}"
          className={s.verificationCodeInput}
          value={verificationCode}
          // Filtramos a dígitos para que pegar un código con espacios
          // o caracteres invisibles no rompa la validación de longitud.
          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
          placeholder="••••••"
          data-component="sign-up-verification-input"
          aria-invalid={Boolean(rootError)}
        />
      </div>

      <div className={s.verificationActions}>
        <button
          type="submit"
          className={s.submit}
          disabled={isSubmitting}
          data-component="sign-up-verification-submit"
        >
          {isSubmitting ? t('verification.submitting') : t('verification.submit')}
        </button>
        <button
          type="button"
          className={s.verificationSecondary}
          onClick={resetToForm}
          data-component="sign-up-verification-back"
        >
          {t('verification.back')}
        </button>
      </div>
    </form>
  );
}
