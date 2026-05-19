import { createNavigation } from 'next-intl/navigation';

import { routing } from './routing';

/**
 * Wrappers de navegación tipados con el routing del proyecto.
 *
 * Usar SIEMPRE estos `Link`, `redirect`, `usePathname`, `useRouter` y
 * `getPathname` en lugar de los equivalentes de `next/link` y
 * `next/navigation`. Estos respetan los locales configurados (prefijos
 * `as-needed`) y mantendrán las traducciones de paths cuando definamos
 * `pathnames` localizados en el futuro.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
