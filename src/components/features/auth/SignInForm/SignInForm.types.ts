/**
 * Tipos específicos del componente SignInForm.
 *
 * Estos tipos sólo viven aquí porque son de UI; cuando conectemos Clerk
 * los campos reales del flujo de sign-in irán a `/types/domain.ts` o a
 * un servicio dedicado en `/lib/services/auth/`.
 */

/**
 * Rol con el que el visitante quiere entrar.
 *
 * Las pestañas del formulario sirven sobre todo para decidir el destino
 * post-login: los clientes vuelven al feed (`/`) y los proveedores
 * aterrizan en su panel (`/panel`).
 */
export type SignInRole = 'client' | 'provider';

/** Datos crudos que captura el formulario antes de validar. */
export interface SignInDraft {
  email: string;
  password: string;
  remember: boolean;
}

/** Estado de envío del formulario (mock asíncrono). */
export type SignInStatus = 'idle' | 'submitting' | 'error';

/**
 * Códigos de error de validación del formulario.
 *
 * Los tipamos como unión cerrada para que el componente UI pueda
 * mapearlos a claves de traducción sin perder el tipado estricto del
 * helper `t` de next-intl (que rechaza strings dinámicos).
 */
export type SignInErrorCode = 'emailRequired' | 'emailInvalid';
