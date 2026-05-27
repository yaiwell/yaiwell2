/**
 * Tipos específicos del componente SignUpForm.
 *
 * Los tipos compartidos del dominio (User, Provider, Role) viven en
 * `/types/domain.ts`. Aquí solo modelamos lo que pertenece a la UI del
 * formulario: pestañas, draft del estado y mapa de errores.
 */

/**
 * Pestaña activa del formulario.
 *
 * - `client`: alta de un usuario final que viene a reservar servicios.
 * - `provider`: alta de un autónomo o centro que ofrecerá servicios y
 *   pasará por verificación manual antes de salir publicado.
 */
export type SignUpRole = 'client' | 'provider';

/**
 * Estado del formulario.
 *
 * Mantenemos un único draft para ambas pestañas y solo validamos los
 * campos relevantes a la pestaña activa. Permite cambiar de pestaña sin
 * perder lo que el usuario ya tecleó.
 */
export interface SignUpDraft {
  fullName: string;
  businessName: string;
  email: string;
  password: string;
  passwordRepeat: string;
  acceptsTerms: boolean;
}

/**
 * Mapa de errores por campo. La clave coincide con el nombre del campo
 * en el `SignUpDraft` para poder pintar `aria-invalid` y el mensaje
 * inline sin lógica extra.
 */
export type SignUpFieldErrors = Partial<Record<keyof SignUpDraft, string>>;

/**
 * Identificadores de campos. Los usamos como `id`/`htmlFor` para
 * asociar labels y mensajes de error de forma consistente.
 */
export const SIGN_UP_FIELD_IDS = {
  fullName: 'signup-full-name',
  businessName: 'signup-business-name',
  email: 'signup-email',
  password: 'signup-password',
  passwordRepeat: 'signup-password-repeat',
  acceptsTerms: 'signup-accepts-terms',
} as const;
