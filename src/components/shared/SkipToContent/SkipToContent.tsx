import { useTranslations } from 'next-intl';

import { skipToContentStyles as s } from './SkipToContent.styles';

/**
 * Enlace "saltar al contenido" para mejorar la accesibilidad por teclado.
 *
 * Es el primer elemento focusable del layout: al pulsar Tab tras cargar
 * la página, recibe foco y se hace visible. Al activarlo, mueve el foco
 * al wrapper `<main id="main">` para que los usuarios de teclado o
 * lectores de pantalla puedan saltarse la navegación de cabecera.
 *
 * Es un Server Component: sin estado ni interacción más allá del propio
 * anchor jump, así que no necesita `'use client'`.
 */
export function SkipToContent() {
  const t = useTranslations('nav');

  return (
    <a href="#main" className={s.link} data-component="skip-to-content">
      {t('skipToContent')}
    </a>
  );
}
