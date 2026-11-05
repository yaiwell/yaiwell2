'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { useAccountProfile } from './AccountProfileCard.logic';
import { accountSettingsStyles as s } from './AccountSettings.styles';

/** Tarjeta de perfil: foto, nombre y acceso a email y contraseña. */
export function AccountProfileCard() {
  const t = useTranslations('account.settings.profile');
  const profile = useAccountProfile();
  const { user } = profile;

  if (!profile.isLoaded || !user) {
    return <section className={s.card} aria-busy="true" data-component="account-profile-loading" />;
  }

  return (
    <section
      className={s.card}
      aria-labelledby="account-profile-title"
      data-component="account-profile"
    >
      <h2 id="account-profile-title" className={s.title}>
        {t('title')}
      </h2>

      <div className={s.avatarRow}>
        <Image src={user.imageUrl} alt="" width={64} height={64} className={s.avatar} />
        <div className={s.actions}>
          <label className={s.button} data-component="account-photo-change">
            {t('photoChange')}
            <input
              type="file"
              accept="image/*"
              className={s.fileInput}
              disabled={profile.isBusy}
              onChange={profile.onPhotoSelected}
            />
          </label>
          {user.hasImage ? (
            <button
              type="button"
              className={s.button}
              disabled={profile.isBusy}
              onClick={profile.removePhoto}
              data-component="account-photo-remove"
            >
              {t('photoRemove')}
            </button>
          ) : null}
        </div>
      </div>

      <form className={s.row} onSubmit={(event) => void profile.saveName(event)}>
        <div className={s.fields}>
          <label className={s.field}>
            <span className={s.label}>{t('firstName')}</span>
            <input
              className={s.input}
              value={profile.firstName}
              onChange={(event) => profile.setFirstName(event.target.value)}
              autoComplete="given-name"
              maxLength={100}
            />
          </label>
          <label className={s.field}>
            <span className={s.label}>{t('lastName')}</span>
            <input
              className={s.input}
              value={profile.lastName}
              onChange={(event) => profile.setLastName(event.target.value)}
              autoComplete="family-name"
              maxLength={100}
            />
          </label>
        </div>
        <div className={s.actions}>
          <button
            type="submit"
            className={s.primaryButton}
            disabled={profile.isBusy}
            data-component="account-name-save"
          >
            {t('save')}
          </button>
          <span role="status" aria-live="polite">
            {profile.feedback === 'saved' ? <span className={s.saved}>{t('saved')}</span> : null}
            {profile.feedback === 'error' ? <span className={s.error}>{t('error')}</span> : null}
            {profile.feedback === 'photoError' ? (
              <span className={s.error}>{t('photoError')}</span>
            ) : null}
          </span>
        </div>
      </form>

      <div className={s.row}>
        <span className={s.label}>{t('security')}</span>
        <p className={s.hint}>{user.primaryEmailAddress?.emailAddress}</p>
        <div className={s.actions}>
          <button
            type="button"
            className={s.button}
            onClick={profile.openSecurity}
            data-component="account-security"
          >
            {t('securityCta')}
          </button>
        </div>
      </div>
    </section>
  );
}
