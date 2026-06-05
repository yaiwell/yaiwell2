import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { AdminShell } from '@/components/features/admin';
import { routing } from '@/i18n/routing';
import { requireRole } from '@/lib/auth';

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
 * Protegido por `requireRole(['admin'])` — cualquier rol no admin se
 * redirige a su destino natural; los anónimos van a `/entrar`.
 */
export default async function AdminLayout({ children, params }: AdminLayoutProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  await requireRole(['admin'], locale);

  return <AdminShell>{children}</AdminShell>;
}
