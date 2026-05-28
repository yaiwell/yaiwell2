'use client';

import { CalendarClock, ChevronDown, Loader2, MapPin, Search, Tags, X } from 'lucide-react';
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
import type { HeroCategorySlug, HeroWhenOption } from './Hero.types';

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
 * Opciones del dropdown "¿Cuándo?". Mantenemos el orden de inmediatez:
 * ahora → hoy → mañana → esta semana → cualquier día.
 */
const whenOptions: HeroWhenOption[] = ['now', 'today', 'tomorrow', 'this-week', 'any'];

/**
 * Tipo de clave válida dentro del namespace `home.hero.searchBar.whenOptions`.
 * Se mantiene en sincronía con `es.json` y `ca.json`; si añadimos una opción
 * en `HeroWhenOption`, hay que añadir aquí su clave i18n correspondiente.
 */
type WhenLabelKey = 'now' | 'today' | 'tomorrow' | 'thisWeek' | 'any';

/**
 * Mapea cada opción a la clave del namespace `whenOptions` en i18n.
 */
const whenLabelKey: Record<HeroWhenOption, WhenLabelKey> = {
  now: 'now',
  today: 'today',
  tomorrow: 'tomorrow',
  'this-week': 'thisWeek',
  any: 'any',
};

/**
 * Hero principal de la landing.
 *
 * Compone fondo + overlay cálido + título + buscador prominente. El form
 * es Client Component porque tiene estado y al enviar navega con
 * `useRouter` de next-intl.
 *
 * Rediseño 2026-05-28:
 *  - "¿Dónde?" ofrece un atajo "Usar mi ubicación" que prellena el
 *    campo con la ubicación del usuario (pide permiso si hace falta).
 *  - "¿Cuándo?" pasa de un único valor ("Ahora") a un set completo de
 *    ventanas temporales (Ahora / Hoy / Mañana / Esta semana / Cualquiera).
 */
export function Hero() {
  const t = useTranslations('home.hero');
  const tCats = useTranslations('home.categories');
  const tWhen = useTranslations('home.hero.searchBar.whenOptions');
  const locale = useLocale() as 'es' | 'ca';
  const {
    draft,
    locationStatus,
    setCategory,
    setLocation,
    setWhen,
    useMyLocation,
    clearNearMe,
    handleSubmit,
    handleSelectSuggestion,
  } = useHeroSearch();

  const isLocating = locationStatus === 'requesting';
  const isDenied = locationStatus === 'denied';

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

            {/* Localización: si el usuario ha activado "Cerca de ti" mostramos
                un chip removible; si no, el autocomplete habitual + un atajo
                para autocompletar con su ubicación sin teclear. */}
            <div className={s.field} data-component="hero-search-location">
              <span className={s.fieldIcon} aria-hidden="true">
                <MapPin className="size-4" />
              </span>
              <span className={s.fieldBody}>
                <span className={s.fieldLabel}>{t('searchBar.location')}</span>
                {draft.useNearMe ? (
                  <span className={s.nearMeChip} data-component="hero-search-near-me-chip">
                    <span className={s.nearMeChipText}>
                      <MapPin className="size-3.5" aria-hidden="true" />
                      {t('searchBar.nearYou')}
                    </span>
                    <button
                      type="button"
                      onClick={clearNearMe}
                      className={s.nearMeChipClear}
                      aria-label={t('searchBar.clearLocation')}
                    >
                      <X className="size-3" aria-hidden="true" />
                    </button>
                  </span>
                ) : (
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
                )}
              </span>
              {!draft.useNearMe && !isDenied && (
                <button
                  type="button"
                  onClick={useMyLocation}
                  disabled={isLocating}
                  className={s.useMyLocationBtn}
                  aria-label={t('searchBar.useMyLocation')}
                  data-component="hero-search-use-my-location"
                >
                  {isLocating ? (
                    <Loader2 className="size-3 animate-spin" aria-hidden="true" />
                  ) : (
                    <MapPin className="size-3" aria-hidden="true" />
                  )}
                  <span className={s.useMyLocationBtnLabel}>
                    {isLocating ? t('searchBar.locating') : t('searchBar.useMyLocation')}
                  </span>
                </button>
              )}
            </div>

            <span className={s.fieldDivider} aria-hidden="true" />

            {/* Cuándo: el set completo de ventanas temporales. "Ahora" sigue
                siendo el default y se traduce a `now=1` en la URL (alias
                legacy del filtro de disponibilidad inmediata). El resto
                viajan como `when=...` para la futura lógica de slots. */}
            <div className={s.field} data-component="hero-search-when">
              <span className={s.fieldIcon} aria-hidden="true">
                <CalendarClock className="size-4" />
              </span>
              <span className={s.fieldBody}>
                <span className={s.fieldLabel}>{t('searchBar.when')}</span>
                <Select
                  value={draft.when}
                  onValueChange={(value) => setWhen(value as HeroWhenOption)}
                >
                  <SelectTrigger
                    className={s.selectTrigger}
                    aria-label={t('searchBar.when')}
                    hideChevron
                  >
                    <SelectValue placeholder={tWhen('now')} />
                  </SelectTrigger>
                  <SelectContent>
                    {whenOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {tWhen(whenLabelKey[option])}
                      </SelectItem>
                    ))}
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
