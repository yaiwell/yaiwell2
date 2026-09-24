import { createNavigation } from 'next-intl/navigation';

import { routing } from './routing';

/**
 * Wrappers de navegación tipados con el routing del proyecto.
 *
 * Usar SIEMPRE estos `Link`, `redirect`, `usePathname`, `useRouter` y
 * `getPathname` en lugar de los equivalentes de `next/link` y
 * `next/navigation`. Estos respetan los locales configurados (con
 * `localePrefix: 'always'`, prefijo de idioma en todas las rutas) y
 * mantendrán las traducciones de paths cuando definamos `pathnames`
 * localizados en el futuro.
 *
 * `getPathname` es además la fuente de verdad de las URLs canónicas y
 * de los `hreflang` (ver `@/lib/seo`): construirlas a mano fue lo que
 * dejó el SEO congelado en la estrategia `as-needed`.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
