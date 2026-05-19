import type { Category } from '@/types/domain';

/**
 * Catálogo jerárquico de categorías del marketplace.
 *
 * Hasta 3 niveles cuando aplica (ej. Belleza → Peluquería → Corte).
 * Las raíces tienen `parentId: null`. Los iconos son nombres de
 * componentes de Lucide React; el render se hace dinámicamente desde
 * un mapa en el componente que los pinta.
 *
 * En BD real estas categorías vivirán en una tabla `Category` con
 * relación reflexiva y se traducirán igual con `LocalizedText` JSONB.
 */
export const fakeCategories: Category[] = [
  // ---------- Raíces ----------
  {
    id: 'cat-beauty',
    slug: 'belleza',
    name: { es: 'Belleza', ca: 'Bellesa' },
    parentId: null,
    icon: 'Sparkles',
  },
  {
    id: 'cat-aesthetics',
    slug: 'estetica',
    name: { es: 'Estética', ca: 'Estètica' },
    parentId: null,
    icon: 'Flower2',
  },
  {
    id: 'cat-wellness',
    slug: 'bienestar',
    name: { es: 'Bienestar', ca: 'Benestar' },
    parentId: null,
    icon: 'Leaf',
  },
  {
    id: 'cat-sport',
    slug: 'deporte',
    name: { es: 'Deporte', ca: 'Esport' },
    parentId: null,
    icon: 'Dumbbell',
  },

  // ---------- Belleza ----------
  {
    id: 'cat-hair',
    slug: 'peluqueria',
    name: { es: 'Peluquería', ca: 'Perruqueria' },
    parentId: 'cat-beauty',
    icon: 'Scissors',
  },
  {
    id: 'cat-hair-cut',
    slug: 'peluqueria-corte',
    name: { es: 'Corte', ca: 'Tall' },
    parentId: 'cat-hair',
    icon: 'Scissors',
  },
  {
    id: 'cat-hair-color',
    slug: 'peluqueria-color',
    name: { es: 'Color', ca: 'Color' },
    parentId: 'cat-hair',
    icon: 'Palette',
  },
  {
    id: 'cat-hair-styling',
    slug: 'peluqueria-peinado',
    name: { es: 'Peinado', ca: 'Pentinat' },
    parentId: 'cat-hair',
    icon: 'Brush',
  },
  {
    id: 'cat-nails',
    slug: 'manicura-pedicura',
    name: { es: 'Manicura y pedicura', ca: 'Manicura i pedicura' },
    parentId: 'cat-beauty',
    icon: 'Hand',
  },
  {
    id: 'cat-makeup',
    slug: 'maquillaje',
    name: { es: 'Maquillaje', ca: 'Maquillatge' },
    parentId: 'cat-beauty',
    icon: 'Wand2',
  },

  // ---------- Estética ----------
  {
    id: 'cat-facial',
    slug: 'facial',
    name: { es: 'Facial', ca: 'Facial' },
    parentId: 'cat-aesthetics',
    icon: 'Smile',
  },
  {
    id: 'cat-body',
    slug: 'corporal',
    name: { es: 'Corporal', ca: 'Corporal' },
    parentId: 'cat-aesthetics',
    icon: 'Heart',
  },
  {
    id: 'cat-hair-removal',
    slug: 'depilacion',
    name: { es: 'Depilación', ca: 'Depilació' },
    parentId: 'cat-aesthetics',
    icon: 'Zap',
  },

  // ---------- Bienestar ----------
  {
    id: 'cat-massage',
    slug: 'masajes',
    name: { es: 'Masajes', ca: 'Massatges' },
    parentId: 'cat-wellness',
    icon: 'Hand',
  },
  {
    id: 'cat-massage-relax',
    slug: 'masaje-relajante',
    name: { es: 'Relajante', ca: 'Relaxant' },
    parentId: 'cat-massage',
    icon: 'Hand',
  },
  {
    id: 'cat-massage-sport',
    slug: 'masaje-deportivo',
    name: { es: 'Deportivo', ca: 'Esportiu' },
    parentId: 'cat-massage',
    icon: 'Hand',
  },
  {
    id: 'cat-massage-thai',
    slug: 'masaje-tailandes',
    name: { es: 'Tailandés', ca: 'Tailandès' },
    parentId: 'cat-massage',
    icon: 'Hand',
  },
  {
    id: 'cat-therapies',
    slug: 'terapias',
    name: { es: 'Terapias', ca: 'Teràpies' },
    parentId: 'cat-wellness',
    icon: 'HeartPulse',
  },
  {
    id: 'cat-spa',
    slug: 'spa',
    name: { es: 'Spa', ca: 'Spa' },
    parentId: 'cat-wellness',
    icon: 'Bath',
  },

  // ---------- Deporte ----------
  {
    id: 'cat-padel',
    slug: 'padel',
    name: { es: 'Pádel', ca: 'Pàdel' },
    parentId: 'cat-sport',
    icon: 'CircleDot',
  },
  {
    id: 'cat-tennis',
    slug: 'tenis',
    name: { es: 'Tenis', ca: 'Tennis' },
    parentId: 'cat-sport',
    icon: 'CircleDot',
  },
  {
    id: 'cat-gym',
    slug: 'gimnasio',
    name: { es: 'Gimnasio', ca: 'Gimnàs' },
    parentId: 'cat-sport',
    icon: 'Dumbbell',
  },
  {
    id: 'cat-yoga',
    slug: 'yoga',
    name: { es: 'Yoga', ca: 'Ioga' },
    parentId: 'cat-sport',
    icon: 'Flower',
  },
];

/**
 * Devuelve las categorías raíz (parentId === null).
 * Útil para mostrar el primer nivel de filtros tipo "chips".
 */
export function getRootCategories(): Category[] {
  return fakeCategories.filter((c) => c.parentId === null);
}

/**
 * Busca una categoría por su slug. Devuelve `undefined` si no existe.
 */
export function getCategoryBySlug(slug: string): Category | undefined {
  return fakeCategories.find((c) => c.slug === slug);
}
