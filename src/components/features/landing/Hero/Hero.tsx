'use client';

import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useHeroSearch } from './Hero.logic';
import { heroStyles as s } from './Hero.styles';
import type { HeroCategorySlug } from './Hero.types';

/**
 * URL Unsplash usada como fondo del Hero.
 *
 * Decisión: usamos `background-image` CSS en lugar de `next/image` para no
 * tener que registrar el hostname en `next.config.ts` ni convertir el
 * componente en un mosaico de containers. La imagen es 100% decorativa, no
 * contiene texto ni información crítica, así que el coste de no usar la
 * pipeline de optimización es asumible para el MVP visual.
 *
 * Verificada con curl: responde 200 a fecha de la creación.
 */
const HERO_BACKGROUND_URL =
  'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1600&q=80&auto=format&fit=crop';

/**
 * Opciones del dropdown de categoría. Mantenemos el mismo orden que en la
 * sección "Categorías populares" más abajo para coherencia visual.
 */
const categoryOptions: HeroCategorySlug[] = [
  'peluqueria',
  'masajes',
  'padel',
  'manicura',
  'gimnasio',
  'estetica',
  'yoga',
  'depilacion',
];

/**
 * Hero principal de la landing.
 *
 * Compone fondo + overlay cálido + título + buscador prominente estilo
 * Airbnb. Es Client Component porque el formulario tiene estado y al
 * enviar navega con `useRouter` de next-intl.
 */
export function Hero() {
  const t = useTranslations('home.hero');
  const tCats = useTranslations('home.categories');
  const { draft, setCategory, setLocation, setWhenNow, handleSubmit } = useHeroSearch();

  return (
    <section className={s.root}>
      {/* Fondo decorativo. Se carga vía CSS para evitar añadir hostnames
          a next.config y porque no aporta semántica que justifique `img`. */}
      <div
        className={s.bgLayer}
        style={{ backgroundImage: `url(${HERO_BACKGROUND_URL})` }}
        aria-hidden="true"
      />
      <div className={s.overlay} aria-hidden="true" />

      <div className={s.content}>
        <span className={s.badge}>
          <span className={s.badgeDot} aria-hidden="true" />
          {t('searchBar.now')}
        </span>

        <h1 className={s.titleLine1}>
          {t('title.line1')} <span className={s.titleLine2}>{t('title.line2')}</span>
        </h1>

        <p className={s.subtitle}>{t('subtitle')}</p>

        <form className={s.searchCard} onSubmit={handleSubmit} role="search">
          <div className={s.searchForm}>
            {/* Categoría */}
            <label className={s.field}>
              <span className={s.fieldLabel}>{t('searchBar.category')}</span>
              <select
                value={draft.category}
                onChange={(e) => setCategory(e.target.value as HeroCategorySlug | '')}
                className={s.fieldControl}
                aria-label={t('searchBar.category')}
              >
                <option value="">{t('searchBar.category')}</option>
                {categoryOptions.map((slug) => (
                  <option key={slug} value={slug}>
                    {tCats(slug)}
                  </option>
                ))}
              </select>
            </label>

            <span className={s.fieldDivider} aria-hidden="true" />

            {/* Localización (texto libre por ahora; el geocoder llega luego) */}
            <label className={s.field}>
              <span className={s.fieldLabel}>{t('searchBar.location')}</span>
              <input
                type="text"
                value={draft.location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={t('searchBar.location')}
                className={s.fieldControl}
                autoComplete="off"
              />
            </label>

            <span className={s.fieldDivider} aria-hidden="true" />

            {/* Cuándo: por defecto "Ahora", se podrá expandir más adelante */}
            <label className={s.field}>
              <span className={s.fieldLabel}>{t('searchBar.when')}</span>
              <select
                value={draft.whenNow ? 'now' : 'later'}
                onChange={(e) => setWhenNow(e.target.value === 'now')}
                className={s.fieldControl}
                aria-label={t('searchBar.when')}
              >
                <option value="now">{t('searchBar.now')}</option>
              </select>
            </label>

            <div className={s.submitWrap}>
              <button type="submit" className={s.submit}>
                <Search className="size-4" aria-hidden="true" />
                {t('searchBar.submit')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}
