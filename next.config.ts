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

export default withNextIntl(nextConfig);
