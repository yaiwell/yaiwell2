import {
  ArrowUpRight,
  Dumbbell,
  Flower2,
  HandHelping,
  Heart,
  Scissors,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';

import { categoryGridStyles as s, categoryToneStyles } from './CategoryGrid.styles';
import type { CategoryItem } from './CategoryGrid.types';

/**
 * Catálogo de categorías destacadas en la landing.
 *
 * Cada categoría combina foto Unsplash (verificada 200) + tono pastel.
 * El orden alterna tonos cálidos y fríos para evitar bloques de un solo
 * color. Las URLs sólo cargan tamaño 800w para no saturar la red.
 */
const categories: CategoryItem[] = [
  {
    slug: 'peluqueria',
    icon: Scissors,
    tone: 'rose',
    imageUrl:
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80&auto=format&fit=crop',
  },
  {
    slug: 'masajes',
    icon: HandHelping,
    tone: 'sky',
    imageUrl:
      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&q=80&auto=format&fit=crop',
  },
  {
    slug: 'padel',
    icon: Trophy,
    tone: 'sage',
    imageUrl:
      'https://images.unsplash.com/photo-1554244933-d876deb6b2ff?w=800&q=80&auto=format&fit=crop',
  },
  {
    slug: 'manicura',
    icon: Sparkles,
    tone: 'peach',
    imageUrl:
      'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80&auto=format&fit=crop',
  },
  {
    slug: 'gimnasio',
    icon: Dumbbell,
    tone: 'lilac',
    imageUrl:
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80&auto=format&fit=crop',
  },
  {
    slug: 'estetica',
    icon: Heart,
    tone: 'rose',
    imageUrl:
      'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&q=80&auto=format&fit=crop',
  },
  {
    slug: 'yoga',
    icon: Flower2,
    tone: 'sage',
    imageUrl:
      'https://images.unsplash.com/photo-1545389336-cf090694435e?w=800&q=80&auto=format&fit=crop',
  },
  {
    slug: 'depilacion',
    icon: Sparkles,
    tone: 'butter',
    imageUrl:
      'https://images.unsplash.com/photo-1599447421416-3414500d18a5?w=800&q=80&auto=format&fit=crop',
  },
];

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
          {categories.map((cat) => {
            const Icon = cat.icon;
            const tone = categoryToneStyles[cat.tone];
            return (
              <Link
                key={cat.slug}
                href={`/buscar?cat=${cat.slug}`}
                className={s.card}
                aria-label={t(cat.slug)}
                data-component={`category-card-${cat.slug}`}
              >
                <span className={s.imageWrap} aria-hidden="true">
                  <span className={s.image} style={{ backgroundImage: `url(${cat.imageUrl})` }} />
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
                  <span className={`${s.title2} ${tone.title}`}>{t(cat.slug)}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
