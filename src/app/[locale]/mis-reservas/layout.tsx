import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { CustomerShell } from '@/components/features/customer';
import { routing } from '@/i18n/routing';
import { requireRole } from '@/lib/auth/server';

interface CustomerLayoutProps {
  children: React.ReactNode;
  // En Next.js 16 los `params` son asíncronos.
  params: Promise<{ locale: string }>;
}

/**
 * Layout del área cliente.
 *
 * Envuelve todas las rutas privadas del cliente (`/mis-reservas`,
 * `/mis-favoritos`, etc.) con el `CustomerShell` (sidebar + main).
 *
 * Protegido por `requireRole(['client'])`. Un proveedor o admin que
 * entre aquí va a su destino natural (`/panel` / `/admin`); los anónimos
 * van a `/entrar`. Si en el futuro un provider necesita ver sus propias
 * reservas como cliente, lo gestionaremos con un "switch de rol" en UI,
 * no abriendo este área a otros roles (las reservas que ve aquí son
 * filtradas por `clientId`).
 */
export default async function CustomerLayout({ children, params }: CustomerLayoutProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  await requireRole(['client'], locale);

  return <CustomerShell activePath="/mis-reservas">{children}</CustomerShell>;
}
