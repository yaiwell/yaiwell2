'use client';

import { Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { AuthErrorCode } from '@/lib/auth';

import { useSignUpForm } from './SignUpForm.logic';
import { signUpFormStyles as s } from './SignUpForm.styles';
import { SIGN_UP_FIELD_IDS, type SignUpRole } from './SignUpForm.types';
import { SignUpVerificationPanel } from './SignUpVerificationPanel';

/**
 * Formulario de alta con dos roles (cliente / proveedor) y flujo de
 * verificación por email en dos pasos: rellenar datos → introducir OTP.
 *
 * La lógica completa vive en `useSignUpForm`; este componente solo
 * compone UI y traduce los `AuthErrorCode` a copy con next-intl.
 */
export function SignUpForm() {
  const t = useTranslations('signUp');

  const {
    phase,
    role,
    draft,
    errors,
    rootError,
    verificationCode,
    isSubmitting,
    updateField,
    setVerificationCode,
    handleSubmit,
    submitVerification,
    switchRole,
    resetToForm,
  } = useSignUpForm();

  // Mapeo exhaustivo código → mensaje. Si se añade un código nuevo al
  // union `AuthErrorCode`, TypeScript marca este Record como incompleto.
  const errorMessages: Record<AuthErrorCode, string> = {
    emailRequired: t('errors.required'),
    emailInvalid: t('errors.emailInvalid'),
    passwordRequired: t('errors.required'),
    passwordTooShort: t('errors.passwordShort'),
    passwordMismatch: t('errors.passwordMismatch'),
    fullNameRequired: t('errors.fullNameMin'),
    businessNameRequired: t('errors.businessNameMin'),
    termsRequired: t('errors.termsRequired'),
    invalidCredentials: t('errors.invalidCredentials'),
    tooManyAttempts: t('errors.tooManyAttempts'),
    sessionExists: t('errors.sessionExists'),
    emailAlreadyExists: t('errors.emailAlreadyExists'),
    passwordCompromised: t('errors.passwordCompromised'),
    verificationCodeInvalid: t('errors.verificationCodeInvalid'),
    verificationCodeExpired: t('errors.verificationCodeExpired'),
    networkError: t('errors.networkError'),
    unknown: t('errors.unknown'),
  };

  return (
    <section className={s.root} data-component="sign-up-form-root">
      <div className={s.shell}>
        {/* Columna formulario */}
        <div className={s.formColumn}>
          {phase === 'form' ? (
            <FormPhase
              t={t}
              role={role}
              draft={draft}
              errors={errors}
              rootError={rootError}
              errorMessages={errorMessages}
              isSubmitting={isSubmitting}
              switchRole={switchRole}
              updateField={updateField}
              handleSubmit={handleSubmit}
            />
          ) : (
            <SignUpVerificationPanel
              t={t}
              email={draft.email}
              verificationCode={verificationCode}
              rootError={rootError}
              errorMessages={errorMessages}
              isSubmitting={isSubmitting}
              setVerificationCode={setVerificationCode}
              submitVerification={submitVerification}
              resetToForm={resetToForm}
            />
          )}
        </div>

        {/* Columna ilustrativa (solo desktop). Decorativa, sin texto crítico
            replicado de la columna principal: refuerza marca y nada más. */}
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

/**
 * Subcomponente: fase 1 (formulario). Se extrae para mantener el JSX
 * principal corto y respetar el límite de 250 líneas por archivo.
 */
function FormPhase(props: {
  t: ReturnType<typeof useTranslations<'signUp'>>;
  role: SignUpRole;
  draft: ReturnType<typeof useSignUpForm>['draft'];
  errors: ReturnType<typeof useSignUpForm>['errors'];
  rootError: ReturnType<typeof useSignUpForm>['rootError'];
  errorMessages: Record<AuthErrorCode, string>;
  isSubmitting: boolean;
  switchRole: (role: SignUpRole) => void;
  updateField: ReturnType<typeof useSignUpForm>['updateField'];
  handleSubmit: ReturnType<typeof useSignUpForm>['handleSubmit'];
}) {
  const {
    t,
    role,
    draft,
    errors,
    rootError,
    errorMessages,
    isSubmitting,
    switchRole,
    updateField,
    handleSubmit,
  } = props;

  return (
    <>
      <header className={s.header}>
        <span className={s.eyebrow}>{t('eyebrow')}</span>
        <h1 className={s.title}>{t('title')}</h1>
        <p className={s.subtitle}>{t('subtitle')}</p>
      </header>

      <Tabs
        value={role}
        onValueChange={(value) => switchRole(value as SignUpRole)}
        data-component="sign-up-tabs"
      >
        <TabsList className={s.tabsList}>
          <TabsTrigger value="client" data-component="sign-up-tab-client">
            {t('tabs.client')}
          </TabsTrigger>
          <TabsTrigger value="provider" data-component="sign-up-tab-provider">
            {t('tabs.provider')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={role} forceMount asChild>
          <form className={s.form} onSubmit={handleSubmit} noValidate data-component="sign-up-form">
            {rootError ? (
              <p className={s.rootError} role="alert" data-component="sign-up-root-error">
                {errorMessages[rootError]}
              </p>
            ) : null}

            <div className={s.field}>
              <label className={s.label} htmlFor={SIGN_UP_FIELD_IDS.fullName}>
                {role === 'provider' ? t('fields.contactName') : t('fields.fullName')}
              </label>
              <input
                id={SIGN_UP_FIELD_IDS.fullName}
                type="text"
                autoComplete="name"
                className={s.input}
                value={draft.fullName}
                onChange={(e) => updateField('fullName', e.target.value)}
                aria-invalid={Boolean(errors.fullName)}
                aria-describedby={
                  errors.fullName ? `${SIGN_UP_FIELD_IDS.fullName}-error` : undefined
                }
                data-component="sign-up-input-name"
              />
              {errors.fullName && (
                <span
                  id={`${SIGN_UP_FIELD_IDS.fullName}-error`}
                  className={s.errorText}
                  role="alert"
                >
                  {errorMessages[errors.fullName]}
                </span>
              )}
            </div>

            {role === 'provider' && (
              <div className={s.field}>
                <label className={s.label} htmlFor={SIGN_UP_FIELD_IDS.businessName}>
                  {t('fields.businessName')}
                </label>
                <input
                  id={SIGN_UP_FIELD_IDS.businessName}
                  type="text"
                  autoComplete="organization"
                  className={s.input}
                  value={draft.businessName}
                  onChange={(e) => updateField('businessName', e.target.value)}
                  aria-invalid={Boolean(errors.businessName)}
                  aria-describedby={
                    errors.businessName ? `${SIGN_UP_FIELD_IDS.businessName}-error` : undefined
                  }
                  data-component="sign-up-input-business"
                />
                {errors.businessName && (
                  <span
                    id={`${SIGN_UP_FIELD_IDS.businessName}-error`}
                    className={s.errorText}
                    role="alert"
                  >
                    {errorMessages[errors.businessName]}
                  </span>
                )}
              </div>
            )}

            <div className={s.field}>
              <label className={s.label} htmlFor={SIGN_UP_FIELD_IDS.email}>
                {t('fields.email')}
              </label>
              <input
                id={SIGN_UP_FIELD_IDS.email}
                type="email"
                autoComplete="email"
                className={s.input}
                value={draft.email}
                onChange={(e) => updateField('email', e.target.value)}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? `${SIGN_UP_FIELD_IDS.email}-error` : undefined}
                data-component="sign-up-input-email"
              />
              {errors.email && (
                <span id={`${SIGN_UP_FIELD_IDS.email}-error`} className={s.errorText} role="alert">
                  {errorMessages[errors.email]}
                </span>
              )}
            </div>

            <div className={s.fieldGrid}>
              <div className={s.field}>
                <label className={s.label} htmlFor={SIGN_UP_FIELD_IDS.password}>
                  {t('fields.password')}
                </label>
                <input
                  id={SIGN_UP_FIELD_IDS.password}
                  type="password"
                  autoComplete="new-password"
                  className={s.input}
                  value={draft.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={
                    errors.password ? `${SIGN_UP_FIELD_IDS.password}-error` : undefined
                  }
                  data-component="sign-up-input-password"
                />
                {errors.password && (
                  <span
                    id={`${SIGN_UP_FIELD_IDS.password}-error`}
                    className={s.errorText}
                    role="alert"
                  >
                    {errorMessages[errors.password]}
                  </span>
                )}
              </div>
              <div className={s.field}>
                <label className={s.label} htmlFor={SIGN_UP_FIELD_IDS.passwordRepeat}>
                  {t('fields.passwordRepeat')}
                </label>
                <input
                  id={SIGN_UP_FIELD_IDS.passwordRepeat}
                  type="password"
                  autoComplete="new-password"
                  className={s.input}
                  value={draft.passwordRepeat}
                  onChange={(e) => updateField('passwordRepeat', e.target.value)}
                  aria-invalid={Boolean(errors.passwordRepeat)}
                  aria-describedby={
                    errors.passwordRepeat ? `${SIGN_UP_FIELD_IDS.passwordRepeat}-error` : undefined
                  }
                  data-component="sign-up-input-password-repeat"
                />
                {errors.passwordRepeat && (
                  <span
                    id={`${SIGN_UP_FIELD_IDS.passwordRepeat}-error`}
                    className={s.errorText}
                    role="alert"
                  >
                    {errorMessages[errors.passwordRepeat]}
                  </span>
                )}
              </div>
            </div>

            {role === 'provider' && (
              <p className={s.providerNotice} data-component="sign-up-verification-notice">
                {t('verificationNotice')}
              </p>
            )}

            <div className={s.termsRow}>
              <input
                id={SIGN_UP_FIELD_IDS.acceptsTerms}
                type="checkbox"
                className={s.termsBox}
                checked={draft.acceptsTerms}
                onChange={(e) => updateField('acceptsTerms', e.target.checked)}
                aria-invalid={Boolean(errors.acceptsTerms)}
                aria-describedby={
                  errors.acceptsTerms ? `${SIGN_UP_FIELD_IDS.acceptsTerms}-error` : undefined
                }
                data-component="sign-up-input-terms"
              />
              <label htmlFor={SIGN_UP_FIELD_IDS.acceptsTerms} className={s.termsLabel}>
                {t.rich('termsLabel', {
                  terms: (chunks) => (
                    <Link href="/" className={s.termsLink}>
                      {chunks}
                    </Link>
                  ),
                  privacy: (chunks) => (
                    <Link href="/" className={s.termsLink}>
                      {chunks}
                    </Link>
                  ),
                })}
              </label>
            </div>
            {errors.acceptsTerms && (
              <span
                id={`${SIGN_UP_FIELD_IDS.acceptsTerms}-error`}
                className={s.errorText}
                role="alert"
              >
                {errorMessages[errors.acceptsTerms]}
              </span>
            )}

            <button
              type="submit"
              className={s.submit}
              disabled={isSubmitting}
              data-component="sign-up-submit"
            >
              {isSubmitting ? t('cta.submitting') : t('cta.submit')}
            </button>

            <div className={s.divider} aria-hidden="true">
              <span className={s.dividerLine} />
              <span>{t('socialDivider')}</span>
              <span className={s.dividerLine} />
            </div>

            <div className={s.socialRow}>
              <button
                type="button"
                className={s.socialButton}
                disabled
                data-component="sign-up-social-google"
              >
                {t('social.google')}
              </button>
              <button
                type="button"
                className={s.socialButton}
                disabled
                data-component="sign-up-social-apple"
              >
                {t('social.apple')}
              </button>
            </div>

            <p className={s.footerNote}>
              {t.rich('haveAccount', {
                link: (chunks) => (
                  <Link href="/entrar" className={s.footerLink}>
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          </form>
        </TabsContent>
      </Tabs>
    </>
  );
}
