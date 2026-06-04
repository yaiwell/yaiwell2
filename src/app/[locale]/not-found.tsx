import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { NotFoundView } from '@/components/features/not-found/NotFoundView';

/**
 * Página 404 global por locale.
 *
 * Se dispara cuando una ruta dentro de `/[locale]` no encuentra
 * coincidencia o cuando un Server Component llama a `notFound()`
 * sin tener un `not-found.tsx` más específico (como la ficha de
 * proveedor, que sí tiene el suyo).
 *
 * Server Component sin estado: delega todo el render en
 * `NotFoundView`, que es el componente que lee las traducciones
 * del namespace `notFound` y aporta los CTAs hacia inicio y
 * búsqueda. El layout `[locale]/layout.tsx` ya envuelve la página
 * con Header, MobileNav y Footer, por lo que aquí solo emitimos
 * el contenido.
 */
export async function generateMetadata(): Promise<Metadata> {
  // `next-intl` infiere el locale activo de la request; usamos el
  // namespace `notFound` para mantener el título consistente con el
  // contenido visible.
  const t = await getTranslations('notFound');

  return {
    title: `${t('title')} · Yaiwell`,
    description: t('subtitle'),
  };
}

export default function LocalizedNotFound() {
  return <NotFoundView />;
}
