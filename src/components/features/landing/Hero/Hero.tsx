'use client';

import { CalendarClock, ChevronDown, MapPin, Search, Tags } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { SearchAutocomplete } from '@/components/features/search/SearchAutocomplete';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  'manicura',
  'gimnasio',
  'estetica',
  'yoga',
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
  const locale = useLocale() as 'es' | 'ca';
  const { draft, setCategory, setLocation, setWhenNow, handleSubmit, handleSelectSuggestion } =
    useHeroSearch();

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
            {/* Categoría: usamos Radix Select para evitar el render nativo del
                navegador (que se sale del lenguaje visual del resto del form). */}
            <div className={s.field} data-component="hero-search-category">
              <span className={s.fieldIcon} aria-hidden="true">
                <Tags className="size-4" />
              </span>
              <span className={s.fieldBody}>
                <span className={s.fieldLabel}>{t('searchBar.category')}</span>
                <Select
                  value={draft.category || undefined}
                  onValueChange={(value) => setCategory(value as HeroCategorySlug)}
                >
                  <SelectTrigger
                    className={s.selectTrigger}
                    aria-label={t('searchBar.category')}
                    hideChevron
                  >
                    <SelectValue placeholder={t('searchBar.category')} />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((slug) => (
                      <SelectItem key={slug} value={slug}>
                        {tCats(slug)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </span>
              <ChevronDown className={s.fieldChevron} aria-hidden="true" />
            </div>

            <span className={s.fieldDivider} aria-hidden="true" />

            {/* Localización: el input plano se sustituye por el autocomplete
                del buscador. Lo renderizamos sin form interno (renderAsForm=false)
                para no anidar formularios dentro del de Hero. La selección de
                una sugerencia navega directamente vía `handleSelectSuggestion`. */}
            <div className={s.field} data-component="hero-search-location">
              <span className={s.fieldIcon} aria-hidden="true">
                <MapPin className="size-4" />
              </span>
              <span className={s.fieldBody}>
                <span className={s.fieldLabel}>{t('searchBar.location')}</span>
                <SearchAutocomplete
                  value={draft.location}
                  onValueChange={setLocation}
                  onSubmit={(value) => {
                    setLocation(value);
                  }}
                  onSelectSuggestion={handleSelectSuggestion}
                  locale={locale}
                  placeholder={t('searchBar.location')}
                  inputAriaLabel={t('searchBar.location')}
                  renderAsForm={false}
                  inputClassName={s.fieldControl}
                />
              </span>
            </div>

            <span className={s.fieldDivider} aria-hidden="true" />

            {/* Cuándo: misma estética que el desplegable de categoría para
                que ambos selects se sientan parte del mismo sistema. */}
            <div className={s.field} data-component="hero-search-when">
              <span className={s.fieldIcon} aria-hidden="true">
                <CalendarClock className="size-4" />
              </span>
              <span className={s.fieldBody}>
                <span className={s.fieldLabel}>{t('searchBar.when')}</span>
                <Select
                  value={draft.whenNow ? 'now' : 'later'}
                  onValueChange={(value) => setWhenNow(value === 'now')}
                >
                  <SelectTrigger
                    className={s.selectTrigger}
                    aria-label={t('searchBar.when')}
                    hideChevron
                  >
                    <SelectValue placeholder={t('searchBar.now')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="now">{t('searchBar.now')}</SelectItem>
                  </SelectContent>
                </Select>
              </span>
              <ChevronDown className={s.fieldChevron} aria-hidden="true" />
            </div>

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
