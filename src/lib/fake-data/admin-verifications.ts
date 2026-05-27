/**
 * Datos mock de solicitudes de verificación de proveedores.
 *
 * Cada verificación corresponde a un proveedor que se ha registrado
 * y subido la documentación legal. El equipo de admin la aprueba o
 * rechaza desde la cola.
 *
 * Los documentos son URLs de Unsplash con temática neutra (papeles,
 * documentos, escritorio) para que la maqueta sea creíble sin usar
 * imágenes de identificaciones reales.
 */

/**
 * Estado actual de una solicitud de verificación.
 *
 * `pending` aparece en la cola; `approved` / `rejected` quedan en el
 * histórico (no se renderizan en la cola por defecto).
 */
export type VerificationStatus = 'pending' | 'approved' | 'rejected';

/** Tipo de documento subido por el proveedor candidato. */
export type VerificationDocumentType = 'identity' | 'business' | 'insurance' | 'portfolio';

/**
 * Documento subido por el candidato. La URL apunta a un placeholder
 * neutro de Unsplash; en producción será un Storage privado de Supabase.
 */
export interface VerificationDocument {
  id: string;
  type: VerificationDocumentType;
  url: string;
  filename: string;
}

/**
 * Solicitud de verificación lista para mostrar en la cola admin.
 *
 * Incluye datos del proveedor candidato ya hidratados para evitar
 * lookups en la vista.
 */
export interface AdminVerificationRequest {
  id: string;
  status: VerificationStatus;
  submittedAt: Date;
  providerName: string;
  providerType: 'autonomo' | 'centro';
  providerCity: string;
  providerCategory: string;
  contactEmail: string;
  contactPhone: string;
  vatNumber: string;
  description: string;
  documents: VerificationDocument[];
}

/**
 * Helper interno para construir URLs Unsplash con el mismo formato
 * usado en `providers.ts`. Centralizar evita inconsistencias visuales.
 */
function unsplashDoc(id: string): string {
  return `https://images.unsplash.com/photo-${id}?w=600&q=80&auto=format&fit=crop`;
}

/**
 * Cola de verificaciones pendientes y algunas resueltas recientes.
 *
 * Las 5 pendientes son las que aparecerán por defecto en `/admin`.
 * Las resueltas se incluyen para que el contador de "resueltas hoy"
 * tenga sentido en el dashboard.
 */
export const fakeAdminVerifications: AdminVerificationRequest[] = [
  {
    id: 'ver-01',
    status: 'pending',
    submittedAt: new Date('2026-05-27T08:12:00+02:00'),
    providerName: 'Lluna Estètica',
    providerType: 'centro',
    providerCity: 'Barcelona — Gràcia',
    providerCategory: 'Estética avanzada',
    contactEmail: 'hola@lluna-estetica.cat',
    contactPhone: '+34 656 12 34 56',
    vatNumber: 'B-65432198',
    description:
      'Centro de estética abierto en 2022 con tres cabinas y aparatología de radiofrecuencia. Buscamos crecer en clientela joven de barrio.',
    documents: [
      {
        id: 'doc-01',
        type: 'identity',
        url: unsplashDoc('1568667256549-094345857637'),
        filename: 'dni-administrador.jpg',
      },
      {
        id: 'doc-02',
        type: 'business',
        url: unsplashDoc('1450101499163-c8848c66ca85'),
        filename: 'alta-autonomos.pdf',
      },
      {
        id: 'doc-03',
        type: 'insurance',
        url: unsplashDoc('1554224155-6726b3ff858f'),
        filename: 'poliza-responsabilidad-civil.pdf',
      },
    ],
  },
  {
    id: 'ver-02',
    status: 'pending',
    submittedAt: new Date('2026-05-26T17:48:00+02:00'),
    providerName: 'Marc Rovira Studio',
    providerType: 'autonomo',
    providerCity: 'Barcelona — Sant Antoni',
    providerCategory: 'Peluquería caballero',
    contactEmail: 'marc@rovirastudio.com',
    contactPhone: '+34 633 98 21 17',
    vatNumber: '46712345Y',
    description:
      'Barbero autónomo con 12 años de experiencia, recién independizado tras trabajar en Atelier Norte.',
    documents: [
      {
        id: 'doc-04',
        type: 'identity',
        url: unsplashDoc('1568667256549-094345857637'),
        filename: 'dni-frontal.jpg',
      },
      {
        id: 'doc-05',
        type: 'business',
        url: unsplashDoc('1450101499163-c8848c66ca85'),
        filename: 'alta-iae.pdf',
      },
      {
        id: 'doc-06',
        type: 'portfolio',
        url: unsplashDoc('1503951914875-452162b0f3f1'),
        filename: 'portfolio-cortes.pdf',
      },
    ],
  },
  {
    id: 'ver-03',
    status: 'pending',
    submittedAt: new Date('2026-05-26T11:05:00+02:00'),
    providerName: 'Padel Sant Cugat',
    providerType: 'centro',
    providerCity: 'Sant Cugat del Vallès',
    providerCategory: 'Pádel',
    contactEmail: 'reservas@padelsantcugat.com',
    contactPhone: '+34 935 87 11 22',
    vatNumber: 'B-08123456',
    description: 'Cinco pistas cubiertas y dos al aire libre. Queremos integrar reservas online.',
    documents: [
      {
        id: 'doc-07',
        type: 'identity',
        url: unsplashDoc('1568667256549-094345857637'),
        filename: 'dni-presidente.jpg',
      },
      {
        id: 'doc-08',
        type: 'business',
        url: unsplashDoc('1450101499163-c8848c66ca85'),
        filename: 'escrituras-sl.pdf',
      },
      {
        id: 'doc-09',
        type: 'insurance',
        url: unsplashDoc('1554224155-6726b3ff858f'),
        filename: 'rc-instalacion.pdf',
      },
    ],
  },
  {
    id: 'ver-04',
    status: 'pending',
    submittedAt: new Date('2026-05-25T19:30:00+02:00'),
    providerName: 'Iuna Yoga',
    providerType: 'autonomo',
    providerCity: 'Barcelona — Poblenou',
    providerCategory: 'Yoga',
    contactEmail: 'iuna@iunayoga.com',
    contactPhone: '+34 671 45 67 89',
    vatNumber: '38912345K',
    description:
      'Profesora certificada Yoga Alliance 500h. Imparto clases en estudio compartido en Poblenou.',
    documents: [
      {
        id: 'doc-10',
        type: 'identity',
        url: unsplashDoc('1568667256549-094345857637'),
        filename: 'dni.jpg',
      },
      {
        id: 'doc-11',
        type: 'business',
        url: unsplashDoc('1450101499163-c8848c66ca85'),
        filename: 'alta-autonomos.pdf',
      },
      {
        id: 'doc-12',
        type: 'portfolio',
        url: unsplashDoc('1545205597-3d9d02c29597'),
        filename: 'certificacion-yoga-alliance.pdf',
      },
    ],
  },
  {
    id: 'ver-05',
    status: 'pending',
    submittedAt: new Date('2026-05-25T09:14:00+02:00'),
    providerName: 'Clínica Pell Sana',
    providerType: 'centro',
    providerCity: 'Badalona',
    providerCategory: 'Dermoestética',
    contactEmail: 'admin@pellsana.cat',
    contactPhone: '+34 934 77 88 99',
    vatNumber: 'B-08987654',
    description:
      'Clínica dermoestética dirigida por médico colegiado. Doce años de trayectoria en Badalona.',
    documents: [
      {
        id: 'doc-13',
        type: 'identity',
        url: unsplashDoc('1568667256549-094345857637'),
        filename: 'dni-director-medico.jpg',
      },
      {
        id: 'doc-14',
        type: 'business',
        url: unsplashDoc('1450101499163-c8848c66ca85'),
        filename: 'escritura-constitucion.pdf',
      },
      {
        id: 'doc-15',
        type: 'insurance',
        url: unsplashDoc('1554224155-6726b3ff858f'),
        filename: 'rc-sanitaria.pdf',
      },
    ],
  },

  // ---------- Resueltas recientes (histórico para métricas) ----------
  {
    id: 'ver-06',
    status: 'approved',
    submittedAt: new Date('2026-05-24T10:00:00+02:00'),
    providerName: 'Casa Mar Massatges',
    providerType: 'centro',
    providerCity: 'Barcelona — Gràcia',
    providerCategory: 'Masajes',
    contactEmail: 'contacto@casamarmassatges.com',
    contactPhone: '+34 933 22 11 00',
    vatNumber: 'B-08555111',
    description: 'Aprobado tras revisión documental.',
    documents: [],
  },
  {
    id: 'ver-07',
    status: 'rejected',
    submittedAt: new Date('2026-05-23T15:20:00+02:00'),
    providerName: 'Quick Nails Express',
    providerType: 'centro',
    providerCity: 'Barcelona — Sants',
    providerCategory: 'Manicura',
    contactEmail: 'info@quicknails.example',
    contactPhone: '+34 600 00 00 00',
    vatNumber: 'B-00000000',
    description: 'Documentación incompleta tras dos avisos.',
    documents: [],
  },
];

/**
 * Localiza una solicitud por id. Devuelve `undefined` si no existe.
 */
export function getVerificationById(id: string): AdminVerificationRequest | undefined {
  return fakeAdminVerifications.find((v) => v.id === id);
}

/**
 * Devuelve solo las solicitudes pendientes, ordenadas de más nueva
 * a más antigua, que es como las muestra la cola por defecto.
 */
export function getPendingVerifications(): AdminVerificationRequest[] {
  return fakeAdminVerifications
    .filter((v) => v.status === 'pending')
    .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
}
