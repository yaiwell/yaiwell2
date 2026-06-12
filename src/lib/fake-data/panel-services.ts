/**
 * Servicios ficticios del proveedor activo para el listado del panel.
 *
 * El listado real (`/panel/servicios`) ya consulta BD desde 2026-06-12.
 * Este módulo se mantiene como **fixture de tests** y como respaldo
 * visual rápido si alguna vez se renderiza `ServicesList` sin server.
 *
 * Los tipos `PanelService` / `PanelServiceStatus` viven ahora junto al
 * componente que los consume (`ServicesList.types.ts`) y se reexportan
 * aquí para no romper imports antiguos.
 */

import type {
  PanelService,
  PanelServiceStatus,
} from '@/components/features/provider-panel/ServicesList/ServicesList.types';

// Re-export para no romper imports antiguos del tipo desde la ruta
// fake-data; el lugar canónico es ahora `ServicesList.types.ts`.
export type { PanelService, PanelServiceStatus };

/**
 * Catálogo del proveedor activo (10 servicios).
 *
 * Mezcla representativa de la peluquería `Atelier Norte`: cortes, color,
 * peinado y dos servicios pausados para mostrar la variante visual.
 */
export const fakePanelServices: PanelService[] = [
  {
    id: 'psvc-01',
    name: { es: 'Corte mujer', ca: 'Tall dona' },
    description: {
      es: 'Diagnóstico, lavado con productos botánicos, corte personalizado y secado.',
      ca: 'Diagnòstic, rentat amb productes botànics, tall personalitzat i assecat.',
    },
    categoryLabel: { es: 'Peluquería', ca: 'Perruqueria' },
    durationMinutes: 60,
    priceCents: 5500,
    status: 'active',
    bookingsLast30Days: 58,
  },
  {
    id: 'psvc-02',
    name: { es: 'Corte hombre', ca: 'Tall home' },
    description: {
      es: 'Corte clásico o moderno con producto de acabado incluido.',
      ca: 'Tall clàssic o modern amb producte d’acabat inclòs.',
    },
    categoryLabel: { es: 'Peluquería', ca: 'Perruqueria' },
    durationMinutes: 45,
    priceCents: 3800,
    status: 'active',
    bookingsLast30Days: 47,
  },
  {
    id: 'psvc-03',
    name: { es: 'Corte niños', ca: 'Tall nens' },
    description: {
      es: 'Corte rápido y cuidado para los más pequeños, con caramelo al acabar.',
      ca: 'Tall ràpid i amb cura per als més petits, amb caramel en acabar.',
    },
    categoryLabel: { es: 'Peluquería', ca: 'Perruqueria' },
    durationMinutes: 30,
    priceCents: 2500,
    status: 'active',
    bookingsLast30Days: 22,
  },
  {
    id: 'psvc-04',
    name: { es: 'Color completo', ca: 'Color complet' },
    description: {
      es: 'Coloración integral con marcas premium libres de amoníaco.',
      ca: 'Coloració integral amb marques premium lliures d’amoníac.',
    },
    categoryLabel: { es: 'Peluquería', ca: 'Perruqueria' },
    durationMinutes: 120,
    priceCents: 9500,
    status: 'active',
    bookingsLast30Days: 31,
  },
  {
    id: 'psvc-05',
    name: { es: 'Mechas balayage', ca: 'Metxes balayage' },
    description: {
      es: 'Técnica de mechas pintadas a mano para un degradado natural.',
      ca: 'Tècnica de metxes pintades a mà per a un degradat natural.',
    },
    categoryLabel: { es: 'Peluquería', ca: 'Perruqueria' },
    durationMinutes: 150,
    priceCents: 12500,
    status: 'active',
    bookingsLast30Days: 18,
  },
  {
    id: 'psvc-06',
    name: { es: 'Peinado evento', ca: 'Pentinat esdeveniment' },
    description: {
      es: 'Peinado de gala o boda con prueba previa opcional.',
      ca: 'Pentinat de gala o casament amb prova prèvia opcional.',
    },
    categoryLabel: { es: 'Peluquería', ca: 'Perruqueria' },
    durationMinutes: 75,
    priceCents: 6500,
    status: 'active',
    bookingsLast30Days: 12,
  },
  {
    id: 'psvc-07',
    name: { es: 'Tratamiento de hidratación', ca: 'Tractament d’hidratació' },
    description: {
      es: 'Mascarilla reparadora con queratina y vapor durante 20 minutos.',
      ca: 'Mascareta reparadora amb queratina i vapor durant 20 minuts.',
    },
    categoryLabel: { es: 'Peluquería', ca: 'Perruqueria' },
    durationMinutes: 45,
    priceCents: 4200,
    status: 'active',
    bookingsLast30Days: 25,
  },
  {
    id: 'psvc-08',
    name: { es: 'Alisado de keratina', ca: 'Allisat de queratina' },
    description: {
      es: 'Alisado progresivo con keratina vegetal, duración hasta 4 meses.',
      ca: 'Allisat progressiu amb queratina vegetal, durada fins a 4 mesos.',
    },
    categoryLabel: { es: 'Peluquería', ca: 'Perruqueria' },
    durationMinutes: 180,
    priceCents: 15000,
    status: 'active',
    bookingsLast30Days: 9,
  },
  {
    id: 'psvc-09',
    name: { es: 'Recogido novia', ca: 'Recollit núvia' },
    description: {
      es: 'Recogido editorial con prueba previa y retoque el día del evento.',
      ca: 'Recollit editorial amb prova prèvia i retoc el dia de l’esdeveniment.',
    },
    categoryLabel: { es: 'Peluquería', ca: 'Perruqueria' },
    durationMinutes: 90,
    priceCents: 8500,
    status: 'paused',
    bookingsLast30Days: 0,
  },
  {
    id: 'psvc-10',
    name: { es: 'Corte fantasía color', ca: 'Tall fantasia color' },
    description: {
      es: 'Color creativo en mechas con tintes semipermanentes vivos.',
      ca: 'Color creatiu en metxes amb tints semipermanents vius.',
    },
    categoryLabel: { es: 'Peluquería', ca: 'Perruqueria' },
    durationMinutes: 120,
    priceCents: 11000,
    status: 'paused',
    bookingsLast30Days: 0,
  },
];
