'use client';

import { Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';

import { useResetPasswordForm } from './ResetPasswordForm.logic';
import { resetPasswordStyles as s } from './ResetPasswordForm.styles';
import { RESET_PASSWORD_FIELD_IDS, type ResetPasswordErrorCode } from './ResetPasswordForm.types';

/**
 * Formulario de recuperación de contraseña en dos fases.
 *
 * Fase 1 (request): pide email y dispara el envío del código por
 * parte de Clerk.
 * Fase 2 (reset): pide código + nueva contraseña; si Clerk valida
 * todo, `setActive` deja al usuario logueado y redirigimos a su
 * área según rol.
 *
 * La lógica completa vive en `useResetPasswordForm`; este componente
 * solo compone UI y traduce los códigos de error.
 */
export function ResetPasswordForm() {
  const t = useTranslations('resetPassword');

  const {
    phase,
    draft,
    errors,
    rootError,
    isSubmitting,
    success,
    updateField,
    submitRequest,
    submitReset,
    backToRequest,
  } = useResetPasswordForm();

  // Mapping exhaustivo código → copy. Si se añade un código nuevo al
  // union, TypeScript marca este Record como incompleto.
  const errorMessages: Record<ResetPasswordErrorCode, string> = {
    emailRequired: t('errors.emailRequired'),
    emailInvalid: t('errors.emailInvalid'),
    passwordRequired: t('errors.passwordRequired'),
    passwordTooShort: t('errors.passwordTooShort'),
    passwordMismatch: t('errors.passwordMismatch'),
    passwordCompromised: t('errors.passwordCompromised'),
    invalidCredentials: t('errors.invalidCredentials'),
    verificationCodeInvalid: t('errors.verificationCodeInvalid'),
    verificationCodeExpired: t('errors.verificationCodeExpired'),
    tooManyAttempts: t('errors.tooManyAttempts'),
    sessionExists: t('errors.sessionExists'),
    networkError: t('errors.networkError'),
    unknown: t('errors.unknown'),
  };

  return (
    <section className={s.root} data-component="reset-password-root">
      <div className={s.shell}>
        <div className={s.formColumn}>
          {phase === 'request' ? (
            <RequestPhase
              t={t}
              email={draft.email}
              emailError={errors.email ?? null}
              rootError={rootError}
              errorMessages={errorMessages}
              isSubmitting={isSubmitting}
              onEmailChange={(value) => updateField('email', value)}
              onSubmit={submitRequest}
            />
          ) : (
            <ResetPhase
              t={t}
              email={draft.email}
              code={draft.code}
              newPassword={draft.newPassword}
              newPasswordRepeat={draft.newPasswordRepeat}
              codeError={errors.code ?? null}
              newPasswordError={errors.newPassword ?? null}
              newPasswordRepeatError={errors.newPasswordRepeat ?? null}
              rootError={rootError}
              success={success}
              errorMessages={errorMessages}
              isSubmitting={isSubmitting}
              onCodeChange={(value) => updateField('code', value)}
              onNewPasswordChange={(value) => updateField('newPassword', value)}
              onNewPasswordRepeatChange={(value) => updateField('newPasswordRepeat', value)}
              onSubmit={submitReset}
              onBack={backToRequest}
            />
          )}
        </div>

        {/* Columna ilustrativa (solo desktop). Decorativa, sin texto
            crítico replicado de la columna principal. */}
        <aside className={s.illustration} aria-hidden="true">
          <span className={s.illustrationBlob1} />
          <span className={s.illustrationBlob2} />

          <span className={s.illustrationBadge}>
            <Sparkles className="size-3.5" />
            {t('illustration.badge')}
          </span>

          <div className="relative flex flex-col gap-3">
            <h2 className={s.illustrationTitle}>{t('illustration.title')}</h2>
            <p className={s.illustrationSubtitle}>{t('illustration.subtitle')}</p>
          </div>

          <p className={s.illustrationFooter}>{t('illustration.footer')}</p>
        </aside>
      </div>
    </section>
  );
}

interface RequestPhaseProps {
  t: ReturnType<typeof useTranslations<'resetPassword'>>;
  email: string;
  emailError: ResetPasswordErrorCode | null;
  rootError: ResetPasswordErrorCode | null;
  errorMessages: Record<ResetPasswordErrorCode, string>;
  isSubmitting: boolean;
  onEmailChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

/**
 * Subcomponente: fase 1 (pedir el código).
 * Se extrae para mantener el JSX principal corto.
 */
function RequestPhase(props: RequestPhaseProps) {
  const { t, email, emailError, rootError, errorMessages, isSubmitting, onEmailChange, onSubmit } =
    props;

  return (
    <>
      <header className={s.header}>
        <span className={s.eyebrow}>{t('request.eyebrow')}</span>
        <h1 className={s.title}>{t('request.title')}</h1>
        <p className={s.subtitle}>{t('request.subtitle')}</p>
      </header>

      <form
        className={s.form}
        onSubmit={onSubmit}
        noValidate
        data-component="reset-password-form-request"
      >
        {rootError ? (
          <p className={s.rootError} role="alert" data-component="reset-password-root-error">
            {errorMessages[rootError]}
          </p>
        ) : null}

        <div className={s.field}>
          <label className={s.label} htmlFor={RESET_PASSWORD_FIELD_IDS.email}>
            {t('request.emailLabel')}
          </label>
          <input
            id={RESET_PASSWORD_FIELD_IDS.email}
            type="email"
            autoComplete="email"
            inputMode="email"
            className={s.input}
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            aria-invalid={Boolean(emailError)}
            aria-describedby={emailError ? `${RESET_PASSWORD_FIELD_IDS.email}-error` : undefined}
            placeholder={t('request.emailPlaceholder')}
            required
            data-component="reset-password-input-email"
          />
          {emailError && (
            <span
              id={`${RESET_PASSWORD_FIELD_IDS.email}-error`}
              className={s.errorText}
              role="alert"
            >
              {errorMessages[emailError]}
            </span>
          )}
        </div>

        <button
          type="submit"
          className={s.submit}
          disabled={isSubmitting}
          data-component="reset-password-submit-request"
        >
          {isSubmitting ? t('request.submitting') : t('request.submit')}
        </button>

        <p className={s.footerNote}>
          {t.rich('request.backToSignIn', {
            link: (chunks) => (
              <Link
                href="/entrar"
                className={s.footerLink}
                data-component="reset-password-back-to-sign-in"
              >
                {chunks}
              </Link>
            ),
          })}
        </p>
      </form>
    </>
  );
}

interface ResetPhaseProps {
  t: ReturnType<typeof useTranslations<'resetPassword'>>;
  email: string;
  code: string;
  newPassword: string;
  newPasswordRepeat: string;
  codeError: ResetPasswordErrorCode | null;
  newPasswordError: ResetPasswordErrorCode | null;
  newPasswordRepeatError: ResetPasswordErrorCode | null;
  rootError: ResetPasswordErrorCode | null;
  success: boolean;
  errorMessages: Record<ResetPasswordErrorCode, string>;
  isSubmitting: boolean;
  onCodeChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onNewPasswordRepeatChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
}

/**
 * Subcomponente: fase 2 (introducir código + nueva contraseña).
 */
function ResetPhase(props: ResetPhaseProps) {
  const {
    t,
    email,
    code,
    newPassword,
    newPasswordRepeat,
    codeError,
    newPasswordError,
    newPasswordRepeatError,
    rootError,
    success,
    errorMessages,
    isSubmitting,
    onCodeChange,
    onNewPasswordChange,
    onNewPasswordRepeatChange,
    onSubmit,
    onBack,
  } = props;

  return (
    <>
      <header className={s.header}>
        <span className={s.eyebrow}>{t('reset.eyebrow')}</span>
        <h1 className={s.title}>{t('reset.title')}</h1>
        <p className={s.subtitle}>{t('reset.subtitle', { email })}</p>
      </header>

      <form
        className={s.form}
        onSubmit={onSubmit}
        noValidate
        data-component="reset-password-form-reset"
      >
        {success ? (
          <p className={s.successNote} role="status" data-component="reset-password-success">
            {t('reset.success')}
          </p>
        ) : null}

        {rootError && !success ? (
          <p className={s.rootError} role="alert" data-component="reset-password-root-error">
            {errorMessages[rootError]}
          </p>
        ) : null}

        <div className={s.field}>
          <label className={s.label} htmlFor={RESET_PASSWORD_FIELD_IDS.code}>
            {t('reset.codeLabel')}
          </label>
          <input
            id={RESET_PASSWORD_FIELD_IDS.code}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            pattern="[0-9]{6}"
            className={s.codeInput}
            value={code}
            // Filtramos a dígitos para que pegar un código con espacios
            // o caracteres invisibles no rompa la validación.
            onChange={(event) => onCodeChange(event.target.value.replace(/\D/g, ''))}
            aria-invalid={Boolean(codeError)}
            aria-describedby={codeError ? `${RESET_PASSWORD_FIELD_IDS.code}-error` : undefined}
            placeholder="••••••"
            data-component="reset-password-input-code"
          />
          {codeError && (
            <span
              id={`${RESET_PASSWORD_FIELD_IDS.code}-error`}
              className={s.errorText}
              role="alert"
            >
              {errorMessages[codeError]}
            </span>
          )}
        </div>

        <div className={s.fieldGrid}>
          <div className={s.field}>
            <label className={s.label} htmlFor={RESET_PASSWORD_FIELD_IDS.newPassword}>
              {t('reset.newPasswordLabel')}
            </label>
            <input
              id={RESET_PASSWORD_FIELD_IDS.newPassword}
              type="password"
              autoComplete="new-password"
              className={s.input}
              value={newPassword}
              onChange={(event) => onNewPasswordChange(event.target.value)}
              aria-invalid={Boolean(newPasswordError)}
              aria-describedby={
                newPasswordError ? `${RESET_PASSWORD_FIELD_IDS.newPassword}-error` : undefined
              }
              data-component="reset-password-input-new"
            />
            {newPasswordError && (
              <span
                id={`${RESET_PASSWORD_FIELD_IDS.newPassword}-error`}
                className={s.errorText}
                role="alert"
              >
                {errorMessages[newPasswordError]}
              </span>
            )}
          </div>
          <div className={s.field}>
            <label className={s.label} htmlFor={RESET_PASSWORD_FIELD_IDS.newPasswordRepeat}>
              {t('reset.newPasswordRepeatLabel')}
            </label>
            <input
              id={RESET_PASSWORD_FIELD_IDS.newPasswordRepeat}
              type="password"
              autoComplete="new-password"
              className={s.input}
              value={newPasswordRepeat}
              onChange={(event) => onNewPasswordRepeatChange(event.target.value)}
              aria-invalid={Boolean(newPasswordRepeatError)}
              aria-describedby={
                newPasswordRepeatError
                  ? `${RESET_PASSWORD_FIELD_IDS.newPasswordRepeat}-error`
                  : undefined
              }
              data-component="reset-password-input-new-repeat"
            />
            {newPasswordRepeatError && (
              <span
                id={`${RESET_PASSWORD_FIELD_IDS.newPasswordRepeat}-error`}
                className={s.errorText}
                role="alert"
              >
                {errorMessages[newPasswordRepeatError]}
              </span>
            )}
          </div>
        </div>

        <button
          type="submit"
          className={s.submit}
          disabled={isSubmitting}
          data-component="reset-password-submit-reset"
        >
          {isSubmitting ? t('reset.submitting') : t('reset.submit')}
        </button>

        <button
          type="button"
          className={s.secondary}
          onClick={onBack}
          data-component="reset-password-back"
        >
          {t('reset.back')}
        </button>
      </form>
    </>
  );
}
