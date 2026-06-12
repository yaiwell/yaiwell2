/**
 * Jerarquía completa de categorías → tipos → subtipos.
 *
 * El alta real de servicios (`/panel/servicios/nuevo`) ya consulta BD
 * desde 2026-06-12 vía `getCategoriesTree`. Este módulo se mantiene
 * como **fixture de tests** del `AddServiceForm`; los tipos viven junto
 * al componente que los consume.
 */

import type {
  CategoryRoot,
  CategorySubtype,
  CategoryType,
} from '@/components/features/provider-panel/AddServiceForm/AddServiceForm.types';

// Re-export para no romper imports antiguos.
export type { CategoryRoot, CategorySubtype, CategoryType };

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
          { id: 'cat-nails-gel', slug: 'gel', name: { es: 'Gel', ca: 'Gel' } },
          { id: 'cat-nails-acrylic', slug: 'acrilica', name: { es: 'Acrílica', ca: 'Acrílica' } },
          { id: 'cat-nails-pedicure', slug: 'pedicura', name: { es: 'Pedicura', ca: 'Pedicura' } },
        ],
      },
      {
        id: 'cat-makeup',
        slug: 'maquillaje',
        name: { es: 'Maquillaje', ca: 'Maquillatge' },
        subtypes: [
          { id: 'cat-makeup-day', slug: 'dia', name: { es: 'De día', ca: 'De dia' } },
          { id: 'cat-makeup-event', slug: 'evento', name: { es: 'Evento', ca: 'Esdeveniment' } },
          { id: 'cat-makeup-bridal', slug: 'novia', name: { es: 'Novia', ca: 'Núvia' } },
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
        slug: 'tratamientos-faciales',
        name: { es: 'Tratamientos faciales', ca: 'Tractaments facials' },
        subtypes: [
          { id: 'cat-facial-clean', slug: 'limpieza', name: { es: 'Limpieza', ca: 'Neteja' } },
          {
            id: 'cat-facial-hydration',
            slug: 'hidratacion',
            name: { es: 'Hidratación', ca: 'Hidratació' },
          },
          {
            id: 'cat-facial-antiage',
            slug: 'antiedad',
            name: { es: 'Antiedad', ca: 'Antienvelliment' },
          },
        ],
      },
      {
        id: 'cat-body',
        slug: 'tratamientos-corporales',
        name: { es: 'Tratamientos corporales', ca: 'Tractaments corporals' },
        subtypes: [
          { id: 'cat-body-massage', slug: 'masaje', name: { es: 'Masaje', ca: 'Massatge' } },
          { id: 'cat-body-wrap', slug: 'envoltura', name: { es: 'Envoltura', ca: 'Embolcall' } },
          {
            id: 'cat-body-cellulite',
            slug: 'anticelulitico',
            name: { es: 'Anticelulítico', ca: 'Anticelulític' },
          },
        ],
      },
      {
        id: 'cat-hair-removal',
        slug: 'depilacion',
        name: { es: 'Depilación', ca: 'Depilació' },
        subtypes: [
          { id: 'cat-hr-wax', slug: 'cera', name: { es: 'Con cera', ca: 'Amb cera' } },
          { id: 'cat-hr-laser', slug: 'laser', name: { es: 'Láser', ca: 'Làser' } },
          { id: 'cat-hr-ipl', slug: 'ipl', name: { es: 'IPL', ca: 'IPL' } },
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
          {
            id: 'cat-massage-relax',
            slug: 'relajante',
            name: { es: 'Relajante', ca: 'Relaxant' },
          },
          {
            id: 'cat-massage-deep',
            slug: 'descontracturante',
            name: { es: 'Descontracturante', ca: 'Descontracturant' },
          },
          { id: 'cat-massage-sport', slug: 'deportivo', name: { es: 'Deportivo', ca: 'Esportiu' } },
        ],
      },
      {
        id: 'cat-therapy',
        slug: 'terapias',
        name: { es: 'Terapias', ca: 'Teràpies' },
        subtypes: [
          {
            id: 'cat-therapy-acu',
            slug: 'acupuntura',
            name: { es: 'Acupuntura', ca: 'Acupuntura' },
          },
          {
            id: 'cat-therapy-reflex',
            slug: 'reflexologia',
            name: { es: 'Reflexología', ca: 'Reflexologia' },
          },
        ],
      },
      {
        id: 'cat-spa',
        slug: 'spa',
        name: { es: 'Spa', ca: 'Spa' },
        subtypes: [
          { id: 'cat-spa-sauna', slug: 'sauna', name: { es: 'Sauna', ca: 'Sauna' } },
          { id: 'cat-spa-circuit', slug: 'circuito', name: { es: 'Circuito', ca: 'Circuit' } },
          {
            id: 'cat-spa-hammam',
            slug: 'hammam',
            name: { es: 'Hammam', ca: 'Hammam' },
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
        id: 'cat-gym',
        slug: 'gimnasios',
        name: { es: 'Gimnasios', ca: 'Gimnasos' },
        subtypes: [
          {
            id: 'cat-gym-trainer',
            slug: 'entrenador-personal',
            name: { es: 'Entrenador personal', ca: 'Entrenador personal' },
          },
          {
            id: 'cat-gym-functional',
            slug: 'funcional',
            name: { es: 'Funcional', ca: 'Funcional' },
          },
        ],
      },
      {
        id: 'cat-classes',
        slug: 'clases',
        name: { es: 'Clases', ca: 'Classes' },
        subtypes: [
          { id: 'cat-class-yoga', slug: 'yoga', name: { es: 'Yoga', ca: 'Ioga' } },
          { id: 'cat-class-pilates', slug: 'pilates', name: { es: 'Pilates', ca: 'Pilates' } },
          { id: 'cat-class-spinning', slug: 'spinning', name: { es: 'Spinning', ca: 'Spinning' } },
        ],
      },
      {
        id: 'cat-courts',
        slug: 'pistas',
        name: { es: 'Pistas', ca: 'Pistes' },
        subtypes: [
          { id: 'cat-court-padel', slug: 'padel', name: { es: 'Pádel', ca: 'Pàdel' } },
          { id: 'cat-court-tennis', slug: 'tenis', name: { es: 'Tenis', ca: 'Tennis' } },
        ],
      },
    ],
  },
];
