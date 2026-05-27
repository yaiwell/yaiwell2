import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { CustomerShell } from '@/components/features/customer';
import { routing } from '@/i18n/routing';

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
 * En la maqueta de Fase 0 no hay auth real: en Fase 1 este layout
 * será el punto donde Clerk valide la sesión y la redirija a /entrar
 * si no hay usuario.
 */
export default async function CustomerLayout({ children, params }: CustomerLayoutProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  return <CustomerShell activePath="/mis-reservas">{children}</CustomerShell>;
}
