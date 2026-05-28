'use client';

import { CalendarClock, ChevronDown, MapPin, Search, Tags } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useHeroSearch } from './Hero.logic';
import { heroStyles as s } from './Hero.styles';
import type { HeroCategorySlug, HeroLocationOption, HeroWhenOption } from './Hero.types';

/**
 * URL Unsplash usada como fondo del Hero.
 *
 * Decisión: usamos `background-image` CSS en lugar de `next/image` para no
 * tener que registrar el hostname en `next.config.ts` ni convertir el
 * componente en un mosaico de containers. La imagen es 100% decorativa, no
 * contiene texto ni información crítica, así que el coste de no usar la
 * pipeline de optimización es asumible para el MVP visual.
 */
const HERO_BACKGROUND_URL =
  'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1600&q=80&auto=format&fit=crop';

/**
 * Opciones del dropdown de categoría.
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
 * Opciones del dropdown "¿Dónde?". El orden busca poner primero la
 * opción "neutra" (cualquier zona), después la geolocalizada (que es
 * el atajo más útil), y por último las ciudades concretas.
 */
const locationOptions: HeroLocationOption[] = [
  'any',
  'near-me',
  'barcelona',
  'castellar',
  'llica-vall',
];

/**
 * Clave i18n por opción de zona, dentro del namespace
 * `home.hero.searchBar.locationOptions`.
 */
type LocationLabelKey = 'any' | 'nearMe' | 'barcelona' | 'castellar' | 'llicaVall';

const locationLabelKey: Record<HeroLocationOption, LocationLabelKey> = {
  any: 'any',
  'near-me': 'nearMe',
  barcelona: 'barcelona',
  castellar: 'castellar',
  'llica-vall': 'llicaVall',
};

/**
 * Opciones del dropdown "¿Cuándo?".
 */
const whenOptions: HeroWhenOption[] = ['now', 'today', 'tomorrow', 'this-week', 'any'];

type WhenLabelKey = 'now' | 'today' | 'tomorrow' | 'thisWeek' | 'any';

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
 * Tres selects homogéneos: categoría / zona / momento. Se envía a `/buscar`
 * con los params construidos en `useHeroSearch`.
 */
export function Hero() {
  const t = useTranslations('home.hero');
  const tCats = useTranslations('home.categories');
  const tWhen = useTranslations('home.hero.searchBar.whenOptions');
  const tLoc = useTranslations('home.hero.searchBar.locationOptions');
  const { draft, locationStatus, setCategory, setLocation, setWhen, handleSubmit } =
    useHeroSearch();

  // Etiqueta dinámica del valor "Cerca de ti" según el estado del permiso.
  // Mientras el navegador procesa, mostramos "Localizando…"; si el usuario
  // denegó, lo dejamos visible para que entienda por qué no funciona y
  // pueda elegir otra zona.
  const nearMeLabel =
    locationStatus === 'requesting'
      ? tLoc('nearMeLocating')
      : locationStatus === 'denied'
        ? tLoc('nearMeDenied')
        : tLoc('nearMe');

  return (
    <section className={s.root} data-component="hero">
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
            {/* Categoría */}
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

            {/* ¿Dónde? — selector idéntico en lenguaje visual al de
                categoría. "Cerca de ti" pide permiso al seleccionarse
                si todavía no lo tiene. */}
            <div className={s.field} data-component="hero-search-location">
              <span className={s.fieldIcon} aria-hidden="true">
                <MapPin className="size-4" />
              </span>
              <span className={s.fieldBody}>
                <span className={s.fieldLabel}>{t('searchBar.location')}</span>
                <Select
                  value={draft.location}
                  onValueChange={(value) => setLocation(value as HeroLocationOption)}
                >
                  <SelectTrigger
                    className={s.selectTrigger}
                    aria-label={t('searchBar.location')}
                    hideChevron
                  >
                    <SelectValue placeholder={t('searchBar.location')}>
                      {draft.location === 'near-me'
                        ? nearMeLabel
                        : tLoc(locationLabelKey[draft.location])}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {locationOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option === 'near-me'
                          ? nearMeLabel
                          : tLoc(locationLabelKey[option])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </span>
              <ChevronDown className={s.fieldChevron} aria-hidden="true" />
            </div>

            <span className={s.fieldDivider} aria-hidden="true" />

            {/* ¿Cuándo? */}
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
