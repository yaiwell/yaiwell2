import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { ServicesList } from '@/components/features/provider-panel/ServicesList';
import type { PanelService } from '@/components/features/provider-panel/ServicesList/ServicesList.types';
import { requireCurrentProvider } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import type { LocalizedText } from '@/types/domain';

interface PanelServicesPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Listado de servicios del panel (`/panel/servicios`).
 *
 * Consulta BD el catálogo del proveedor autenticado:
 *  - Service filtrado por `providerId` y `deletedAt: null`.
 *  - Join con `Category` para resolver el chip de categoría.
 *  - Conteo de bookings en los últimos 30 días por servicio (solo
 *    `confirmed` y `completed` cuentan — los `pending`/`cancelled` no
 *    se reflejan en el ranking).
 *
 * El estado `paused` aún no existe en BD (no hay columna), todos los
 * servicios reales llegan como `'active'`. Cuando se añada `Service.isActive`
 * (o equivalente), se mapea aquí.
 */
export default async function PanelServicesPage({ params }: PanelServicesPageProps) {
  const { locale } = await params;

  if (!hasLocale(['es', 'ca', 'en', 'de'], locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const { id: providerId } = await requireCurrentProvider(locale);

  // Ventana de 30 días para el contador de reservas recientes.
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const records = await prisma.service.findMany({
    where: { providerId, deletedAt: null },
    select: {
      id: true,
      name: true,
      description: true,
      durationMinutes: true,
      priceCents: true,
      category: { select: { name: true } },
      _count: {
        select: {
          bookings: {
            where: {
              startAt: { gte: since },
              status: { in: ['confirmed', 'completed'] },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Adaptación BD → view-model. Casteamos los JSON a LocalizedText
  // porque sabemos que el wizard y el seed los escriben con esa forma.
  const services: PanelService[] = records.map((r) => ({
    id: r.id,
    name: r.name as unknown as LocalizedText,
    description: r.description as unknown as LocalizedText,
    categoryLabel: r.category.name as unknown as LocalizedText,
    durationMinutes: r.durationMinutes,
    priceCents: r.priceCents,
    status: 'active',
    bookingsLast30Days: r._count.bookings,
  }));

  const panelLocale = locale as 'es' | 'ca' | 'en' | 'de';

  return <ServicesList services={services} locale={panelLocale} />;
}
