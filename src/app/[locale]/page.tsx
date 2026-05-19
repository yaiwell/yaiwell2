import { notFound } from 'next/navigation';
import { hasLocale, useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { routing } from '@/i18n/routing';

interface HomePageProps {
  // En Next.js 16 los `params` son asíncronos.
  params: Promise<{ locale: string }>;
}

/**
 * Página principal. Por ahora es un esqueleto mínimo que valida que el
 * pipeline de i18n funciona end-to-end: el layout valida el locale y esta
 * página consume traducciones del namespace `home` definido en
 * `/messages/{locale}.json`.
 *
 * Activamos el locale con `setRequestLocale` para que la página sea
 * estática por locale (necesario al usar `generateStaticParams` en el
 * layout). Si no se activara, next-intl forzaría renderizado dinámico.
 */
export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;

  // Validamos de nuevo en la página: el layout también lo hace, pero
  // `setRequestLocale` exige el tipo estrecho `Locale`, no `string`.
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return <HomeContent />;
}

/**
 * Subcomponente síncrono para poder usar el hook `useTranslations`.
 * Mantenerlo separado permite que `HomePage` resuelva `params` con `await`
 * sin convertir todo el árbol en async.
 */
function HomeContent() {
  const t = useTranslations('home');

  return (
    <main className="bg-background text-foreground flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="flex max-w-3xl flex-col items-center gap-6 text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{t('title')}</h1>
        <p className="text-muted-foreground max-w-2xl text-lg leading-relaxed">{t('subtitle')}</p>
        <button
          type="button"
          className="bg-foreground text-background rounded-full px-6 py-3 text-base font-medium transition-opacity hover:opacity-90"
        >
          {t('cta')}
        </button>
      </div>
    </main>
  );
}
