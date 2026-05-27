/**
 * Reseñas ficticias recibidas por el proveedor activo, con respuestas
 * opcionales del propio centro.
 *
 * Sirven para alimentar la vista `/panel/valoraciones`. Mantienen forma
 * cercana al tipo `Review` del dominio pero añaden el campo `providerResponse`
 * y `serviceName` para que la lista del panel se pueda renderizar sin
 * lookups adicionales.
 */

/** Respuesta del proveedor a una reseña. */
export interface PanelReviewResponse {
  text: string;
  /** Fecha en que el proveedor publicó la respuesta. */
  respondedAt: Date;
}

/** Reseña enriquecida tal como se muestra en el panel del proveedor. */
export interface PanelReview {
  id: string;
  authorName: string;
  rating: 1 | 2 | 3 | 4 | 5;
  text: string;
  serviceName: string;
  createdAt: Date;
  /** Respuesta del proveedor (si ya ha contestado). */
  providerResponse: PanelReviewResponse | null;
}

/**
 * Fecha de referencia para los `createdAt`. Fija para que la demo sea
 * determinista y no dependa de `Date.now()`.
 */
const REFERENCE_NOW = new Date('2026-05-20T12:00:00.000Z');

/**
 * Devuelve una fecha relativa a `REFERENCE_NOW` restando los días dados.
 */
function daysAgo(days: number): Date {
  const d = new Date(REFERENCE_NOW);
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

/**
 * 12 reseñas recientes del proveedor `Atelier Norte`. Algunas ya tienen
 * respuesta del centro, otras están pendientes de contestar para que la
 * UI pueda renderizar ambos estados.
 */
export const fakePanelReviews: PanelReview[] = [
  {
    id: 'prev-01',
    authorName: 'Marta R.',
    rating: 5,
    text: 'El corte me ha durado un mes con la forma intacta. Marina entendió a la primera lo que buscaba.',
    serviceName: 'Corte mujer',
    createdAt: daysAgo(3),
    providerResponse: {
      text: '¡Gracias Marta! Nos alegra leerte. Te esperamos en la próxima visita.',
      respondedAt: daysAgo(2),
    },
  },
  {
    id: 'prev-02',
    authorName: 'Joan M.',
    rating: 5,
    text: 'Vinc des de Sant Cugat només per tallar-me aquí. Llum natural, música baixeta i acabats impecables.',
    serviceName: 'Corte hombre',
    createdAt: daysAgo(5),
    providerResponse: null,
  },
  {
    id: 'prev-03',
    authorName: 'Núria P.',
    rating: 5,
    text: 'Me hicieron un balayage que parece pintado a mano. El color cae natural en las puntas.',
    serviceName: 'Mechas balayage',
    createdAt: daysAgo(8),
    providerResponse: {
      text: 'Gracias Núria, transmitiremos el comentario al equipo de color.',
      respondedAt: daysAgo(7),
    },
  },
  {
    id: 'prev-04',
    authorName: 'Laia B.',
    rating: 4,
    text: 'Resultat molt bo, però vaig esperar gairebé 15 minuts passada la meva hora.',
    serviceName: 'Corte mujer',
    createdAt: daysAgo(12),
    providerResponse: null,
  },
  {
    id: 'prev-05',
    authorName: 'Pol G.',
    rating: 5,
    text: 'Mejor sitio donde he ido en años. Saben cortar pelo rizado sin masacrarlo.',
    serviceName: 'Corte mujer',
    createdAt: daysAgo(16),
    providerResponse: {
      text: '¡Gracias Pol! El pelo rizado es nuestra pasión, te esperamos.',
      respondedAt: daysAgo(15),
    },
  },
  {
    id: 'prev-06',
    authorName: 'Carmen S.',
    rating: 5,
    text: 'Me peinaron para la boda de mi hija y aguantó toda la noche bailando sevillanas incluidas.',
    serviceName: 'Peinado evento',
    createdAt: daysAgo(20),
    providerResponse: null,
  },
  {
    id: 'prev-07',
    authorName: 'Aitor F.',
    rating: 5,
    text: 'Pedí algo concreto, me lo hicieron sin discutir y encima me sugirieron un acabado que ni me había planteado.',
    serviceName: 'Corte hombre',
    createdAt: daysAgo(25),
    providerResponse: {
      text: 'Gracias Aitor, encantados de leer tu valoración.',
      respondedAt: daysAgo(24),
    },
  },
  {
    id: 'prev-08',
    authorName: 'Helena V.',
    rating: 4,
    text: 'El corte fantàstic. El preu, una mica alt per a un dimecres qualsevol, però la qualitat hi és.',
    serviceName: 'Corte mujer',
    createdAt: daysAgo(31),
    providerResponse: null,
  },
  {
    id: 'prev-09',
    authorName: 'Berta A.',
    rating: 5,
    text: 'Cambié de cabeza con un cambio de color radical y todo el equipo me cuidó como si fuera de la familia.',
    serviceName: 'Color completo',
    createdAt: daysAgo(38),
    providerResponse: {
      text: 'Gracias Berta, fue un placer acompañarte en ese cambio.',
      respondedAt: daysAgo(37),
    },
  },
  {
    id: 'prev-10',
    authorName: 'Marc D.',
    rating: 5,
    text: 'Tall d’home clàssic fet amb cura, sense presses i amb un afaitat de coll que ja no es veu enlloc.',
    serviceName: 'Corte hombre',
    createdAt: daysAgo(45),
    providerResponse: null,
  },
  {
    id: 'prev-11',
    authorName: 'Roger D.',
    rating: 3,
    text: 'El corte estaba bien pero no como pedí. Esperaba algo más arriesgado.',
    serviceName: 'Corte hombre',
    createdAt: daysAgo(52),
    providerResponse: {
      text: 'Lo sentimos Roger, te invitamos a una sesión de ajuste sin coste para afinar el corte.',
      respondedAt: daysAgo(51),
    },
  },
  {
    id: 'prev-12',
    authorName: 'Anna G.',
    rating: 5,
    text: 'Mi sitio fijo en Barcelona. Marina sabe lo que hace y el trato del equipo es impecable.',
    serviceName: 'Color completo',
    createdAt: daysAgo(60),
    providerResponse: null,
  },
];
