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
 * Cada categoría tiene un tono pastel asignado para que el grid resulte
 * colorido y diverso. El orden alterna tonos cálidos y fríos para evitar
 * "muros" de un mismo color.
 */
const categories: CategoryItem[] = [
  { slug: 'peluqueria', icon: Scissors, tone: 'rose' },
  { slug: 'masajes', icon: HandHelping, tone: 'sky' },
  { slug: 'padel', icon: Trophy, tone: 'sage' },
  { slug: 'manicura', icon: Sparkles, tone: 'peach' },
  { slug: 'gimnasio', icon: Dumbbell, tone: 'lilac' },
  { slug: 'estetica', icon: Heart, tone: 'rose' },
  { slug: 'yoga', icon: Flower2, tone: 'sage' },
  { slug: 'depilacion', icon: Sparkles, tone: 'butter' },
];

/**
 * Grid de categorías populares de la landing.
 *
 * Diseño: cards pastel sólidas con icono y nombre **siempre visibles**.
 * El hover añade lift + flecha pero no es necesario para entender la
 * card. Cada card linka a `/buscar?cat={slug}`.
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

        <div className={s.grid}>
          {categories.map((cat) => {
            const Icon = cat.icon;
            const tone = categoryToneStyles[cat.tone];
            return (
              <Link
                key={cat.slug}
                href={`/buscar?cat=${cat.slug}`}
                className={`${s.card} ${tone.card}`}
                aria-label={t(cat.slug)}
              >
                <span className={s.iconWrap} aria-hidden="true">
                  <Icon className={`size-5 md:size-6 ${tone.icon}`} />
                </span>
                <span className={s.arrowWrap} aria-hidden="true">
                  <ArrowUpRight className="size-4" />
                </span>
                <span className={`${s.title2} ${tone.title}`}>{t(cat.slug)}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
