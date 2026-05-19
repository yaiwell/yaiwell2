'use client';

import { CalendarClock, ChevronDown, MapPin, Search, Tags } from 'lucide-react';
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
 * Compone fondo + overlay cálido + título + buscador prominente. El form
 * es Client Component porque tiene estado y al enviar navega con
 * `useRouter` de next-intl.
 *
 * Rediseño del search card (2026-05-19): se sustituyen los selects
 * nativos por campos con icono + label + valor visible, separadores
 * verticales y un botón submit circular en desktop. Mantiene el patrón
 * funcional (3 campos + botón) pero con un acabado mucho más premium.
 */
export function Hero() {
  const t = useTranslations('home.hero');
  const tCats = useTranslations('home.categories');
  const { draft, setCategory, setLocation, setWhenNow, handleSubmit } = useHeroSearch();

  return (
    <section className={s.root} data-component="hero">
      {/* Fondo decorativo. Se carga vía CSS para evitar añadir hostnames
          a next.config y porque no aporta semántica que justifique `img`. */}
      <div
        className={s.bgLayer}
        style={{ backgroundImage: `url(${HERO_BACKGROUND_URL})` }}
        aria-hidden="true"
      />
      <div className={s.overlay} aria-hidden="true" />

      <div className={s.content}>
        <span className={s.badge} data-component="hero-badge">
          <span className={s.badgeDot} aria-hidden="true" />
          {t('searchBar.now')}
        </span>

        <h1 className={s.titleLine1}>
          {t('title.line1')} <span className={s.titleLine2}>{t('title.line2')}</span>
        </h1>

        <p className={s.subtitle}>{t('subtitle')}</p>

        <form
          className={s.searchCard}
          onSubmit={handleSubmit}
          role="search"
          data-component="hero-search-card"
        >
          <div className={s.searchForm}>
            {/* Categoría */}
            <label className={s.field} data-component="hero-search-category">
              <span className={s.fieldIcon} aria-hidden="true">
                <Tags className="size-4" />
              </span>
              <span className={s.fieldBody}>
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
              </span>
              <ChevronDown className={s.fieldChevron} aria-hidden="true" />
            </label>

            <span className={s.fieldDivider} aria-hidden="true" />

            {/* Localización (texto libre por ahora; el geocoder llega luego) */}
            <label className={s.field} data-component="hero-search-location">
              <span className={s.fieldIcon} aria-hidden="true">
                <MapPin className="size-4" />
              </span>
              <span className={s.fieldBody}>
                <span className={s.fieldLabel}>{t('searchBar.location')}</span>
                <input
                  type="text"
                  value={draft.location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={t('searchBar.location')}
                  className={s.fieldControl}
                  autoComplete="off"
                />
              </span>
            </label>

            <span className={s.fieldDivider} aria-hidden="true" />

            {/* Cuándo: por defecto "Ahora", se podrá expandir más adelante */}
            <label className={s.field} data-component="hero-search-when">
              <span className={s.fieldIcon} aria-hidden="true">
                <CalendarClock className="size-4" />
              </span>
              <span className={s.fieldBody}>
                <span className={s.fieldLabel}>{t('searchBar.when')}</span>
                <select
                  value={draft.whenNow ? 'now' : 'later'}
                  onChange={(e) => setWhenNow(e.target.value === 'now')}
                  className={s.fieldControl}
                  aria-label={t('searchBar.when')}
                >
                  <option value="now">{t('searchBar.now')}</option>
                </select>
              </span>
              <ChevronDown className={s.fieldChevron} aria-hidden="true" />
            </label>

            <div className={s.submitWrap}>
              <button
                type="submit"
                className={s.submit}
                aria-label={t('searchBar.submit')}
                data-component="hero-search-submit"
              >
                <Search className="size-5" aria-hidden="true" />
                <span className={s.submitLabel}>{t('searchBar.submit')}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}
