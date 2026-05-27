/**
 * Jerarquía completa de categorías → tipos → subtipos, usada por el
 * formulario de "Añadir servicio" del panel de proveedor.
 *
 * A diferencia de `fakeCategories` (lista plana con `parentId`), aquí
 * exponemos la estructura ya anidada para que el componente de cascada
 * pueda recorrerla sin necesidad de re-construir el árbol en cliente.
 *
 * En producción esta jerarquía vendrá de la tabla `Category` con un
 * `recursive CTE` o desde un caché materializado por idioma.
 */

import type { LocalizedText } from '@/types/domain';

/** Subtipo de servicio (nivel 3 — hoja del árbol). */
export interface CategorySubtype {
  id: string;
  slug: string;
  name: LocalizedText;
}

/** Tipo de servicio (nivel 2 — agrupa subtipos). */
export interface CategoryType {
  id: string;
  slug: string;
  name: LocalizedText;
  subtypes: CategorySubtype[];
}

/** Categoría raíz (nivel 1 — agrupa tipos). */
export interface CategoryRoot {
  id: string;
  slug: string;
  name: LocalizedText;
  types: CategoryType[];
}

/**
 * Árbol jerárquico completo de categorías.
 *
 * Cobertura suficiente para que el formulario de alta de servicio en
 * la demo sea representativo: 4 raíces, 12 tipos, 30+ subtipos.
 */
export const categoriesHierarchy: CategoryRoot[] = [
  {
    id: 'cat-beauty',
    slug: 'belleza',
    name: { es: 'Belleza', ca: 'Bellesa' },
    types: [
      {
        id: 'cat-hair',
        slug: 'peluqueria',
        name: { es: 'Peluquería', ca: 'Perruqueria' },
        subtypes: [
          { id: 'cat-hair-cut', slug: 'corte', name: { es: 'Corte', ca: 'Tall' } },
          { id: 'cat-hair-color', slug: 'color', name: { es: 'Color', ca: 'Color' } },
          { id: 'cat-hair-styling', slug: 'peinado', name: { es: 'Peinado', ca: 'Pentinat' } },
          {
            id: 'cat-hair-treatment',
            slug: 'tratamiento',
            name: { es: 'Tratamiento', ca: 'Tractament' },
          },
          {
            id: 'cat-hair-children',
            slug: 'infantil',
            name: { es: 'Corte infantil', ca: 'Tall infantil' },
          },
        ],
      },
      {
        id: 'cat-nails',
        slug: 'manicura',
        name: { es: 'Manicura y pedicura', ca: 'Manicura i pedicura' },
        subtypes: [
          { id: 'cat-nails-classic', slug: 'clasica', name: { es: 'Clásica', ca: 'Clàssica' } },
          {
            id: 'cat-nails-semi',
            slug: 'semipermanente',
            name: { es: 'Semipermanente', ca: 'Semipermanent' },
          },
          { id: 'cat-nails-gel', slug: 'gel', name: { es: 'Gel y acrílico', ca: 'Gel i acrílic' } },
          { id: 'cat-nails-art', slug: 'nail-art', name: { es: 'Nail art', ca: 'Nail art' } },
          { id: 'cat-nails-pedi', slug: 'pedicura', name: { es: 'Pedicura', ca: 'Pedicura' } },
        ],
      },
      {
        id: 'cat-makeup',
        slug: 'maquillaje',
        name: { es: 'Maquillaje', ca: 'Maquillatge' },
        subtypes: [
          { id: 'cat-makeup-day', slug: 'dia', name: { es: 'Día', ca: 'Dia' } },
          { id: 'cat-makeup-night', slug: 'noche', name: { es: 'Noche', ca: 'Nit' } },
          { id: 'cat-makeup-bride', slug: 'novia', name: { es: 'Novia', ca: 'Núvia' } },
          {
            id: 'cat-makeup-editorial',
            slug: 'editorial',
            name: { es: 'Editorial', ca: 'Editorial' },
          },
        ],
      },
    ],
  },
  {
    id: 'cat-aesthetics',
    slug: 'estetica',
    name: { es: 'Estética', ca: 'Estètica' },
    types: [
      {
        id: 'cat-facial',
        slug: 'facial',
        name: { es: 'Facial', ca: 'Facial' },
        subtypes: [
          {
            id: 'cat-facial-clean',
            slug: 'limpieza',
            name: { es: 'Limpieza profunda', ca: 'Neteja profunda' },
          },
          {
            id: 'cat-facial-hydra',
            slug: 'hidratacion',
            name: { es: 'Hidratación', ca: 'Hidratació' },
          },
          {
            id: 'cat-facial-anti',
            slug: 'antiedad',
            name: { es: 'Antiedad', ca: 'Antienvelliment' },
          },
          {
            id: 'cat-facial-peeling',
            slug: 'peeling',
            name: { es: 'Peeling', ca: 'Peeling' },
          },
        ],
      },
      {
        id: 'cat-body',
        slug: 'corporal',
        name: { es: 'Corporal', ca: 'Corporal' },
        subtypes: [
          {
            id: 'cat-body-drain',
            slug: 'drenaje',
            name: { es: 'Drenaje linfático', ca: 'Drenatge limfàtic' },
          },
          {
            id: 'cat-body-reduce',
            slug: 'reductor',
            name: { es: 'Reductor', ca: 'Reductor' },
          },
          {
            id: 'cat-body-anti',
            slug: 'anticelulitico',
            name: { es: 'Anticelulítico', ca: 'Anticel·lulític' },
          },
        ],
      },
      {
        id: 'cat-hair-removal',
        slug: 'depilacion',
        name: { es: 'Depilación', ca: 'Depilació' },
        subtypes: [
          { id: 'cat-hr-laser', slug: 'laser', name: { es: 'Láser', ca: 'Làser' } },
          { id: 'cat-hr-wax', slug: 'cera', name: { es: 'Cera', ca: 'Cera' } },
          { id: 'cat-hr-photo', slug: 'fotodepilacion', name: { es: 'IPL', ca: 'IPL' } },
        ],
      },
    ],
  },
  {
    id: 'cat-wellness',
    slug: 'bienestar',
    name: { es: 'Bienestar', ca: 'Benestar' },
    types: [
      {
        id: 'cat-massage',
        slug: 'masajes',
        name: { es: 'Masajes', ca: 'Massatges' },
        subtypes: [
          { id: 'cat-massage-relax', slug: 'relajante', name: { es: 'Relajante', ca: 'Relaxant' } },
          { id: 'cat-massage-sport', slug: 'deportivo', name: { es: 'Deportivo', ca: 'Esportiu' } },
          { id: 'cat-massage-thai', slug: 'tailandes', name: { es: 'Tailandés', ca: 'Tailandès' } },
          { id: 'cat-massage-couple', slug: 'pareja', name: { es: 'En pareja', ca: 'En parella' } },
        ],
      },
      {
        id: 'cat-spa',
        slug: 'spa',
        name: { es: 'Spa', ca: 'Spa' },
        subtypes: [
          {
            id: 'cat-spa-water',
            slug: 'aguas',
            name: { es: 'Circuito de aguas', ca: 'Circuit d’aigües' },
          },
          { id: 'cat-spa-sauna', slug: 'sauna', name: { es: 'Sauna', ca: 'Sauna' } },
          { id: 'cat-spa-ritual', slug: 'ritual', name: { es: 'Ritual', ca: 'Ritual' } },
        ],
      },
      {
        id: 'cat-therapies',
        slug: 'terapias',
        name: { es: 'Terapias', ca: 'Teràpies' },
        subtypes: [
          { id: 'cat-th-reiki', slug: 'reiki', name: { es: 'Reiki', ca: 'Reiki' } },
          {
            id: 'cat-th-aroma',
            slug: 'aromaterapia',
            name: { es: 'Aromaterapia', ca: 'Aromateràpia' },
          },
        ],
      },
    ],
  },
  {
    id: 'cat-sport',
    slug: 'deporte',
    name: { es: 'Deporte', ca: 'Esport' },
    types: [
      {
        id: 'cat-padel',
        slug: 'padel',
        name: { es: 'Pádel', ca: 'Pàdel' },
        subtypes: [
          {
            id: 'cat-padel-court',
            slug: 'pista',
            name: { es: 'Alquiler de pista', ca: 'Lloguer de pista' },
          },
          { id: 'cat-padel-class', slug: 'clase', name: { es: 'Clase', ca: 'Classe' } },
        ],
      },
      {
        id: 'cat-tennis',
        slug: 'tenis',
        name: { es: 'Tenis', ca: 'Tennis' },
        subtypes: [
          {
            id: 'cat-tennis-court',
            slug: 'pista',
            name: { es: 'Alquiler de pista', ca: 'Lloguer de pista' },
          },
          { id: 'cat-tennis-class', slug: 'clase', name: { es: 'Clase', ca: 'Classe' } },
        ],
      },
      {
        id: 'cat-gym',
        slug: 'gimnasio',
        name: { es: 'Gimnasio', ca: 'Gimnàs' },
        subtypes: [
          {
            id: 'cat-gym-pt',
            slug: 'personal',
            name: { es: 'Personal training', ca: 'Personal training' },
          },
          {
            id: 'cat-gym-group',
            slug: 'grupal',
            name: { es: 'Clase grupal', ca: 'Classe grupal' },
          },
        ],
      },
      {
        id: 'cat-yoga',
        slug: 'yoga',
        name: { es: 'Yoga', ca: 'Ioga' },
        subtypes: [
          {
            id: 'cat-yoga-group',
            slug: 'grupal',
            name: { es: 'Clase grupal', ca: 'Classe grupal' },
          },
          {
            id: 'cat-yoga-private',
            slug: 'particular',
            name: { es: 'Particular', ca: 'Particular' },
          },
        ],
      },
    ],
  },
];

/**
 * Busca una categoría raíz por su id en la jerarquía.
 * Devuelve `undefined` si no existe.
 */
export function findCategoryRoot(id: string): CategoryRoot | undefined {
  return categoriesHierarchy.find((c) => c.id === id);
}

/**
 * Busca un tipo de categoría dado su id raíz y su propio id.
 */
export function findCategoryType(rootId: string, typeId: string): CategoryType | undefined {
  return findCategoryRoot(rootId)?.types.find((t) => t.id === typeId);
}
