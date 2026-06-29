/**
 * Tipos del dominio `provider` para operaciones del panel del proveedor.
 *
 * Este módulo cubre los updates puntuales que el panel ejecuta sobre el
 * Provider ya existente (datos generales, descripción, dirección…). El
 * alta inicial vive en `provider-onboarding` y la lectura pública vive
 * en `providers` (fake-data hoy). Mantenemos los tres separados para no
 * mezclar responsabilidades.
 */

import type { LocalizedText } from '@/types/domain';

/**
 * Input del update de configuración del centro disparado desde
 * `/panel/centro`.
 *
 * `description` viaja como `Partial<LocalizedText>` con solo la clave
 * del locale activo — el service fusiona con las claves existentes para
 * no perder traducciones ya guardadas en otros idiomas.
 */
export interface UpdateProviderSettingsInput {
  businessName: string;
  vatNumber?: string | null;
  description?: Partial<LocalizedText>;
  address: string;
}
