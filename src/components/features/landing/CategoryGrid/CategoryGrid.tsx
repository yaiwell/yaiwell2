import { ArrowUpRight } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';

import { landingCategoryLabelKey } from '../categories';

import { categoryItems } from './CategoryGrid.data';
import { categoryGridStyles as s, categoryToneStyles } from './CategoryGrid.styles';

/**
 * Anchos que ocupa cada card según viewport, para que el navegador elija
 * la variante correcta del `srcset`.
 *
 *  - <768px: grid de 2 columnas → ~50vw.
 *  - <1280px: grid de 4 columnas → ~25vw.
 *  - A partir de ahí el contenedor tope en `max-w-7xl`, así que la card
 *    se queda fija en ~290px y darle un valor absoluto evita descargar
 *    imágenes enormes en monitores anchos.
 */
const CARD_IMAGE_SIZES = '(max-width: 767px) 50vw, (max-width: 1279px) 25vw, 290px';

/**
 * Grid de categorías populares de la landing.
 *
 * Diseño: card con foto en la mitad superior y bloque pastel en la mitad
 * inferior con icono + nombre **siempre visibles**. Resuelve el feedback
 * previo (sin foto se veía plano; con foto y texto encima sólo se leía en
 * hover). Cada card linka a `/buscar?cat={slug}`.
 */
export function CategoryGrid() {
  const t = useTranslations('home.categories');

  return (
    <section className={s.root} data-component="category-grid">
      <div className={s.container}>
        <header className={s.header} data-component="category-grid-header">
          <h2 className={s.title}>{t('title')}</h2>
          <p className={s.subtitle}>{t('subtitle')}</p>
        </header>

        <div className={s.grid}>
          {categoryItems.map((cat) => {
            const Icon = cat.icon;
            const tone = categoryToneStyles[cat.tone];
            const label = t(landingCategoryLabelKey[cat.slug]);
            return (
              <Link
                key={cat.slug}
                href={`/buscar?cat=${cat.slug}`}
                className={s.card}
                aria-label={label}
                data-component={`category-card-${cat.slug}`}
              >
                <span className={s.imageWrap} aria-hidden="true">
                  {/* `alt=""` deliberado: la foto es puramente decorativa.
                      El nombre de la categoría ya se anuncia dos veces —
                      en el `aria-label` del enlace y en el texto visible
                      del bloque pastel— así que describirla otra vez sólo
                      añadiría ruido al lector de pantalla. Por eso el
                      wrapper se mantiene además `aria-hidden`.

                      `next/image` con `fill` + `sizes` para que la foto
                      pase por la pipeline de optimización (AVIF/WebP y
                      srcset) en lugar de servir el JPG original como
                      `background-image`. Sin `priority`: va por debajo
                      del LCP y debe cargar en diferido. */}
                  <Image
                    src={cat.imageUrl}
                    alt=""
                    fill
                    sizes={CARD_IMAGE_SIZES}
                    className={s.image}
                  />
                  {/* Tinte pastel sobre la foto para coordinar con el bloque
                      inferior y dar identidad cromática a la categoría. */}
                  <span className={`${s.imageTint} ${tone.tint}`} />
                </span>
                <span className={s.arrowWrap} aria-hidden="true">
                  <ArrowUpRight className="size-4" />
                </span>
                <span className={`${s.pastelBlock} ${tone.pastel}`}>
                  <span className={s.iconWrap} aria-hidden="true">
                    <Icon className={`size-5 ${tone.icon}`} />
                  </span>
                  <span className={`${s.title2} ${tone.title}`}>{label}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
