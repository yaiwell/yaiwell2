'use client';

import { Loader2, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useSignInForm } from './SignInForm.logic';
import { signInStyles as s } from './SignInForm.styles';
import type { SignInErrorCode, SignInRole } from './SignInForm.types';

/**
 * Formulario de sign-in mock.
 *
 * Es la única pieza Client Component de la pantalla `/entrar`. La page
 * (Server Component) se limita a envolverla en el contenedor visual y a
 * activar el locale.
 *
 * No conectamos con Clerk todavía: el submit hace un pequeño delay y
 * redirige a `/panel` o `/` según el rol elegido. Cuando integremos auth
 * real, lo único que cambia es el contenido de `useSignInForm.handleSubmit`.
 */
export function SignInForm() {
  const t = useTranslations('signIn');
  const { role, setRole, draft, updateDraft, status, errorCode, handleSubmit } = useSignInForm();

  const isSubmitting = status === 'submitting';
  // Errores de campo (email/password) anclan el mensaje al input; errores
  // globales (rate limit, red, credenciales) van al banner superior.
  // Mantenemos el mapeo como `Record` exhaustivo porque next-intl rechaza
  // claves dinámicas y queremos que añadir un código nuevo en el union
  // obligue a actualizar este mapping (el compilador lo marcará).
  const errorMessages: Record<SignInErrorCode, string> = {
    emailRequired: t('errors.emailRequired'),
    emailInvalid: t('errors.emailInvalid'),
    passwordRequired: t('errors.passwordRequired'),
    invalidCredentials: t('errors.invalidCredentials'),
    tooManyAttempts: t('errors.tooManyAttempts'),
    sessionExists: t('errors.sessionExists'),
    networkError: t('errors.networkError'),
    unknown: t('errors.unknown'),
  };
  const isEmailError = errorCode === 'emailRequired' || errorCode === 'emailInvalid';
  const emailErrorId = isEmailError ? 'sign-in-email-error' : undefined;
  const rootErrorId = errorCode && !isEmailError ? 'sign-in-root-error' : undefined;
  const emailErrorMessage = isEmailError ? errorMessages[errorCode] : null;
  const rootErrorMessage = errorCode && !isEmailError ? errorMessages[errorCode] : null;

  return (
    <section className={s.root} data-component="sign-in">
      <div className={s.grid}>
        {/* Panel ilustrativo (solo desktop): aporta personalidad de marca
            y refuerza la propuesta de valor sin distraer del formulario. */}
        <aside className={s.aside} aria-hidden="true" data-component="sign-in-aside">
          <span className={s.asideBadge}>
            <Sparkles className="size-3.5" />
            {t('aside.badge')}
          </span>
          <div>
            <h2 className={s.asideTitle}>{t('aside.title')}</h2>
            <p className={s.asideSubtitle}>{t('aside.subtitle')}</p>
          </div>
          <div className={s.asideFooter}>
            <div className={s.asideFooterRow}>
              <span aria-hidden="true">·</span>
              <span>{t('aside.bullet1')}</span>
            </div>
            <div className={s.asideFooterRow}>
              <span aria-hidden="true">·</span>
              <span>{t('aside.bullet2')}</span>
            </div>
          </div>
        </aside>

        <div className={s.formColumn}>
          <div className={s.formCard} data-component="sign-in-card">
            <header className={s.header}>
              <h1 className={s.title}>{t('title')}</h1>
              <p className={s.subtitle}>{t('subtitle')}</p>
            </header>

            {/* Pestañas cliente/proveedor: cambian el destino post-login. */}
            <div className={s.tabsWrap}>
              <Tabs
                value={role}
                onValueChange={(value) => setRole(value as SignInRole)}
                data-component="sign-in-tabs"
              >
                <TabsList aria-label={t('tabs.ariaLabel')}>
                  <TabsTrigger value="client" data-component="sign-in-tab-client">
                    {t('tabs.client')}
                  </TabsTrigger>
                  <TabsTrigger value="provider" data-component="sign-in-tab-provider">
                    {t('tabs.provider')}
                  </TabsTrigger>
                </TabsList>
                {/* Renderizamos un TabsContent vacío por valor para que
                    Radix anuncie el cambio a tecnologías asistivas. El
                    formulario en sí es común a ambos roles. */}
                <TabsContent value="client" className="sr-only">
                  {t('tabs.clientDescription')}
                </TabsContent>
                <TabsContent value="provider" className="sr-only">
                  {t('tabs.providerDescription')}
                </TabsContent>
              </Tabs>
            </div>

            <form
              className={s.form}
              onSubmit={handleSubmit}
              noValidate
              data-component="sign-in-form"
            >
              {rootErrorMessage ? (
                <p
                  id={rootErrorId}
                  className={s.errorText}
                  role="alert"
                  data-component="sign-in-root-error"
                >
                  {rootErrorMessage}
                </p>
              ) : null}

              <div className={s.field}>
                <label htmlFor="sign-in-email" className={s.label}>
                  {t('fields.emailLabel')}
                </label>
                <input
                  id="sign-in-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  inputMode="email"
                  className={s.input}
                  placeholder={t('fields.emailPlaceholder')}
                  value={draft.email}
                  onChange={(event) => updateDraft({ email: event.target.value })}
                  aria-invalid={isEmailError}
                  aria-describedby={emailErrorId}
                  required
                  data-component="sign-in-email"
                />
                {emailErrorMessage ? (
                  <p
                    id={emailErrorId}
                    className={s.errorText}
                    role="alert"
                    data-component="sign-in-error"
                  >
                    {emailErrorMessage}
                  </p>
                ) : null}
              </div>

              <div className={s.field}>
                <label htmlFor="sign-in-password" className={s.label}>
                  {t('fields.passwordLabel')}
                </label>
                <input
                  id="sign-in-password"
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  className={s.input}
                  placeholder={t('fields.passwordPlaceholder')}
                  value={draft.password}
                  onChange={(event) => updateDraft({ password: event.target.value })}
                  data-component="sign-in-password"
                />
              </div>

              <div className={s.rowBetween}>
                <label className={s.checkboxWrap} htmlFor="sign-in-remember">
                  <input
                    id="sign-in-remember"
                    type="checkbox"
                    className={s.checkbox}
                    checked={draft.remember}
                    onChange={(event) => updateDraft({ remember: event.target.checked })}
                    data-component="sign-in-remember"
                  />
                  {t('fields.remember')}
                </label>
                <Link href="/recuperar" className={s.forgotLink} data-component="sign-in-forgot">
                  {t('fields.forgot')}
                </Link>
              </div>

              <button
                type="submit"
                className={s.submit}
                disabled={isSubmitting}
                data-component="sign-in-submit"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className={s.submitSpinner} aria-hidden="true" />
                    {t('actions.submitting')}
                  </>
                ) : (
                  t('actions.submit')
                )}
              </button>
            </form>

            <div className={s.divider} aria-hidden="true">
              <span className={s.dividerLine} />
              {t('divider')}
              <span className={s.dividerLine} />
            </div>

            <div className={s.socialRow}>
              {/* Botones sociales en estado "Próximamente": deshabilitados
                  pero presentes para que la UI ya muestre dónde irán. */}
              <button
                type="button"
                className={s.socialButton}
                disabled
                aria-label={t('social.googleAria')}
                data-component="sign-in-social-google"
              >
                <span aria-hidden="true">G</span>
                {t('social.google')}
                <span className={s.socialBadge}>{t('social.comingSoon')}</span>
              </button>
              <button
                type="button"
                className={s.socialButton}
                disabled
                aria-label={t('social.appleAria')}
                data-component="sign-in-social-apple"
              >
                <span aria-hidden="true"></span>
                {t('social.apple')}
                <span className={s.socialBadge}>{t('social.comingSoon')}</span>
              </button>
            </div>

            <p className={s.footer}>
              {t('footer.noAccount')}{' '}
              <Link
                href="/registro"
                className={s.footerLink}
                data-component="sign-in-go-to-register"
              >
                {t('footer.createOne')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
