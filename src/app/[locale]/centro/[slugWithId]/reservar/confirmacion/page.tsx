import { auth } from '@clerk/nextjs/server';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { BookingConfirmation } from '@/components/features/booking/BookingConfirmation';
import { routing, type AppLocale } from '@/i18n/routing';
import { getBookingForConfirmation } from '@/lib/services/checkout';
import { getProviderDetail } from '@/lib/services/providers';
import { ensureUserFromClerk } from '@/lib/services/user';
import { parseProviderIdFromSlugWithId } from '@/lib/utils/provider-slug';

/**
 * Pantalla de confirmación tras volver de Stripe.
 *
 * URL: `/centro/{slug}-{id}/reservar/confirmacion?bookingId=...`
 *
 * Es el `return_url` que se le pasa a `confirmPayment`, así que sólo se
 * visita cuando la tarjeta exigió 3D Secure y el navegador salió de la
 * app. El resto de pagos se resuelven sin salir del flujo y ven la misma
 * pantalla renderizada en cliente.
 *
 * Lee el estado **desde BD**, no de los query params que añade Stripe
 * (`redirect_status`): esos los controla quien manipule la URL, y la
 * verdad sobre si una reserva está confirmada la dicta el webhook.
 */

interface ConfirmationPageProps {
  params: Promise<{ locale: string; slugWithId: string }>;
  searchParams: Promise<{ bookingId?: string | string[] }>;
}

export async function generateMetadata({ params }: ConfirmationPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};

  const t = await getTranslations({ locale, namespace: 'booking.meta' });
  return {
    title: t('confirmationTitle'),
    // Una confirmación de reserva no debe indexarse nunca: es contenido
    // privado y con id de reserva en la URL.
    robots: { index: false, follow: false },
  };
}

export default async function BookingConfirmationPage({
  params,
  searchParams,
}: ConfirmationPageProps) {
  const { locale, slugWithId } = await params;
  const { bookingId: bookingIdRaw } = await searchParams;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const bookingId = Array.isArray(bookingIdRaw) ? bookingIdRaw[0] : bookingIdRaw;
  const providerId = parseProviderIdFromSlugWithId(slugWithId);
  if (!bookingId || !providerId) {
    notFound();
  }

  // Sin sesión no hay forma de comprobar titularidad: mandamos a login
  // en vez de a 404 para que el usuario pueda recuperar su reserva.
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    redirect(`/${locale}/entrar`);
  }
  const user = await ensureUserFromClerk(clerkUserId);

  const booking = await getBookingForConfirmation(bookingId, user.id);
  // `null` cubre tanto "no existe" como "no es tuya": no distinguimos
  // para no filtrar la existencia de reservas ajenas.
  if (!booking || booking.providerId !== providerId) {
    notFound();
  }

  const detail = await getProviderDetail(providerId);
  const service = detail?.services.find((s) => s.id === booking.serviceId);
  if (!detail || !service) {
    notFound();
  }

  return (
    <section className="mx-auto w-full max-w-2xl px-4 py-10">
      <BookingConfirmation
        provider={detail.provider}
        service={service}
        locale={locale as AppLocale}
        slotStartIso={booking.startAt.toISOString()}
        slotEndIso={booking.endAt.toISOString()}
        bookingId={booking.id}
        providerSlugWithId={slugWithId}
        // El webhook puede tardar unos segundos: si aún está `pending`,
        // el copy lo dice en lugar de prometer una confirmación falsa.
        paymentPending={booking.status === 'pending'}
      />
    </section>
  );
}
