import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  // En Fase 0 las fotos de proveedores y fondos vienen de Unsplash. Registramos
  // el hostname para que next/image pueda optimizarlas y evitemos el escape
  // `unoptimized` (audit 2026-05-27 §D.1). En Fase 1 estas URLs serán
  // sustituidas por Supabase Storage, que tendrá su propio remotePattern.
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // Avatares de usuarios de Clerk (perfil + Google/Apple OAuth).
      { protocol: 'https', hostname: 'img.clerk.com' },
    ],
  },
};

/**
 * Envolvemos la configuración con el plugin de next-intl.
 *
 * Apuntamos a `./src/i18n/request.ts` (la ruta debe ser relativa al
 * `next.config.ts`) para que next-intl sepa de dónde sacar los mensajes
 * y el locale en cada petición. Sin el plugin, los hooks de servidor
 * (`getTranslations`, `useTranslations` en RSC) no encontrarían config.
 */
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/**
 * Sentry envuelve la config para:
 *  - Crear releases automáticamente desde Vercel (asocia el `VERCEL_GIT_COMMIT_SHA`).
 *  - Subir source maps al build de producción (requiere `SENTRY_AUTH_TOKEN`).
 *  - Tunelizar peticiones del SDK por `/monitoring` para sortear ad-blockers
 *    que tiran las peticiones directas a `ingest.sentry.io`.
 *
 * Solo se activa si `SENTRY_AUTH_TOKEN` existe en build — sin token, el
 * wrapper no rompe el build pero tampoco sube source maps (los errores
 * de prod aparecerían como código minificado en Sentry). Mantiene la
 * config funcional en local sin necesidad del token.
 */
const baseConfig = withNextIntl(nextConfig);

const sentryEnabled = Boolean(
  process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT,
);

export default sentryEnabled
  ? withSentryConfig(baseConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      // Silenciamos logs informativos durante el build local; en CI
      // (Vercel) los queremos visibles si algo falla al subir maps.
      silent: !process.env.CI,
      // Tunel para esquivar ad-blockers que filtran `ingest.sentry.io`.
      // Los eventos van primero a nuestro dominio y de ahí a Sentry.
      tunnelRoute: '/monitoring',
      // Source maps solo en server + edge; hide en client para no
      // exponer paths internos en el `.map.js` público.
      sourcemaps: {
        disable: false,
        deleteSourcemapsAfterUpload: true,
      },
      // `reactComponentAnnotation` y `automaticVercelMonitors` se
      // movieron bajo `webpack` en versiones recientes del plugin.
      // Turbopack ignora esta rama en dev; el build de Vercel sí la
      // aplica (usa webpack para el build final).
      webpack: {
        reactComponentAnnotation: { enabled: false },
        automaticVercelMonitors: false,
      },
    })
  : baseConfig;
