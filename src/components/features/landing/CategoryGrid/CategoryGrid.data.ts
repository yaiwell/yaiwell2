import { Dumbbell, Flower2, HandHelping, Heart, Scissors, Sparkles } from 'lucide-react';

import type { CategoryItem } from './CategoryGrid.types';

/**
 * Catálogo de categorías destacadas en la landing.
 *
 * Cada categoría combina foto Unsplash (verificada 200) + tono pastel.
 * El orden alterna tonos cálidos y fríos para evitar bloques de un solo
 * color, y coincide con `landingCategorySlugs` (Hero) a propósito.
 *
 * Vive fuera del `.tsx` para que el test de regresión de slugs pueda
 * importarlo sin montar el componente ni el árbol de next-intl.
 *
 * Las URLs piden 800w porque `next/image` sólo puede reducir, no ampliar:
 * es el ancho máximo que la card necesita en pantallas 2x.
 */
export const categoryItems: CategoryItem[] = [
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
    slug: 'manicura-pedicura',
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
    tone: 'sage',
    imageUrl:
      'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&q=80&auto=format&fit=crop',
  },
  {
    slug: 'yoga',
    icon: Flower2,
    tone: 'butter',
    imageUrl:
      'https://images.unsplash.com/photo-1545389336-cf090694435e?w=800&q=80&auto=format&fit=crop',
  },
];
