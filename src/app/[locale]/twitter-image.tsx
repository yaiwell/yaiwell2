/**
 * Imagen de las tarjetas de X/Twitter.
 *
 * Reutiliza íntegramente la Open Graph: misma copy, mismas 1200x630
 * (las que pide `summary_large_image`). Se declara como fichero propio
 * porque X solo cae en `og:image` como último recurso y hay clientes
 * —Slack y algunos lectores— que solo miran `twitter:image`.
 *
 * Re-export puro: cero duplicación de la plantilla.
 */
export { alt, contentType, default, generateStaticParams, size } from './opengraph-image';
