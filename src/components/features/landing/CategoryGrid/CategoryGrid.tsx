import { Dumbbell, Flower2, HandHelping, Heart, Scissors, Sparkles, Trophy } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';

import { categoryGridStyles as s } from './CategoryGrid.styles';
import type { CategoryItem } from './CategoryGrid.types';

/**
 * Catálogo hardcoded de categorías destacadas en la landing.
 *
 * Justificación de hardcoding: el módulo `@/lib/fake-data` lo está
 * construyendo otro agente en paralelo y no queremos romper el build si
 * todavía no ha publicado los exports. Cuando esté disponible iteraremos
 * para consumir de allí (ver TODO.md).
 *
 * Las URLs de Unsplash están verificadas con curl (HTTP 200).
 */
const categories: CategoryItem[] = [
  {
    slug: 'peluqueria',
    icon: Scissors,
    imageUrl:
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80&auto=format&fit=crop',
  },
  {
    slug: 'masajes',
    icon: HandHelping,
    imageUrl:
      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&q=80&auto=format&fit=crop',
  },
  {
    slug: 'padel',
    icon: Trophy,
    imageUrl:
      'https://images.unsplash.com/photo-1554244933-d876deb6b2ff?w=800&q=80&auto=format&fit=crop',
  },
  {
    slug: 'manicura',
    icon: Sparkles,
    imageUrl:
      'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80&auto=format&fit=crop',
  },
  {
    slug: 'gimnasio',
    icon: Dumbbell,
    imageUrl:
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80&auto=format&fit=crop',
  },
  {
    slug: 'estetica',
    icon: Heart,
    imageUrl:
      'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&q=80&auto=format&fit=crop',
  },
  {
    slug: 'yoga',
    icon: Flower2,
    imageUrl:
      'https://images.unsplash.com/photo-1545389336-cf090694435e?w=800&q=80&auto=format&fit=crop',
  },
  {
    slug: 'depilacion',
    icon: Sparkles,
    imageUrl:
      'https://images.unsplash.com/photo-1599447421416-3414500d18a5?w=800&q=80&auto=format&fit=crop',
  },
];

/**
 * Grid de categorías populares de la landing.
 *
 * Cada card linka a `/buscar?cat={slug}`. La página de búsqueda (otro
 * agente) recogerá ese query param para preseleccionar el filtro.
 */
export function CategoryGrid() {
  const t = useTranslations('home.categories');

  return (
    <section className={s.root}>
      <div className={s.container}>
        <header className={s.header}>
          <h2 className={s.title}>{t('title')}</h2>
          <p className={s.subtitle}>{t('subtitle')}</p>
        </header>

        <div className={s.scroller}>
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.slug}
                href={`/buscar?cat=${cat.slug}`}
                className={s.card}
                aria-label={t(cat.slug)}
              >
                <span
                  className={s.cardImage}
                  style={{ backgroundImage: `url(${cat.imageUrl})` }}
                  aria-hidden="true"
                />
                <span className={s.cardOverlay} aria-hidden="true" />
                <span className={s.cardContent}>
                  <span className={s.cardIcon} aria-hidden="true">
                    <Icon className="size-4" />
                  </span>
                  <span className={s.cardTitle}>{t(cat.slug)}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
