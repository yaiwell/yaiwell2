/**
 * Tipos de la copia de datos que descarga el titular de la cuenta (RGPD,
 * derechos de acceso y portabilidad).
 */

export interface AccountExportBooking {
  id: string;
  provider: string;
  service: unknown;
  professional: string;
  startAt: Date;
  endAt: Date;
  status: string;
  paymentMode: string;
  priceCents: number;
  originalPriceCents: number | null;
  discountPct: number | null;
  notes: string | null;
  createdAt: Date;
  completedAt: Date | null;
  cancelledAt: Date | null;
  noShowAt: Date | null;
  refundedAt: Date | null;
}

export interface AccountExportReview {
  bookingId: string;
  provider: string;
  rating: number;
  text: string;
  photos: string[];
  providerResponse: string | null;
  createdAt: Date;
}

export interface AccountExportSanction {
  bookingId: string;
  reason: string;
  occurredAt: Date;
  revokedAt: Date | null;
}

export interface AccountExportBusiness {
  businessName: string;
  type: string;
  vatNumber: string | null;
  description: unknown;
  address: string;
  photos: string[];
  contact: { phone: string | null; email: string | null } | null;
  professionals: { name: string; bio: string | null; photo: string | null }[];
  services: { name: unknown; description: unknown; durationMinutes: number; priceCents: number }[];
  createdAt: Date;
}

export interface AccountExport {
  exportedAt: Date;
  profile: {
    email: string;
    fullName: string | null;
    avatarUrl: string | null;
    locale: string;
    role: string;
    createdAt: Date;
  };
  bookings: AccountExportBooking[];
  reviews: AccountExportReview[];
  sanctions: AccountExportSanction[];
  businesses: AccountExportBusiness[];
}
