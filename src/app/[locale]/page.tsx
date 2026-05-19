import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { routing } from '@/i18n/routing';
import {
  CategoryGrid,
  DifferentiatorCards,
  FinalCTA,
  Hero,
  HowItWorks,
} from '@/components/features/landing';

interface HomePageProps {
  // En Next.js 16 los `params` son asíncronos.
  params: Promise<{ locale: string }>;
}

/**
 * Landing principal de Beauly.
 *
 * Composición de las cinco secciones que cuentan la propuesta de valor:
 * Hero (con buscador prominente) → Categorías populares → Cómo funciona
 * → Diferenciales frente a competencia → CTA final.
 *
 * Validamos el locale y activamos `setRequestLocale` para mantener el
 * renderizado estático por idioma que define el layout.
 */
export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;

  // Validamos en la página: el layout también lo hace, pero
  // `setRequestLocale` exige el tipo estrecho `Locale`, no `string`.
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <div data-component="home-page" className="contents">
      <Hero />
      <CategoryGrid />
      <HowItWorks />
      <DifferentiatorCards />
      <FinalCTA />
    </div>
  );
}
