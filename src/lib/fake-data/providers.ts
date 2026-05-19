import type { Provider } from '@/types/domain';

/**
 * Helper para construir URLs estables de Unsplash usadas como fotos
 * de proveedores. Centralizamos el formato para mantener consistencia
 * en tamaño y calidad y poder ajustarlos todos en un sitio.
 *
 * Todos los IDs han sido verificados (HTTP 200) en el momento de crear
 * estos datos. Si alguno cayese a 404 en el futuro, sustituirlo por otro
 * del banco libre de Unsplash con la misma temática.
 */
function unsplash(id: string): string {
  return `https://images.unsplash.com/photo-${id}?w=800&q=80&auto=format&fit=crop`;
}

/**
 * 10 proveedores ficticios pero creíbles en Barcelona.
 * Coordenadas reales repartidas entre Eixample, Gràcia, Sant Antoni,
 * Born, Sarrià, Poblenou, Raval y Sant Gervasi para que el mapa
 * muestre dispersión geográfica realista.
 *
 * Los IDs y slugs son estables: los usamos para indexar disponibilidad
 * determinista y como key en URLs públicas.
 */
export const fakeProviders: Provider[] = [
  {
    id: 'prov-01',
    slug: 'atelier-norte',
    name: 'Atelier Norte',
    type: 'centro',
    description: {
      es: 'Peluquería unisex premium en el corazón del Eixample. Cortes editoriales, color natural y un té de la casa al entrar.',
      ca: 'Perruqueria unisex premium al cor de l’Eixample. Talls editorials, color natural i un te de la casa en arribar.',
    },
    address: 'Carrer d’Aragó 256, Eixample',
    location: { lat: 41.3925, lng: 2.1612 },
    photos: [
      unsplash('1560066984-138dadb4c035'),
      unsplash('1521590832167-7bcbfaa6381f'),
      unsplash('1487412720507-e7ab37603c6f'),
    ],
    rating: 4.8,
    reviewsCount: 312,
    priceRange: '€€€',
    categoryIds: ['cat-beauty', 'cat-hair', 'cat-hair-cut', 'cat-hair-color', 'cat-hair-styling'],
  },
  {
    id: 'prov-02',
    slug: 'casa-mar-massatges',
    name: 'Casa Mar Massatges',
    type: 'centro',
    description: {
      es: 'Centro de masajes terapéuticos y deportivos en Gràcia. Camillas con manta térmica y aceites bio cultivados en el Maresme.',
      ca: 'Centre de massatges terapèutics i esportius a Gràcia. Lliteres amb manta tèrmica i olis bio cultivats al Maresme.',
    },
    address: 'Carrer de Verdi 132, Gràcia',
    location: { lat: 41.4076, lng: 2.1568 },
    photos: [
      unsplash('1540555700478-4be289fbecef'),
      unsplash('1600334129128-685c5582fd35'),
      unsplash('1544161515-4ab6ce6db874'),
    ],
    rating: 4.9,
    reviewsCount: 248,
    priceRange: '€€',
    categoryIds: ['cat-wellness', 'cat-massage', 'cat-massage-relax', 'cat-massage-sport'],
  },
  {
    id: 'prov-03',
    slug: 'estudi-ungla',
    name: 'Estudi Ungla',
    type: 'autonomo',
    description: {
      es: 'Estudio de manicura artística en Sant Antoni. Especialistas en gel, nail art y cuidado de cutícula sin tijeras.',
      ca: 'Estudi de manicura artística a Sant Antoni. Especialistes en gel, nail art i cura de cutícula sense tisores.',
    },
    address: 'Carrer del Comte Borrell 89, Sant Antoni',
    location: { lat: 41.3793, lng: 2.1582 },
    photos: [
      unsplash('1604654894610-df63bc536371'),
      unsplash('1593811167562-9cef47bfc4d7'),
      unsplash('1599447421416-3414500d18a5'),
    ],
    rating: 4.7,
    reviewsCount: 184,
    priceRange: '€€',
    categoryIds: ['cat-beauty', 'cat-nails'],
  },
  {
    id: 'prov-04',
    slug: 'born-padel-club',
    name: 'Born Pàdel Club',
    type: 'centro',
    description: {
      es: 'Pistas de pádel cubiertas y al aire libre junto al Born. Reservas por horas y clases con monitores titulados.',
      ca: 'Pistes de pàdel cobertes i a l’aire lliure al costat del Born. Reserves per hores i classes amb monitors titulats.',
    },
    address: 'Passeig de Picasso 18, Born',
    location: { lat: 41.3859, lng: 2.1834 },
    photos: [
      unsplash('1554344728-77cf90d9ed26'),
      unsplash('1554475901-4538ddfbccc2'),
      unsplash('1531123897727-8f129e1688ce'),
    ],
    rating: 4.6,
    reviewsCount: 421,
    priceRange: '€€',
    categoryIds: ['cat-sport', 'cat-padel'],
  },
  {
    id: 'prov-05',
    slug: 'spa-sarria',
    name: 'Spa Sarrià',
    type: 'centro',
    description: {
      es: 'Spa urbano con circuito de aguas, sauna finlandesa y rituales de hidratación facial. Pensado para escapar 90 minutos del ruido.',
      ca: 'Spa urbà amb circuit d’aigües, sauna finlandesa i rituals d’hidratació facial. Pensat per escapar 90 minuts del soroll.',
    },
    address: 'Carrer Major de Sarrià 75, Sarrià',
    location: { lat: 41.4019, lng: 2.1227 },
    photos: [
      unsplash('1591343395082-e120087004b4'),
      unsplash('1567593810070-7a3d471af022'),
      unsplash('1532712938310-34cb3982ef74'),
    ],
    rating: 4.8,
    reviewsCount: 196,
    priceRange: '€€€',
    categoryIds: ['cat-wellness', 'cat-spa', 'cat-aesthetics', 'cat-facial'],
  },
  {
    id: 'prov-06',
    slug: 'gimnas-boutique-poblenou',
    name: 'Gimnàs Boutique Poblenou',
    type: 'centro',
    description: {
      es: 'Gimnasio boutique con clases reducidas de fuerza, movilidad y entrenamiento funcional. Material Eleiko y sin pantallas.',
      ca: 'Gimnàs boutique amb classes reduïdes de força, mobilitat i entrenament funcional. Material Eleiko i sense pantalles.',
    },
    address: 'Carrer de Pere IV 220, Poblenou',
    location: { lat: 41.4007, lng: 2.1981 },
    photos: [
      unsplash('1571902943202-507ec2618e8f'),
      unsplash('1599901860904-17e6ed7083a0'),
      unsplash('1518611012118-696072aa579a'),
    ],
    rating: 4.7,
    reviewsCount: 158,
    priceRange: '€€€',
    categoryIds: ['cat-sport', 'cat-gym'],
  },
  {
    id: 'prov-07',
    slug: 'pell-clinic',
    name: 'Pell Clinic',
    type: 'centro',
    description: {
      es: 'Centro de estética avanzada en Sant Gervasi. Tratamientos faciales con aparatología clínica y depilación láser de diodo.',
      ca: 'Centre d’estètica avançada a Sant Gervasi. Tractaments facials amb aparatologia clínica i depilació làser de díode.',
    },
    address: 'Avinguda Diagonal 478, Sant Gervasi',
    location: { lat: 41.3953, lng: 2.1456 },
    photos: [
      unsplash('1571019613454-1cb2f99b2d8b'),
      unsplash('1503951914875-452162b0f3f1'),
      unsplash('1562322140-8baeececf3df'),
    ],
    rating: 4.6,
    reviewsCount: 273,
    priceRange: '€€€',
    categoryIds: ['cat-aesthetics', 'cat-facial', 'cat-hair-removal', 'cat-body'],
  },
  {
    id: 'prov-08',
    slug: 'silvia-makeup-studio',
    name: 'Sílvia Makeup Studio',
    type: 'autonomo',
    description: {
      es: 'Maquilladora profesional con estudio propio en el Raval. Bodas, sesiones editoriales y maquillaje de día con look natural.',
      ca: 'Maquilladora professional amb estudi propi al Raval. Casaments, sessions editorials i maquillatge de dia amb look natural.',
    },
    address: 'Carrer del Carme 42, Raval',
    location: { lat: 41.3812, lng: 2.1681 },
    photos: [
      unsplash('1559599101-f09722fb4948'),
      unsplash('1519415943484-9fa1873496d4'),
      unsplash('1556228720-195a672e8a03'),
    ],
    rating: 4.9,
    reviewsCount: 142,
    priceRange: '€€',
    categoryIds: ['cat-beauty', 'cat-makeup'],
  },
  {
    id: 'prov-09',
    slug: 'iyengar-iuna',
    name: 'Iyengar Iuna',
    type: 'autonomo',
    description: {
      es: 'Estudio de yoga Iyengar en Gràcia. Clases de máximo 8 alumnos, materiales propios y profesores con certificación senior.',
      ca: 'Estudi de ioga Iyengar a Gràcia. Classes de màxim 8 alumnes, materials propis i professors amb certificació sènior.',
    },
    address: 'Travessera de Gràcia 308, Gràcia',
    location: { lat: 41.4012, lng: 2.1611 },
    photos: [
      unsplash('1583416750470-965b2707b355'),
      unsplash('1545205597-3d9d02c29597'),
      unsplash('1606902965551-dce093cda6e7'),
    ],
    rating: 4.8,
    reviewsCount: 89,
    priceRange: '€€',
    categoryIds: ['cat-sport', 'cat-yoga', 'cat-wellness'],
  },
  {
    id: 'prov-10',
    slug: 'club-tennis-pedralbes',
    name: 'Club Tennis Pedralbes',
    type: 'centro',
    description: {
      es: 'Pistas de tenis de tierra batida y clases con ex-profesionales del circuito ATP. Reservas con raqueta incluida.',
      ca: 'Pistes de tennis de terra batuda i classes amb exprofessionals del circuit ATP. Reserves amb raqueta inclosa.',
    },
    address: 'Avinguda de Pedralbes 60, Pedralbes',
    location: { lat: 41.388, lng: 2.1141 },
    photos: [
      unsplash('1551489186-cf8726f514f8'),
      unsplash('1614777986387-015c2a89b696'),
      unsplash('1531123897727-8f129e1688ce'),
    ],
    rating: 4.5,
    reviewsCount: 327,
    priceRange: '€€',
    categoryIds: ['cat-sport', 'cat-tennis'],
  },
];

/**
 * Localiza un proveedor por id. Devuelve `undefined` si no existe.
 */
export function getProviderById(id: string): Provider | undefined {
  return fakeProviders.find((p) => p.id === id);
}
