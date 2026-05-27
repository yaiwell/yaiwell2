import type { Metadata } from 'next';
import { Fraunces, Geist_Mono, Inter } from 'next/font/google';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { routing } from '@/i18n/routing';
import {
  Footer,
  Header,
  LocationPermissionBanner,
  MobileNav,
  UserLocationProvider,
} from '@/components/shared';
import { ThemeProvider } from '@/components/shared/ThemeToggle';
import { SkipToContent } from '@/components/shared/SkipToContent';
import { COOKIE_NAME as LOCATION_COOKIE_NAME, readLocationFromHeaders } from '@/lib/services/location';
import { isThemePreference, THEME_COOKIE_NAME, type ThemePreference } from '@/lib/utils/theme';

import '../globals.css';

// Inter: sans serif neutral, gran legibilidad en pantalla.
const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

// Fraunces: serif moderno con carácter, ideal para titulares editoriales.
// Variable font con eje "SOFT" para suavizar contornos en pantalla.
const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  display: 'swap',
  axes: ['SOFT', 'opsz'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

/**
 * URL base canónica del sitio. Imprescindible para que las URLs
 * absolutas (`openGraph.url`, `canonical`, sitemap) sean correctas en
 * cada entorno. Vercel expone `VERCEL_URL` con el host del deploy actual.
 */
const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

/**
 * Genera los metadatos SEO por locale.
 *
 * Incluye:
 *  - `title` con plantilla `%s | Beauly` para que las páginas hijas
 *    solo definan su título específico.
 *  - `description` editorial traducible.
 *  - `openGraph` y `twitter` con imagen por defecto en /og-default.png
 *    (placeholder; ver reporte: pendiente crear 1200x630 real).
 *  - `alternates.canonical` y `alternates.languages` (hreflang) para que
 *    Google sirva la versión correcta por mercado.
 *  - `robots` con allow explícito mientras estamos en Fase 0.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const safeLocale = hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;
  const t = await getTranslations({ locale: safeLocale, namespace: 'seo' });

  // Con `localePrefix: 'as-needed'` la versión `es` no lleva prefijo y
  // la `ca` sí. Calculamos el path canónico en consecuencia.
  const canonicalPath = safeLocale === routing.defaultLocale ? '/' : `/${safeLocale}`;

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: t('defaultTitle'),
      template: '%s | Beauly',
    },
    description: t('defaultDescription'),
    applicationName: 'Beauly',
    alternates: {
      canonical: canonicalPath,
      languages: {
        es: '/',
        ca: '/ca',
        'x-default': '/',
      },
    },
    openGraph: {
      type: 'website',
      siteName: 'Beauly',
      title: t('defaultTitle'),
      description: t('defaultDescription'),
      url: canonicalPath,
      locale: safeLocale === 'ca' ? 'ca_ES' : 'es_ES',
      images: [
        {
          url: '/og-default.png',
          width: 1200,
          height: 630,
          alt: t('ogImageAlt'),
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('defaultTitle'),
      description: t('defaultDescription'),
      images: ['/og-default.png'],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      },
    },
  };
}

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
 * Script anti-FOUC. Se inyecta inline en `<head>` y corre antes de
 * cualquier render React: lee la cookie de tema, resuelve "system" con
 * `matchMedia` y aplica la clase `dark` al `<html>` para que el primer
 * pintado ya tenga los colores correctos. Encapsulado en try/catch para
 * que cualquier excepción (cookies deshabilitadas, navegadores antiguos)
 * no rompa la carga inicial.
 */
const themeAntiFoucScript = `
(function(){
  try {
    var m = document.cookie.match(/(?:^|; )${THEME_COOKIE_NAME}=([^;]*)/);
    var pref = m ? decodeURIComponent(m[1]) : 'system';
    var resolved = pref;
    if (pref === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    if (resolved === 'dark') document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = resolved;
  } catch (e) {}
})();
`;

/**
 * Layout raíz por locale. Responsabilidades:
 * - Validar que el segmento `[locale]` es uno de los soportados, si no, 404.
 * - Activar el locale en el contexto del servidor (setRequestLocale) para
 *   que los Server Components puedan resolver traducciones sin recibirlo
 *   por props.
 * - Leer la cookie de tema en servidor para evitar parpadeo en el
 *   primer render y pasarla al `ThemeProvider`.
 * - Envolver el árbol en `NextIntlClientProvider` para que los Client
 *   Components hereden los mensajes y el locale.
 * - Componer el shell visual común (Header / MobileNav / Footer) alrededor
 *   del contenido. El padding-bottom en mobile evita que el contenido
 *   quede tapado por el MobileNav fixed.
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

  // Leemos la preferencia de tema desde cookie del request para inicializar
  // el provider sin desincronizarse con el script anti-FOUC.
  const cookieStore = await cookies();
  const rawPreference = cookieStore.get(THEME_COOKIE_NAME)?.value;
  const initialThemePreference: ThemePreference = isThemePreference(rawPreference)
    ? rawPreference
    : 'system';

  // Leemos también la ubicación guardada (si la hay) para que el provider
  // hidrate sin parpadeo. Construimos el header `cookieName=value` y lo
  // pasamos al parser SSR-safe del módulo location.
  const rawLocationCookie = cookieStore.get(LOCATION_COOKIE_NAME)?.value;
  const initialUserLocation = rawLocationCookie
    ? readLocationFromHeaders(`${LOCATION_COOKIE_NAME}=${rawLocationCookie}`)
    : null;

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${fraunces.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Script anti-FOUC: aplica la clase dark antes del primer pintado. */}
        <script dangerouslySetInnerHTML={{ __html: themeAntiFoucScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>
          <ThemeProvider initialPreference={initialThemePreference}>
            {/* UserLocationProvider envuelve el shell para que cabecera,
                contenido y mobile nav puedan leer la ubicación con el
                mismo hook (`useUserLocation`). Se monta dentro del
                NextIntlClientProvider para que su UI hija pueda traducir. */}
            <UserLocationProvider initialLocation={initialUserLocation}>
              {/* Skip link para usuarios de teclado y lectores de pantalla:
                  solo es visible al recibir foco y permite saltar la
                  navegación cabecera para ir directo al contenido. */}
              <SkipToContent />
              <Header />
              {/* El padding inferior en mobile reserva espacio para el bottom
                  tab bar (MobileNav). En desktop el tab bar se oculta y no
                  hace falta el padding extra. El `id="main"` es el destino
                  del skip link. */}
              <main id="main" className="flex flex-1 flex-col pb-20 md:pb-0">
                {children}
              </main>
              <Footer />
              <MobileNav />
              {/* Banner discreto que solicita permiso de ubicación la
                  primera vez. Se monta fuera del flujo (fixed) y se
                  oculta solo cuando el usuario ya ha decidido o lo ha
                  descartado en esta sesión. */}
              <LocationPermissionBanner />
            </UserLocationProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
