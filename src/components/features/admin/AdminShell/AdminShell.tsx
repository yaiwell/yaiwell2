import { Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';

import { adminShellStyles as s } from './AdminShell.styles';
import type { AdminShellProps } from './AdminShell.types';

/**
 * Shell del panel admin.
 *
 * Topbar minimalista con badge "ADMIN" + título + navegación rápida a
 * las secciones internas. El layout deliberadamente NO reutiliza el
 * Header / Footer / MobileNav del marketplace: el admin es una
 * herramienta interna y no debe parecer parte del producto público.
 */
export function AdminShell({ children }: AdminShellProps) {
  const t = useTranslations('adminArea');

  return (
    <div className={s.root} data-component="admin-shell">
      <header className={s.topbar} data-component="admin-shell-topbar">
        <div className={s.brandRow}>
          <span className={s.brandBadge}>
            <Shield className="size-3" aria-hidden="true" />
            {t('badge')}
          </span>
          <div>
            <p className={s.brandTitle}>{t('title')}</p>
            <p className={s.brandSubtitle}>{t('subtitle')}</p>
          </div>
        </div>
        <nav className={s.nav} aria-label={t('nav.ariaLabel')}>
          <Link href="/admin" className={s.navLink} data-component="admin-nav-dashboard">
            {t('nav.dashboard')}
          </Link>
          <Link href="/admin#verificaciones" className={s.navLink} data-component="admin-nav-queue">
            {t('nav.queue')}
          </Link>
          <Link href="/" className={s.navLink} data-component="admin-nav-exit">
            {t('nav.exit')}
          </Link>
        </nav>
      </header>

      <main className={s.main} data-component="admin-shell-main">
        {children}
      </main>
    </div>
  );
}
