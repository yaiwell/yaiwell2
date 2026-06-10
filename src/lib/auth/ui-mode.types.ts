/**
 * Tipos compartidos por server y client del módulo `ui-mode`.
 *
 * Vive aparte de `ui-mode.ts` porque ese archivo es `server-only` (usa
 * `cookies()`), y necesitamos que los Client Components (MobileNav,
 * Header) puedan importar el tipo `UiMode` para sus props sin arrastrar
 * dependencias server.
 */

/**
 * Modo de UI que ve el usuario.
 *
 * Diferencia clave con `UserRole`:
 *  - `UserRole` es el rol real (almacenado en Clerk publicMetadata).
 *  - `UiMode` es la vista activa de la app. Un usuario con rol provider
 *    puede alternar entre `provider` (herramienta de gestión) y `client`
 *    (marketplace público) para no necesitar dos cuentas. El rol no
 *    cambia, solo la UI.
 *
 * `admin` no aparece aquí porque admins no tienen swap — la consola
 * administrativa vive en `/admin` con su propio shell.
 */
export type UiMode = 'client' | 'provider';

/**
 * Nombre de la cookie que persiste el modo elegido por el usuario.
 *
 * No httpOnly intencionadamente: el cliente puede leerla para hidratar
 * sin parpadeo si lo necesitamos en futuro. SameSite=Lax es seguro para
 * navegación normal y evita CSRF en POSTs cross-site.
 */
export const UI_MODE_COOKIE_NAME = 'yaiwell.uiMode';
