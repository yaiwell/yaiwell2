import { ImageResponse } from 'next/og';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';

import { routing } from '@/i18n/routing';

/**
 * Imagen Open Graph por defecto del marketplace, generada en código.
 *
 * **Por qué en código y no un PNG en `public/`**: el layout apuntaba a
 * `/og-default.png` y en `public/` solo existía `og-default.svg`, así
 * que cada enlace compartido en WhatsApp, X o LinkedIn pedía un 404
 * (ninguna de esas plataformas renderiza SVG en Open Graph). Generarla
 * con `ImageResponse` evita versionar un binario, mantiene la copy
 * dentro de i18n y da una imagen distinta por idioma sin multiplicar
 * ficheros. Next la optimiza estáticamente en build, así que el coste
 * en runtime es cero.
 *
 * Aplica a todo el árbol `[locale]` salvo que un segmento hijo defina
 * su propia `opengraph-image`.
 */

/** Dimensiones exigidas por Open Graph y Twitter `summary_large_image`. */
export const size = { width: 1200, height: 630 };

export const contentType = 'image/png';

/**
 * Texto alternativo. La convención de Next exige un valor estático
 * (se evalúa a nivel de módulo, fuera del contexto de la request), así
 * que usamos el nombre de marca, que es neutro en los cuatro idiomas.
 * La copy traducida va dentro de la imagen.
 */
export const alt = 'Yaiwell';

/**
 * Prerenderiza una imagen por locale en build en lugar de resolverlas
 * bajo demanda.
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * Paleta de la imagen.
 *
 * Réplica en hexadecimal de los tokens de `globals.css` (`--background`,
 * `--foreground`, `--primary`, `--brand-rose`). Satori —el motor de
 * `ImageResponse`— no resuelve variables CSS ni el espacio de color
 * `oklch()`, así que aquí van los valores planos. Si cambia la marca,
 * actualizar ambos sitios.
 */
const palette = {
  background: '#fdfbf6',
  foreground: '#2e1e26',
  primary: '#5a2b40',
  muted: '#6d5560',
  rose: '#e08a8f',
};

interface OpenGraphImageProps {
  // En Next.js 16 los `params` de los segmentos dinámicos son asíncronos.
  params: Promise<{ locale: string }>;
}

export default async function OpenGraphImage({ params }: OpenGraphImageProps) {
  const { locale } = await params;
  const safeLocale = hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;
  const t = await getTranslations({ locale: safeLocale, namespace: 'seo' });

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '72px 80px',
        background: palette.background,
        // Satori exige `display: flex` explícito en todos los nodos
        // con hijos; no implementa el flujo de bloque del navegador.
        color: palette.foreground,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            background: palette.rose,
            display: 'flex',
          }}
        />
        <div style={{ display: 'flex', fontSize: 44, fontWeight: 700, letterSpacing: -1 }}>
          Yaiwell
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div
          style={{
            display: 'flex',
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: -2,
            color: palette.primary,
          }}
        >
          {t('defaultTitle')}
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 30,
            lineHeight: 1.35,
            color: palette.muted,
          }}
        >
          {t('defaultDescription')}
        </div>
      </div>

      <div style={{ display: 'flex', height: 8, background: palette.rose, borderRadius: 4 }} />
    </div>,
    // Reutilizamos el `size` exportado para que los metadatos declarados
    // (`og:image:width` / `og:image:height`) y los píxeles reales no
    // puedan divergir.
    { ...size },
  );
}
