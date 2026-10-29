'use client';

import { CalendarCheck, Store } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';

import { useBecomeProviderConfirm } from './BecomeProviderConfirm.logic';
import { becomeProviderConfirmStyles as s } from './BecomeProviderConfirm.styles';
import type { BecomeProviderConfirmProps } from './BecomeProviderConfirm.types';

/**
 * Pantalla de confirmación para que un cliente con sesión convierta su
 * cuenta en profesional y pueda crear su negocio.
 *
 * Es un paso explícito (no automático) porque cambia lo que la persona
 * ve al entrar: a partir de ahí aterriza en su panel de negocio.
 */
export function BecomeProviderConfirm(props: BecomeProviderConfirmProps) {
  const t = useTranslations('becomeProvider');
  const { confirm, isPending, errorCode } = useBecomeProviderConfirm(props);

  return (
    <section className={s.shell} data-component="become-provider-confirm">
      <header className={s.header}>
        <span className={s.eyebrow}>
          <Store className={s.eyebrowIcon} aria-hidden="true" />
          {t('eyebrow')}
        </span>
        <h1 className={s.title}>{t('title')}</h1>
        <p className={s.description}>{t('description')}</p>
      </header>

      <p className={s.note}>
        <CalendarCheck className={s.noteIcon} aria-hidden="true" />
        {t('bookingsNote')}
      </p>

      {errorCode ? (
        <p className={s.error} role="alert" data-component="become-provider-error">
          {t(`errors.${errorCode}`)}
        </p>
      ) : null}

      <div className={s.actions}>
        <button
          type="button"
          className={s.confirm}
          onClick={confirm}
          disabled={isPending}
          aria-busy={isPending}
          data-component="become-provider-confirm-button"
        >
          {isPending ? t('cta.submitting') : t('cta.confirm')}
        </button>
        <Link href="/" className={s.cancel} data-component="become-provider-cancel">
          {t('cta.cancel')}
        </Link>
      </div>
    </section>
  );
}
