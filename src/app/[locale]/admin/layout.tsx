import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { AdminShell } from '@/components/features/admin';
import { routing } from '@/i18n/routing';

interface AdminLayoutProps {
  children: React.ReactNode;
  // En Next.js 16 los `params` son asíncronos.
  params: Promise<{ locale: string }>;
}

/**
 * Layout del área admin.
 *
 * Envuelve todas las rutas internas (`/admin`, `/admin/verificaciones/[id]`)
 * con el `AdminShell` (topbar sobrio + zona principal). Deliberadamente
 * no añade ornamento adicional: el panel admin es una herramienta
 * interna, no parte de la experiencia de marca pública.
 *
 * En Fase 1 este layout comprobará el rol `admin` vía Clerk y redirigirá
 * a `/` si el usuario no tiene permisos.
 */
export default async function AdminLayout({ children, params }: AdminLayoutProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  return <AdminShell>{children}</AdminShell>;
}
