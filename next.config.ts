import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  /* config options here */
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
