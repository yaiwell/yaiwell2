import { auth } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { hasLocale } from 'next-intl';

import {
  BookingsList,
  OnsiteRestrictionNotice,
  ReviewFeedbackProvider,
  splitBookings,
} from '@/components/features/customer';
import { redirect } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { getCustomerBookings, getOnlineOnlyUntil } from '@/lib/services/customer-bookings';
import { ensureUserFromClerk } from '@/lib/services/user';

interface CustomerBookingsPageProps {
  // En Next.js 16 los `params` son Promises.
  params: Promise<{ locale: string }>;
}

/**
 * Página `/mis-reservas` del área cliente.
 *
 * Server Component que:
 *  1. Valida el locale.
 *  2. Resuelve el `User.id` del cliente autenticado a partir de Clerk.
 *  3. Pide sus reservas reales al service y las parte en tres grupos.
 *  4. Pasa los grupos al componente presentacional `BookingsList`.
 *
 * El aislamiento entre clientes vive en `getCustomerBookings`, que
 * filtra por `clientId` en la propia query: una reserva de otro usuario
 * no llega nunca hasta aquí.
 *
 * La regla de §4.bis sobre valoraciones (`completed`, 30 días, sin
 * reseña previa) la resuelve `getCustomerBookings` en `canReview`, con
 * el mismo `now` que usa `splitBookings`; la sección de "valoraciones
 * pendientes" solo recoge reservas con `canReview`.
 */
export default async function CustomerBookingsPage({ params }: CustomerBookingsPageProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  // El layout del área cliente ya exige sesión; repetimos el check aquí
  // porque la página no puede asumir el guard del layout para construir
  // una query filtrada por usuario.
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    redirect({ href: '/entrar', locale });
    return null;
  }

  // Un cliente puede tener sesión Clerk sin fila en `users` todavía
  // (alta reciente o webhook perdido). `ensureUserFromClerk` es
  // idempotente: crea la fila si falta y devuelve la existente si no.
  const user = await ensureUserFromClerk(clerkUserId);

  const t = await getTranslations('customerArea');
  const now = new Date();
  const [bookings, onlineOnlyUntil] = await Promise.all([
    getCustomerBookings(user.id, now),
    getOnlineOnlyUntil(user.id, now),
  ]);
  const { upcoming, past, pendingReview } = splitBookings(bookings, now);

  return (
    <div data-component="customer-bookings-page" className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-foreground text-3xl leading-tight sm:text-4xl">
          {t('page.title')}
        </h1>
        <p className="text-muted-foreground max-w-xl text-sm">{t('page.subtitle')}</p>
      </header>

      {/* Bloqueo «solo online» por no presentados (§4.bis): se avisa aquí
          para que no lo descubra a mitad de una reserva. */}
      {onlineOnlyUntil ? <OnsiteRestrictionNotice until={onlineOnlyUntil} /> : null}

      {/* El aviso de "valoración publicada" vive por encima del listado:
          al revalidar, la card valorada cambia de sección y su diálogo
          se desmonta, pero este estado se conserva. */}
      <ReviewFeedbackProvider>
        <BookingsList upcoming={upcoming} past={past} pendingReview={pendingReview} />
      </ReviewFeedbackProvider>
    </div>
  );
}
