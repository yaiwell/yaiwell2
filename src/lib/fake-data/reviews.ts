import type { Review } from '@/types/domain';

/**
 * Fecha base sobre la que se calculan los `createdAt` ficticios.
 * Fijamos un valor estable para que la demo sea determinista entre
 * renders y entre máquinas (no depende de `Date.now()`).
 */
const REFERENCE_NOW = new Date('2026-05-20T12:00:00.000Z');

/**
 * Construye una fecha relativa a `REFERENCE_NOW` restando los días indicados.
 * Centralizamos el helper para evitar repetir el cálculo en cada review.
 */
function daysAgo(days: number): Date {
  const d = new Date(REFERENCE_NOW);
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

/**
 * Banco de reseñas ficticias distribuidas entre los 10 proveedores.
 *
 * Reglas seguidas al componerlas:
 *  - El promedio por proveedor se aproxima al `rating` declarado en
 *    `fakeProviders` (direccional, no exacto).
 *  - Mezcla natural de castellano y catalán, simulando una clientela
 *    real de Barcelona.
 *  - Nada por debajo de 3★ para evitar negatividad excesiva en demo.
 *  - Fechas distribuidas en los últimos ~6 meses.
 */
export const fakeReviews: Review[] = [
  // ---------- prov-01 · Atelier Norte (peluquería, 10 reseñas) ----------
  {
    id: 'rev-01',
    providerId: 'prov-01',
    authorName: 'Marta R.',
    rating: 5,
    text: 'El corte me ha durado un mes con la forma intacta. Marina entendió a la primera lo que buscaba y el té de bienvenida es un detalle que enamora.',
    createdAt: daysAgo(8),
  },
  {
    id: 'rev-02',
    providerId: 'prov-01',
    authorName: 'Joan M.',
    rating: 5,
    text: 'Vinc des de Sant Cugat només per tallar-me aquí. Llum natural, música baixeta i acabats impecables.',
    createdAt: daysAgo(21),
  },
  {
    id: 'rev-03',
    providerId: 'prov-01',
    authorName: 'Núria P.',
    rating: 5,
    text: 'Me hicieron un balayage que parece pintado a mano. El color cae natural en las puntas y no se nota la raíz al crecer.',
    createdAt: daysAgo(35),
  },
  {
    id: 'rev-04',
    providerId: 'prov-01',
    authorName: 'Laia B.',
    rating: 4,
    text: 'Resultat molt bo, però vaig esperar gairebé 15 minuts passada la meva hora. Si arreglen això, és un 10.',
    createdAt: daysAgo(47),
  },
  {
    id: 'rev-05',
    providerId: 'prov-01',
    authorName: 'Pol G.',
    rating: 5,
    text: 'Mejor sitio donde he ido en años. Saben cortar pelo rizado sin masacrarlo, cosa rara en Barcelona.',
    createdAt: daysAgo(58),
  },
  {
    id: 'rev-06',
    providerId: 'prov-01',
    authorName: 'Carmen S.',
    rating: 5,
    text: 'Me peinaron para la boda de mi hija y aguantó toda la noche bailando sevillanas incluidas. Profesionalidad absoluta.',
    createdAt: daysAgo(72),
  },
  {
    id: 'rev-07',
    providerId: 'prov-01',
    authorName: 'Aitor F.',
    rating: 5,
    text: 'Buenísimo. Pedí algo concreto, me lo hicieron sin discutir y encima me sugirieron un acabado que ni me había planteado.',
    createdAt: daysAgo(89),
  },
  {
    id: 'rev-08',
    providerId: 'prov-01',
    authorName: 'Helena V.',
    rating: 4,
    text: 'El corte fantàstic. El preu, una mica alt per a un dimecres qualsevol, però la qualitat hi és.',
    createdAt: daysAgo(104),
  },
  {
    id: 'rev-09',
    providerId: 'prov-01',
    authorName: 'Berta A.',
    rating: 5,
    text: 'Cambié de cabeza con un cambio de color radical y todo el equipo me cuidó como si fuera de la familia. Volveré.',
    createdAt: daysAgo(132),
  },
  {
    id: 'rev-10',
    providerId: 'prov-01',
    authorName: 'Marc D.',
    rating: 5,
    text: 'Tall d’home clàssic fet amb cura, sense presses i amb un afaitat de coll que ja no es veu enlloc.',
    createdAt: daysAgo(158),
  },

  // ---------- prov-02 · Casa Mar Massatges (10 reseñas) ----------
  {
    id: 'rev-11',
    providerId: 'prov-02',
    authorName: 'Xavi T.',
    rating: 5,
    text: 'Sortir del centre i tenir ganes de tornar la setmana següent diu molt. El massatge esportiu em va treure un nus a l’escàpula que portava mesos.',
    createdAt: daysAgo(5),
  },
  {
    id: 'rev-12',
    providerId: 'prov-02',
    authorName: 'Eulàlia O.',
    rating: 5,
    text: 'Llocs com aquest fan que valgui la pena viure a Gràcia. Calidesa, silenci i mans que saben on toquen.',
    createdAt: daysAgo(14),
  },
  {
    id: 'rev-13',
    providerId: 'prov-02',
    authorName: 'Anna L.',
    rating: 5,
    text: 'He probado masajes en media ciudad y este es de los pocos en los que noto resultado real al día siguiente, no solo durante la sesión.',
    createdAt: daysAgo(27),
  },
  {
    id: 'rev-14',
    providerId: 'prov-02',
    authorName: 'Sergi R.',
    rating: 5,
    text: 'Reservé el de 90 minutos pensando que sería excesivo y se me ha pasado volando. La manta térmica es una idea genial.',
    createdAt: daysAgo(38),
  },
  {
    id: 'rev-15',
    providerId: 'prov-02',
    authorName: 'Roger P.',
    rating: 4,
    text: 'Molt bona sessió. L’única pega: la sala del costat es notava una mica i em va treure una mica del moment de relax.',
    createdAt: daysAgo(52),
  },
  {
    id: 'rev-16',
    providerId: 'prov-02',
    authorName: 'Ona C.',
    rating: 5,
    text: 'Llevo años yendo y siempre ajustan la presión a lo que pido sin que tenga que insistir. Trato cercano sin ser pesados.',
    createdAt: daysAgo(68),
  },
  {
    id: 'rev-17',
    providerId: 'prov-02',
    authorName: 'Jordi V.',
    rating: 5,
    text: 'Em van regalar una sessió i ja n’he reservat tres més pel meu compte. Diu tot, oi?',
    createdAt: daysAgo(85),
  },
  {
    id: 'rev-18',
    providerId: 'prov-02',
    authorName: 'Roberto N.',
    rating: 5,
    text: 'Trato impecable desde la reserva hasta el café de cortesía al salir. Los aceites huelen a hierba fresca, no a perfumería.',
    createdAt: daysAgo(101),
  },
  {
    id: 'rev-19',
    providerId: 'prov-02',
    authorName: 'Clàudia M.',
    rating: 5,
    text: 'Tinc cervicals complicades i Marina les coneix millor que el meu fisio. Sortir d’aquí és com restablir el cos.',
    createdAt: daysAgo(127),
  },
  {
    id: 'rev-20',
    providerId: 'prov-02',
    authorName: 'Pau S.',
    rating: 5,
    text: 'Recomendado al 100%. Si dudas, prueba el de 90 min con foco lumbar. Por el precio que tiene en Barcelona, es un regalo.',
    createdAt: daysAgo(152),
  },

  // ---------- prov-03 · Estudi Ungla (7 reseñas) ----------
  {
    id: 'rev-21',
    providerId: 'prov-03',
    authorName: 'Laia C.',
    rating: 5,
    text: 'Mai m’havien cuidat tant les cutícules. Surt amb mans com de nadó i el disseny floral em va durar tres setmanes intactes.',
    createdAt: daysAgo(11),
  },
  {
    id: 'rev-22',
    providerId: 'prov-03',
    authorName: 'Marta P.',
    rating: 5,
    text: 'Es nota que les agrada el que fan. Conversa agradable, llum bona per veure els acabats i preu honest pel resultat.',
    createdAt: daysAgo(24),
  },
  {
    id: 'rev-23',
    providerId: 'prov-03',
    authorName: 'Helena T.',
    rating: 5,
    text: 'Llevaba un año sin hacerme las manos y me han tratado las uñas con tanto mimo que ya tengo cita mensual.',
    createdAt: daysAgo(41),
  },
  {
    id: 'rev-24',
    providerId: 'prov-03',
    authorName: 'Núria F.',
    rating: 5,
    text: 'El nail art lo dibuja a mano y es una pequeña obra de arte. Pago lo que vale sin pestañear.',
    createdAt: daysAgo(56),
  },
  {
    id: 'rev-25',
    providerId: 'prov-03',
    authorName: 'Carla B.',
    rating: 4,
    text: 'Resultado precioso. El único pero es que el sitio es pequeño y si coinciden dos clientas a la vez se queda algo justo.',
    createdAt: daysAgo(79),
  },
  {
    id: 'rev-26',
    providerId: 'prov-03',
    authorName: 'Ona R.',
    rating: 5,
    text: 'Em va recomanar canviar de gel pels meus dits i des de llavors no se m’aixeca cap vora. Saben de què parlen.',
    createdAt: daysAgo(108),
  },
  {
    id: 'rev-27',
    providerId: 'prov-03',
    authorName: 'Lucía V.',
    rating: 4,
    text: 'Trato muy bueno y manicura impecable. Tardó un poco más de lo previsto, pero entiendo que el detalle requiere tiempo.',
    createdAt: daysAgo(141),
  },

  // ---------- prov-04 · Born Pàdel Club (11 reseñas) ----------
  {
    id: 'rev-28',
    providerId: 'prov-04',
    authorName: 'Xavi G.',
    rating: 5,
    text: 'Pistes en bon estat, vestidors nets i la app per reservar funciona sense embolics. Veniu sense por.',
    createdAt: daysAgo(6),
  },
  {
    id: 'rev-29',
    providerId: 'prov-04',
    authorName: 'Pol M.',
    rating: 5,
    text: 'La clase con Dani me ha cambiado el revés. Explica con paciencia y se nota mejoría desde la primera sesión.',
    createdAt: daysAgo(17),
  },
  {
    id: 'rev-30',
    providerId: 'prov-04',
    authorName: 'Marc R.',
    rating: 4,
    text: 'Bones pistes i bona ubicació. Els caps de setmana s’omple ràpid, recomano reservar amb dies d’antelació.',
    createdAt: daysAgo(28),
  },
  {
    id: 'rev-31',
    providerId: 'prov-04',
    authorName: 'Roger D.',
    rating: 5,
    text: 'Llevo dos años yendo. Mantienen las pistas como el primer día y la cafetería es un buen extra después del partido.',
    createdAt: daysAgo(44),
  },
  {
    id: 'rev-32',
    providerId: 'prov-04',
    authorName: 'Aitor S.',
    rating: 5,
    text: 'El bono de 5 horas sale a cuenta si juegas semanalmente. Recepcionista atento, todo fluido.',
    createdAt: daysAgo(60),
  },
  {
    id: 'rev-33',
    providerId: 'prov-04',
    authorName: 'Sergi P.',
    rating: 4,
    text: 'Pistes molt ben mantingudes però la il·luminació d’una de les cobertes parpelleja una mica al vespre.',
    createdAt: daysAgo(77),
  },
  {
    id: 'rev-34',
    providerId: 'prov-04',
    authorName: 'Joan A.',
    rating: 5,
    text: 'Sitio top en pleno centro. He probado otros clubs y aquí la sensación es más cuidada, menos masificada.',
    createdAt: daysAgo(94),
  },
  {
    id: 'rev-35',
    providerId: 'prov-04',
    authorName: 'Carlos F.',
    rating: 3,
    text: 'Las pistas están bien y los monitores son buenos, pero los vestuarios necesitan una reforma. Por el precio que tiene se le puede pedir más.',
    createdAt: daysAgo(112),
  },
  {
    id: 'rev-36',
    providerId: 'prov-04',
    authorName: 'Pau L.',
    rating: 5,
    text: 'Hemos hecho liga interna con amigos durante seis meses y siempre nos cuadran horarios sin problema. Gente seria.',
    createdAt: daysAgo(133),
  },
  {
    id: 'rev-37',
    providerId: 'prov-04',
    authorName: 'Jordi C.',
    rating: 4,
    text: 'Bona experiència en general. Si vens en transport públic, està molt ben comunicat des de Jaume I.',
    createdAt: daysAgo(154),
  },
  {
    id: 'rev-38',
    providerId: 'prov-04',
    authorName: 'Roberto M.',
    rating: 5,
    text: 'Tengo a mis dos hijos apuntados a la escuela de pádel del club y los monitores tienen paciencia infinita con los peques.',
    createdAt: daysAgo(172),
  },

  // ---------- prov-05 · Spa Sarrià (7 reseñas) ----------
  {
    id: 'rev-39',
    providerId: 'prov-05',
    authorName: 'Helena B.',
    rating: 5,
    text: 'El circuito de aguas es una pequeña delicia. Vas con el ruido de la ciudad y sales como si te hubieras teletransportado a un balneario.',
    createdAt: daysAgo(9),
  },
  {
    id: 'rev-40',
    providerId: 'prov-05',
    authorName: 'Núria S.',
    rating: 5,
    text: 'El pack spa + massatge va valdre cada euro. Atenció exquisida, sense aglomeracions ni música irritant.',
    createdAt: daysAgo(22),
  },
  {
    id: 'rev-41',
    providerId: 'prov-05',
    authorName: 'Marta L.',
    rating: 5,
    text: 'Me regalaron el ritual facial y noté la piel diferente durante una semana entera. Productos serios y trato profesional.',
    createdAt: daysAgo(40),
  },
  {
    id: 'rev-42',
    providerId: 'prov-05',
    authorName: 'Ona M.',
    rating: 5,
    text: 'Vam venir per celebrar l’aniversari amb la meva parella i vam sortir somrient com fa temps. Tornarem.',
    createdAt: daysAgo(63),
  },
  {
    id: 'rev-43',
    providerId: 'prov-05',
    authorName: 'Carmen G.',
    rating: 4,
    text: 'Las instalaciones impecables. La sauna finlandesa quizá un punto baja de temperatura para mi gusto, pero es un detalle menor.',
    createdAt: daysAgo(88),
  },
  {
    id: 'rev-44',
    providerId: 'prov-05',
    authorName: 'Berta P.',
    rating: 5,
    text: 'Un oasi a Sarrià. Toallons calents, llum baixa i ningú parlant fort. Per fi un spa que sap el que vol ser.',
    createdAt: daysAgo(117),
  },
  {
    id: 'rev-45',
    providerId: 'prov-05',
    authorName: 'Laia R.',
    rating: 4,
    text: 'Molt recomanable. L’hora punta de divendres tarda s’omple una mica, millor anar entre setmana si pots.',
    createdAt: daysAgo(146),
  },

  // ---------- prov-06 · Gimnàs Boutique Poblenou (7 reseñas) ----------
  {
    id: 'rev-46',
    providerId: 'prov-06',
    authorName: 'Pau F.',
    rating: 5,
    text: 'Por fin un gimnasio sin pantallas ni música atronando. Grupos pequeños, material de verdad y técnica corregida en cada serie.',
    createdAt: daysAgo(7),
  },
  {
    id: 'rev-47',
    providerId: 'prov-06',
    authorName: 'Sergi B.',
    rating: 5,
    text: 'Vaig venir per provar una classe i ja porto sis mesos. El nivell dels entrenadors està molt per sobre del que t’esperes.',
    createdAt: daysAgo(19),
  },
  {
    id: 'rev-48',
    providerId: 'prov-06',
    authorName: 'Anna G.',
    rating: 5,
    text: 'Me sacaron de un dolor lumbar crónico con un plan progresivo. Saben lo que hacen y no te empujan a cargar sin sentido.',
    createdAt: daysAgo(36),
  },
  {
    id: 'rev-49',
    providerId: 'prov-06',
    authorName: 'Roger F.',
    rating: 4,
    text: 'L’espai és petit però aprofitat com cal. A vegades coincideixen dues classes i es nota una mica, però la qualitat compensa.',
    createdAt: daysAgo(62),
  },
  {
    id: 'rev-50',
    providerId: 'prov-06',
    authorName: 'Marc T.',
    rating: 5,
    text: 'Personal training de verdad, no un señor mirando el móvil mientras cuentas. Mi sentadilla ha mejorado tanto que casi no me reconozco.',
    createdAt: daysAgo(91),
  },
  {
    id: 'rev-51',
    providerId: 'prov-06',
    authorName: 'Joan B.',
    rating: 5,
    text: 'Equip Eleiko, barres en perfecte estat i un ambient on et tracten pel nom des del segon dia. Recomanat 100%.',
    createdAt: daysAgo(124),
  },
  {
    id: 'rev-52',
    providerId: 'prov-06',
    authorName: 'Roberto A.',
    rating: 4,
    text: 'Lo mejor son las clases reducidas. Lo único que mejoraría: alguna hora más temprana entre semana para los que entramos pronto a trabajar.',
    createdAt: daysAgo(159),
  },

  // ---------- prov-07 · Pell Clinic (9 reseñas) ----------
  {
    id: 'rev-53',
    providerId: 'prov-07',
    authorName: 'Carla N.',
    rating: 5,
    text: 'Llevaba años con la piel apagada. Con el plan de hidrofaciales que me propusieron he visto un cambio enorme y sin agresiones.',
    createdAt: daysAgo(10),
  },
  {
    id: 'rev-54',
    providerId: 'prov-07',
    authorName: 'Núria E.',
    rating: 5,
    text: 'L’aparell de làser és gairebé indolor i el resultat al cap de tres sessions ja s’aprecia. La doctora explica bé el procés.',
    createdAt: daysAgo(23),
  },
  {
    id: 'rev-55',
    providerId: 'prov-07',
    authorName: 'Marta E.',
    rating: 5,
    text: 'Trato profesional sin venderte humo. Te dicen lo que sí necesitas y lo que no, cosa rara en una clínica estética.',
    createdAt: daysAgo(39),
  },
  {
    id: 'rev-56',
    providerId: 'prov-07',
    authorName: 'Berta R.',
    rating: 4,
    text: 'Molt bon resultat amb el drenatge. L’única queixa: l’aparcament a la zona és complicat, jo us recomano venir en metro.',
    createdAt: daysAgo(54),
  },
  {
    id: 'rev-57',
    providerId: 'prov-07',
    authorName: 'Carmen L.',
    rating: 5,
    text: 'La limpieza facial profunda es la mejor que me han hecho en Barcelona. Sales sin rojeces y con piel como nueva.',
    createdAt: daysAgo(74),
  },
  {
    id: 'rev-58',
    providerId: 'prov-07',
    authorName: 'Helena C.',
    rating: 4,
    text: 'Profesionales serios y resultados visibles. El precio está en línea con la zona, no es barato pero se entiende.',
    createdAt: daysAgo(98),
  },
  {
    id: 'rev-59',
    providerId: 'prov-07',
    authorName: 'Aitor R.',
    rating: 5,
    text: 'Me hice el láser de espalda y la diferencia es abismal. Sesiones puntuales, sin esperas eternas.',
    createdAt: daysAgo(121),
  },
  {
    id: 'rev-60',
    providerId: 'prov-07',
    authorName: 'Lucía P.',
    rating: 3,
    text: 'El tratamiento funciona, pero me sorprendió que intentaran venderme un bono extra cada vez que iba. Si vas, ten claro qué quieres.',
    createdAt: daysAgo(144),
  },
  {
    id: 'rev-61',
    providerId: 'prov-07',
    authorName: 'Laia G.',
    rating: 5,
    text: 'Resultat impecable. M’encanta que t’expliquin el perquè de cada pas i no et facin sentir un número més.',
    createdAt: daysAgo(168),
  },

  // ---------- prov-08 · Sílvia Makeup Studio (6 reseñas) ----------
  {
    id: 'rev-62',
    providerId: 'prov-08',
    authorName: 'Marta V.',
    rating: 5,
    text: 'Sílvia es un sol. Me hizo el maquillaje de novia y duró desde las 10 de la mañana hasta el último baile de la noche. Hizo prueba previa sin prisa.',
    createdAt: daysAgo(12),
  },
  {
    id: 'rev-63',
    providerId: 'prov-08',
    authorName: 'Anna E.',
    rating: 5,
    text: 'Em va deixar amb una pell lluminosa per a un esdeveniment important i tothom em va preguntar què havia fet. Tornaré segur.',
    createdAt: daysAgo(31),
  },
  {
    id: 'rev-64',
    providerId: 'prov-08',
    authorName: 'Helena D.',
    rating: 5,
    text: 'Sabe escuchar lo que quieres y traducirlo a un look natural pero impecable. Sin capas innecesarias ni colores raros.',
    createdAt: daysAgo(53),
  },
  {
    id: 'rev-65',
    providerId: 'prov-08',
    authorName: 'Carmen T.',
    rating: 4,
    text: 'Resultado precioso, aunque el estudio queda algo escondido y costó encontrarlo la primera vez. Sería útil un cartel más visible.',
    createdAt: daysAgo(76),
  },
  {
    id: 'rev-66',
    providerId: 'prov-08',
    authorName: 'Núria H.',
    rating: 5,
    text: 'Sessió de fotos amb maquillatge fet per ella, els retocs es noten i molt. Saben de pell, de llum i de càmera.',
    createdAt: daysAgo(115),
  },
  {
    id: 'rev-67',
    providerId: 'prov-08',
    authorName: 'Berta J.',
    rating: 5,
    text: 'Profesional, dulce y sin presión. Salí del estudio sintiéndome yo misma pero un poquito mejor. Repetiré con seguridad.',
    createdAt: daysAgo(148),
  },

  // ---------- prov-09 · Iyengar Iuna (6 reseñas) ----------
  {
    id: 'rev-68',
    providerId: 'prov-09',
    authorName: 'Roger M.',
    rating: 5,
    text: 'Iyengar de veritat, no aquesta cosa de moda. Et corregeixen les postures una a una i hi notes la diferència en setmanes.',
    createdAt: daysAgo(13),
  },
  {
    id: 'rev-69',
    providerId: 'prov-09',
    authorName: 'Eulàlia S.',
    rating: 5,
    text: 'Grupos de 8 personas máximo y profesores certificados sénior. Vienes con dolores y sales con el cuerpo desbloqueado.',
    createdAt: daysAgo(29),
  },
  {
    id: 'rev-70',
    providerId: 'prov-09',
    authorName: 'Ona V.',
    rating: 5,
    text: 'El espacio es precioso, con luz natural y suelo de madera. Los materiales son propios y se nota la inversión.',
    createdAt: daysAgo(48),
  },
  {
    id: 'rev-71',
    providerId: 'prov-09',
    authorName: 'Marta H.',
    rating: 4,
    text: 'Excel·lent docència, però l’horari de matins és una mica limitat. Si treballes en oficina, hauràs de planificar bé.',
    createdAt: daysAgo(82),
  },
  {
    id: 'rev-72',
    providerId: 'prov-09',
    authorName: 'Pau R.',
    rating: 5,
    text: 'Llevaba meses con tendinitis en el hombro y aquí me han enseñado a sostener el cuerpo de otra manera. Recomendado a quien tenga lesiones.',
    createdAt: daysAgo(119),
  },
  {
    id: 'rev-73',
    providerId: 'prov-09',
    authorName: 'Laia D.',
    rating: 5,
    text: 'Anna explica amb la paciència d’una mestra de debò. Em va canviar la manera d’entendre el ioga.',
    createdAt: daysAgo(157),
  },

  // ---------- prov-10 · Club Tennis Pedralbes (11 reseñas) ----------
  {
    id: 'rev-74',
    providerId: 'prov-10',
    authorName: 'Marc V.',
    rating: 5,
    text: 'Pistas de tierra batida en perfecto estado. Reservar con raqueta incluida es un detalle perfecto para los que vienen de fuera.',
    createdAt: daysAgo(4),
  },
  {
    id: 'rev-75',
    providerId: 'prov-10',
    authorName: 'Roger H.',
    rating: 4,
    text: 'Bones pistes i monitor de classes molt format. El que rebaixa la nota: a vegades la pista 3 té el bot una mica irregular.',
    createdAt: daysAgo(16),
  },
  {
    id: 'rev-76',
    providerId: 'prov-10',
    authorName: 'Aitor B.',
    rating: 5,
    text: 'He dado clase con un ex-jugador ATP y se nota a años luz. Te ajusta el revés en dos sesiones.',
    createdAt: daysAgo(30),
  },
  {
    id: 'rev-77',
    providerId: 'prov-10',
    authorName: 'Pau M.',
    rating: 4,
    text: 'Bon ambient, sòcies i socis simpàtics. Els vestidors podrien ser una mica més moderns, però compleixen.',
    createdAt: daysAgo(46),
  },
  {
    id: 'rev-78',
    providerId: 'prov-10',
    authorName: 'Sergi L.',
    rating: 5,
    text: 'Llevo viniendo años. Mantienen las pistas como manda el reglamento y los partidos en tierra batida son otra historia.',
    createdAt: daysAgo(64),
  },
  {
    id: 'rev-79',
    providerId: 'prov-10',
    authorName: 'Joan E.',
    rating: 3,
    text: 'Les instal·lacions són boniques i les classes molt bones, però la facturació no és gens transparent: m’han cobrat dues vegades coses que no havia demanat.',
    createdAt: daysAgo(83),
  },
  {
    id: 'rev-80',
    providerId: 'prov-10',
    authorName: 'Roberto J.',
    rating: 5,
    text: 'Mi club desde hace cinco años. Trato familiar, pistas en condiciones y un sparring que aprieta como hay que apretar.',
    createdAt: daysAgo(102),
  },
  {
    id: 'rev-81',
    providerId: 'prov-10',
    authorName: 'Carmen O.',
    rating: 4,
    text: 'Las clases son una gozada y el entorno de Pedralbes invita a quedarse después a tomar algo. Pena que el aparcamiento sea de pago.',
    createdAt: daysAgo(126),
  },
  {
    id: 'rev-82',
    providerId: 'prov-10',
    authorName: 'Marta F.',
    rating: 5,
    text: 'Mi hijo lleva dos años en la escuela del club y ha cogido nivel de competición. Los monitores tienen oficio y mano izquierda.',
    createdAt: daysAgo(140),
  },
  {
    id: 'rev-83',
    providerId: 'prov-10',
    authorName: 'Núria A.',
    rating: 4,
    text: 'Club seriós i ben gestionat. La web per reservar funciona, però l’app mòbil va una mica fluixa.',
    createdAt: daysAgo(161),
  },
  {
    id: 'rev-84',
    providerId: 'prov-10',
    authorName: 'Xavi N.',
    rating: 5,
    text: 'Reservé una pista un domingo a media tarde y todo el proceso fue inmediato. Salimos jugando un partido digno gracias al sparring.',
    createdAt: daysAgo(178),
  },
];

/**
 * Devuelve las reseñas de un proveedor, ordenadas por createdAt descendente
 * (las más recientes primero).
 */
export function getReviewsByProvider(providerId: string): Review[] {
  return fakeReviews
    .filter((r) => r.providerId === providerId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Devuelve el desglose de ratings (cuántas reseñas tiene cada estrella 1-5)
 * para un proveedor. Si no hay reseñas, devuelve un objeto con todas las
 * claves a 0 para que la UI pueda renderizar barras vacías sin condicionar.
 */
export function getRatingBreakdown(providerId: string): Record<1 | 2 | 3 | 4 | 5, number> {
  const breakdown: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const review of fakeReviews) {
    if (review.providerId !== providerId) continue;
    // Encapsulamos la conversión a clave para que TypeScript la trate como
    // una de las cinco posibles y no como un número arbitrario.
    const star = review.rating as 1 | 2 | 3 | 4 | 5;
    if (star >= 1 && star <= 5) {
      breakdown[star] += 1;
    }
  }
  return breakdown;
}
