import type { Service } from '@/types/domain';

/**
 * Catálogo ficticio de servicios distribuidos entre los proveedores
 * de `fakeProviders`. Precios calibrados al mercado de Barcelona 2026
 * para que la demo sea verosímil.
 *
 * En BD real estos servicios estarán normalizados con relación al
 * provider y un `tsvector` generado en columna; aquí mantenemos
 * estructura plana porque solo alimentamos UI/búsqueda básica.
 */
export const fakeServices: Service[] = [
  // ---------- Atelier Norte (peluquería) ----------
  {
    id: 'svc-01',
    providerId: 'prov-01',
    professionalId: null,
    categoryId: 'cat-hair-cut',
    name: { es: 'Corte mujer', ca: 'Tall dona' },
    description: {
      es: 'Diagnóstico, lavado con productos botánicos, corte personalizado y secado.',
      ca: 'Diagnòstic, rentat amb productes botànics, tall personalitzat i assecat.',
    },
    durationMinutes: 60,
    priceCents: 5500,
  },
  {
    id: 'svc-02',
    providerId: 'prov-01',
    professionalId: null,
    categoryId: 'cat-hair-cut',
    name: { es: 'Corte hombre', ca: 'Tall home' },
    description: {
      es: 'Corte clásico o moderno con producto de acabado incluido.',
      ca: 'Tall clàssic o modern amb producte d’acabat inclòs.',
    },
    durationMinutes: 45,
    priceCents: 3800,
  },
  {
    id: 'svc-03',
    providerId: 'prov-01',
    professionalId: null,
    categoryId: 'cat-hair-color',
    name: { es: 'Color completo', ca: 'Color complet' },
    description: {
      es: 'Coloración integral con marcas premium libres de amoníaco.',
      ca: 'Coloració integral amb marques premium lliures d’amoníac.',
    },
    durationMinutes: 120,
    priceCents: 9500,
  },
  {
    id: 'svc-04',
    providerId: 'prov-01',
    professionalId: null,
    categoryId: 'cat-hair-styling',
    name: { es: 'Peinado evento', ca: 'Pentinat esdeveniment' },
    description: {
      es: 'Peinado de gala o boda con prueba previa opcional.',
      ca: 'Pentinat de gala o casament amb prova prèvia opcional.',
    },
    durationMinutes: 75,
    priceCents: 6500,
  },

  // ---------- Casa Mar Massatges ----------
  {
    id: 'svc-05',
    providerId: 'prov-02',
    professionalId: null,
    categoryId: 'cat-massage-relax',
    name: { es: 'Masaje relajante 60 min', ca: 'Massatge relaxant 60 min' },
    description: {
      es: 'Maniobras suaves de cuerpo completo con aceite cálido de almendra.',
      ca: 'Maniobres suaus de cos sencer amb oli càlid d’ametlla.',
    },
    durationMinutes: 60,
    priceCents: 5800,
  },
  {
    id: 'svc-06',
    providerId: 'prov-02',
    professionalId: null,
    categoryId: 'cat-massage-relax',
    name: { es: 'Masaje relajante 90 min', ca: 'Massatge relaxant 90 min' },
    description: {
      es: 'Versión extendida con foco en cervicales y zona lumbar.',
      ca: 'Versió ampliada amb focus en cervicals i zona lumbar.',
    },
    durationMinutes: 90,
    priceCents: 8000,
  },
  {
    id: 'svc-07',
    providerId: 'prov-02',
    professionalId: null,
    categoryId: 'cat-massage-sport',
    name: { es: 'Masaje deportivo', ca: 'Massatge esportiu' },
    description: {
      es: 'Descarga muscular profunda para deportistas y oficinistas tensos.',
      ca: 'Descàrrega muscular profunda per a esportistes i oficinistes tensos.',
    },
    durationMinutes: 60,
    priceCents: 6500,
  },

  // ---------- Estudi Ungla ----------
  {
    id: 'svc-08',
    providerId: 'prov-03',
    professionalId: null,
    categoryId: 'cat-nails',
    name: { es: 'Manicura semipermanente', ca: 'Manicura semipermanent' },
    description: {
      es: 'Preparación, esmaltado semipermanente y aceite de cutícula.',
      ca: 'Preparació, esmaltat semipermanent i oli de cutícula.',
    },
    durationMinutes: 60,
    priceCents: 3200,
  },
  {
    id: 'svc-09',
    providerId: 'prov-03',
    professionalId: null,
    categoryId: 'cat-nails',
    name: { es: 'Manicura con nail art', ca: 'Manicura amb nail art' },
    description: {
      es: 'Diseño artístico personalizado, hasta 4 dedos decorados.',
      ca: 'Disseny artístic personalitzat, fins a 4 dits decorats.',
    },
    durationMinutes: 90,
    priceCents: 4800,
  },
  {
    id: 'svc-10',
    providerId: 'prov-03',
    professionalId: null,
    categoryId: 'cat-nails',
    name: { es: 'Pedicura spa', ca: 'Pedicura spa' },
    description: {
      es: 'Baño de pies, exfoliación, esmaltado y masaje corto de gemelos.',
      ca: 'Bany de peus, exfoliació, esmaltat i massatge curt de bessons.',
    },
    durationMinutes: 75,
    priceCents: 4200,
  },

  // ---------- Born Pàdel Club ----------
  {
    id: 'svc-11',
    providerId: 'prov-04',
    professionalId: null,
    categoryId: 'cat-padel',
    name: { es: 'Hora de pista cubierta', ca: 'Hora de pista coberta' },
    description: {
      es: 'Reserva de pista por 60 minutos, hasta 4 jugadores.',
      ca: 'Reserva de pista per 60 minuts, fins a 4 jugadors.',
    },
    durationMinutes: 60,
    priceCents: 2400,
  },
  {
    id: 'svc-12',
    providerId: 'prov-04',
    professionalId: null,
    categoryId: 'cat-padel',
    name: { es: 'Clase de pádel individual', ca: 'Classe de pàdel individual' },
    description: {
      es: 'Sesión personalizada con monitor titulado, pista incluida.',
      ca: 'Sessió personalitzada amb monitor titulat, pista inclosa.',
    },
    durationMinutes: 60,
    priceCents: 4500,
  },

  // ---------- Spa Sarrià ----------
  {
    id: 'svc-13',
    providerId: 'prov-05',
    professionalId: null,
    categoryId: 'cat-spa',
    name: { es: 'Circuito de aguas 90 min', ca: 'Circuit d’aigües 90 min' },
    description: {
      es: 'Acceso a sauna, baño turco, jacuzzi y piscina de relajación.',
      ca: 'Accés a sauna, bany turc, jacuzzi i piscina de relaxació.',
    },
    durationMinutes: 90,
    priceCents: 4900,
  },
  {
    id: 'svc-14',
    providerId: 'prov-05',
    professionalId: null,
    categoryId: 'cat-facial',
    name: { es: 'Ritual facial hidratante', ca: 'Ritual facial hidratant' },
    description: {
      es: 'Limpieza profunda, mascarilla y masaje facial relajante.',
      ca: 'Neteja profunda, mascareta i massatge facial relaxant.',
    },
    durationMinutes: 75,
    priceCents: 7500,
  },
  {
    id: 'svc-15',
    providerId: 'prov-05',
    professionalId: null,
    categoryId: 'cat-spa',
    name: { es: 'Pack spa + masaje 60 min', ca: 'Pack spa + massatge 60 min' },
    description: {
      es: 'Combinación de circuito de aguas y masaje a cuatro manos.',
      ca: 'Combinació de circuit d’aigües i massatge a quatre mans.',
    },
    durationMinutes: 150,
    priceCents: 12500,
  },

  // ---------- Gimnàs Boutique Poblenou ----------
  {
    id: 'svc-16',
    providerId: 'prov-06',
    professionalId: null,
    categoryId: 'cat-gym',
    name: { es: 'Sesión personal training', ca: 'Sessió personal training' },
    description: {
      es: 'Entrenamiento individual con planificación previa y seguimiento.',
      ca: 'Entrenament individual amb planificació prèvia i seguiment.',
    },
    durationMinutes: 55,
    priceCents: 5500,
  },
  {
    id: 'svc-17',
    providerId: 'prov-06',
    professionalId: null,
    categoryId: 'cat-gym',
    name: { es: 'Clase de fuerza grupal', ca: 'Classe de força grupal' },
    description: {
      es: 'Grupo reducido (máx. 6) con material Eleiko, todos los niveles.',
      ca: 'Grup reduït (màx. 6) amb material Eleiko, tots els nivells.',
    },
    durationMinutes: 60,
    priceCents: 2200,
  },

  // ---------- Pell Clinic ----------
  {
    id: 'svc-18',
    providerId: 'prov-07',
    professionalId: null,
    categoryId: 'cat-facial',
    name: { es: 'Limpieza facial profunda', ca: 'Neteja facial profunda' },
    description: {
      es: 'Higiene clínica con vapor, extracción manual y mascarilla calmante.',
      ca: 'Higiene clínica amb vapor, extracció manual i mascareta calmant.',
    },
    durationMinutes: 75,
    priceCents: 6800,
  },
  {
    id: 'svc-19',
    providerId: 'prov-07',
    professionalId: null,
    categoryId: 'cat-hair-removal',
    name: { es: 'Láser axilas', ca: 'Làser aixelles' },
    description: {
      es: 'Sesión de depilación láser de diodo en axilas. Bono 6 sesiones disponible.',
      ca: 'Sessió de depilació làser de díode a aixelles. Bo 6 sessions disponible.',
    },
    durationMinutes: 20,
    priceCents: 2900,
  },
  {
    id: 'svc-20',
    providerId: 'prov-07',
    professionalId: null,
    categoryId: 'cat-hair-removal',
    name: { es: 'Láser piernas completas', ca: 'Làser cames senceres' },
    description: {
      es: 'Sesión de depilación láser de diodo en piernas enteras.',
      ca: 'Sessió de depilació làser de díode a cames senceres.',
    },
    durationMinutes: 45,
    priceCents: 8900,
  },
  {
    id: 'svc-21',
    providerId: 'prov-07',
    professionalId: null,
    categoryId: 'cat-body',
    name: { es: 'Drenaje linfático', ca: 'Drenatge limfàtic' },
    description: {
      es: 'Maniobras manuales para activar circulación y reducir retención.',
      ca: 'Maniobres manuals per activar circulació i reduir retenció.',
    },
    durationMinutes: 60,
    priceCents: 6500,
  },

  // ---------- Sílvia Makeup Studio ----------
  {
    id: 'svc-22',
    providerId: 'prov-08',
    professionalId: null,
    categoryId: 'cat-makeup',
    name: { es: 'Maquillaje día', ca: 'Maquillatge dia' },
    description: {
      es: 'Look natural luminoso para reuniones, fotos o un buen plan.',
      ca: 'Look natural lluminós per a reunions, fotos o un bon pla.',
    },
    durationMinutes: 45,
    priceCents: 4500,
  },
  {
    id: 'svc-23',
    providerId: 'prov-08',
    professionalId: null,
    categoryId: 'cat-makeup',
    name: { es: 'Maquillaje noche', ca: 'Maquillatge nit' },
    description: {
      es: 'Maquillaje sofisticado con foco en mirada y duración 8h+.',
      ca: 'Maquillatge sofisticat amb focus en mirada i durada 8h+.',
    },
    durationMinutes: 60,
    priceCents: 5800,
  },
  {
    id: 'svc-24',
    providerId: 'prov-08',
    professionalId: null,
    categoryId: 'cat-makeup',
    name: { es: 'Maquillaje novia', ca: 'Maquillatge núvia' },
    description: {
      es: 'Sesión completa con prueba previa, retoques y resistencia al agua.',
      ca: 'Sessió completa amb prova prèvia, retocs i resistència a l’aigua.',
    },
    durationMinutes: 120,
    priceCents: 18500,
  },

  // ---------- Iyengar Iuna ----------
  {
    id: 'svc-25',
    providerId: 'prov-09',
    professionalId: null,
    categoryId: 'cat-yoga',
    name: { es: 'Clase abierta de yoga', ca: 'Classe oberta de ioga' },
    description: {
      es: 'Sesión grupal de 75 minutos, todos los niveles. Esterillas incluidas.',
      ca: 'Sessió grupal de 75 minuts, tots els nivells. Esterilles incloses.',
    },
    durationMinutes: 75,
    priceCents: 1800,
  },
  {
    id: 'svc-26',
    providerId: 'prov-09',
    professionalId: null,
    categoryId: 'cat-yoga',
    name: { es: 'Yoga particular', ca: 'Ioga particular' },
    description: {
      es: 'Clase individual adaptada a tu cuerpo y objetivos.',
      ca: 'Classe individual adaptada al teu cos i objectius.',
    },
    durationMinutes: 60,
    priceCents: 4800,
  },

  // ---------- Club Tennis Pedralbes ----------
  {
    id: 'svc-27',
    providerId: 'prov-10',
    professionalId: null,
    categoryId: 'cat-tennis',
    name: { es: 'Hora de pista de tierra', ca: 'Hora de pista de terra' },
    description: {
      es: 'Reserva de pista por 60 minutos, raquetas opcionales incluidas.',
      ca: 'Reserva de pista per 60 minuts, raquetes opcionals incloses.',
    },
    durationMinutes: 60,
    priceCents: 2600,
  },
  {
    id: 'svc-28',
    providerId: 'prov-10',
    professionalId: null,
    categoryId: 'cat-tennis',
    name: { es: 'Clase de tenis 60 min', ca: 'Classe de tennis 60 min' },
    description: {
      es: 'Clase individual con ex-jugador del circuito ATP.',
      ca: 'Classe individual amb ex-jugador del circuit ATP.',
    },
    durationMinutes: 60,
    priceCents: 6500,
  },
  {
    id: 'svc-29',
    providerId: 'prov-10',
    professionalId: null,
    categoryId: 'cat-tennis',
    name: { es: 'Sparring 60 min', ca: 'Sparring 60 min' },
    description: {
      es: 'Sesión de juego con un sparring profesional, ritmo a tu nivel.',
      ca: 'Sessió de joc amb un sparring professional, ritme al teu nivell.',
    },
    durationMinutes: 60,
    priceCents: 4200,
  },
  {
    id: 'svc-30',
    providerId: 'prov-04',
    professionalId: null,
    categoryId: 'cat-padel',
    name: { es: 'Bono 5 horas pista', ca: 'Bo 5 hores pista' },
    description: {
      es: 'Pack de 5 horas de pista cubierta con descuento, válido 3 meses.',
      ca: 'Pack de 5 hores de pista coberta amb descompte, vàlid 3 mesos.',
    },
    durationMinutes: 60,
    priceCents: 10500,
  },

  // ---------- Saló Bellesa Castellar ----------
  {
    id: 'svc-31',
    providerId: 'prov-11',
    professionalId: null,
    categoryId: 'cat-hair-cut',
    name: { es: 'Corte y peinado', ca: 'Tall i pentinat' },
    description: {
      es: 'Corte personalizado, lavado y secado con producto incluido.',
      ca: 'Tall personalitzat, rentat i assecat amb producte inclòs.',
    },
    durationMinutes: 50,
    priceCents: 2800,
  },
  {
    id: 'svc-32',
    providerId: 'prov-11',
    professionalId: null,
    categoryId: 'cat-hair-color',
    name: { es: 'Mechas balayage', ca: 'Metxes balayage' },
    description: {
      es: 'Técnica de mechas a mano alzada para un resultado natural y luminoso.',
      ca: 'Tècnica de metxes a mà alçada per a un resultat natural i lluminós.',
    },
    durationMinutes: 120,
    priceCents: 7500,
  },
  {
    id: 'svc-33',
    providerId: 'prov-11',
    professionalId: null,
    categoryId: 'cat-facial',
    name: { es: 'Higiene facial profunda', ca: 'Higiene facial profunda' },
    description: {
      es: 'Limpieza con vapor, extracción manual y mascarilla hidratante final.',
      ca: 'Neteja amb vapor, extracció manual i mascareta hidratant final.',
    },
    durationMinutes: 60,
    priceCents: 4200,
  },

  // ---------- CrossFit Lliçà de Vall ----------
  {
    id: 'svc-34',
    providerId: 'prov-12',
    professionalId: null,
    categoryId: 'cat-gym',
    name: { es: 'Clase WOD suelta', ca: 'Classe WOD solta' },
    description: {
      es: 'Sesión de CrossFit dirigida con calentamiento, técnica y WOD del día.',
      ca: 'Sessió de CrossFit dirigida amb escalfament, tècnica i WOD del dia.',
    },
    durationMinutes: 60,
    priceCents: 1500,
  },
  {
    id: 'svc-35',
    providerId: 'prov-12',
    professionalId: null,
    categoryId: 'cat-gym',
    name: { es: 'Sesión introductoria', ca: 'Sessió introductòria' },
    description: {
      es: 'Primera toma de contacto con un coach: movimientos básicos y tour por el box.',
      ca: 'Primer contacte amb un coach: moviments bàsics i visita al box.',
    },
    durationMinutes: 75,
    priceCents: 0,
  },
  {
    id: 'svc-36',
    providerId: 'prov-12',
    professionalId: null,
    categoryId: 'cat-gym',
    name: { es: 'Personal training 1:1', ca: 'Personal training 1:1' },
    description: {
      es: 'Entrenamiento individual con plan progresivo enfocado a tu objetivo.',
      ca: 'Entrenament individual amb pla progressiu enfocat al teu objectiu.',
    },
    durationMinutes: 60,
    priceCents: 4500,
  },
];

/**
 * Devuelve los servicios de un proveedor concreto.
 * Ordenados por precio ascendente para una primera lectura cómoda.
 */
export function getServicesByProvider(providerId: string): Service[] {
  return fakeServices
    .filter((s) => s.providerId === providerId)
    .sort((a, b) => a.priceCents - b.priceCents);
}

/**
 * Devuelve el precio mínimo (en céntimos) de los servicios de un proveedor.
 * Útil para mostrar "desde X €" en las cards de búsqueda.
 * Devuelve `null` si el proveedor no tiene servicios cargados.
 */
export function getProviderFromPriceCents(providerId: string): number | null {
  const prices = fakeServices.filter((s) => s.providerId === providerId).map((s) => s.priceCents);
  if (prices.length === 0) return null;
  return Math.min(...prices);
}
