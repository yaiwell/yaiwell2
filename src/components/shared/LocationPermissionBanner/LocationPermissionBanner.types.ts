/**
 * Tipos específicos del banner de permiso de ubicación.
 *
 * Se mantienen en archivo aparte para que los tests y el `index.ts`
 * puedan importarlos sin arrastrar la implementación.
 */

export interface LocationPermissionBannerProps {
  /**
   * Clave única de sesión usada para recordar que el usuario ha
   * descartado el banner en esta visita. Se almacena en sessionStorage
   * (no localStorage: regla §6 de CLAUDE.md).
   */
  storageKey?: string;
}
