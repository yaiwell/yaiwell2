import { useTranslations } from 'next-intl';

import { skipToContentStyles as s } from './SkipToContent.styles';

/**
 * Enlace "saltar al contenido" para mejorar la accesibilidad por teclado.
 *
 * Es el primer elemento focusable del layout: al pulsar Tab tras cargar
 * la página, recibe foco y se hace visible. Al activarlo, el navegador
 * mueve el foco al wrapper `<main id="main">` y el siguiente Tab
 * continúa ya dentro del contenido, saltándose la cabecera.
 *
 * Ese salto de foco SOLO funciona porque el `<main>` de
 * `[locale]/layout.tsx` lleva `tabIndex={-1}`: un ancla apuntando a un
 * elemento no focusable mueve el scroll pero deja el foco donde estaba
 * en varios navegadores (Chrome y Safari históricamente), y el
 * siguiente Tab devolvía al usuario a la cabecera. Si alguien quita
 * ese `tabIndex`, este componente deja de cumplir su función aunque
 * siga pareciendo que funciona.
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
