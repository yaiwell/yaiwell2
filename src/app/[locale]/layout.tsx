import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { routing } from '@/i18n/routing';

import '../globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Beauly',
  description: 'Belleza, bienestar y deporte con disponibilidad inmediata.',
};

/**
 * Genera los parámetros estáticos para los locales soportados.
 * Permite que Next.js prerenderice el árbol de cada idioma en build time.
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

interface RootLayoutProps {
  children: React.ReactNode;
  // En Next.js 16 los `params` de los segmentos dinámicos son asíncronos.
  params: Promise<{ locale: string }>;
}

/**
 * Layout raíz por locale. Responsabilidades:
 * - Validar que el segmento `[locale]` es uno de los soportados, si no, 404.
 * - Activar el locale en el contexto del servidor (setRequestLocale) para
 *   que los Server Components puedan resolver traducciones sin recibirlo
 *   por props.
 * - Envolver el árbol en `NextIntlClientProvider` para que los Client
 *   Components hereden los mensajes y el locale.
 */
export default async function RootLayout({ children, params }: RootLayoutProps) {
  const { locale } = await params;

  // Si el segmento no coincide con un locale válido devolvemos 404.
  // Esto cubre URLs como `/zz/...` que de otro modo entrarían al árbol.
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Necesario para habilitar el renderizado estático dependiente del locale.
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
