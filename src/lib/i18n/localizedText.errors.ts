/**
 * Errores tipados de la construcción de textos localizados.
 *
 * Van en archivo aparte (y no en `localizedText.ts`) para que los
 * bordes que solo necesitan capturar el error no arrastren los
 * constructores, y para respetar el patrón `*.errors.ts` de §6.bis.
 */

/**
 * Se intentó construir un `LocalizedText` guardable sin texto en
 * ningún idioma (o solo con espacios).
 *
 * No es un fallo de traducción sino de contenido: el formulario debe
 * rechazarlo antes, y si llega aquí es que un borde se saltó su
 * validación Zod.
 */
export class EmptyLocalizedTextError extends Error {
  readonly code = 'EMPTY_LOCALIZED_TEXT';

  constructor(message = 'El texto no puede estar vacío en todos los idiomas.') {
    super(message);
    this.name = 'EmptyLocalizedTextError';
  }
}
