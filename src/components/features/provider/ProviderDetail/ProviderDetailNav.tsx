'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

import { providerDetailNavStyles as s } from './ProviderDetailNav.styles';

/**
 * Identificadores de las secciones a las que enlazan las tabs.
 * Coinciden con el `id` que `ProviderDetail` aplica a cada `<section>`.
 */
const SECTIONS = ['services', 'reviews', 'info'] as const;
type SectionId = (typeof SECTIONS)[number];

/**
 * Barra de tabs sticky para la ficha en mobile.
 *
 * No es un tab panel real (las secciones siempre están renderizadas
 * apiladas); las tabs hacen `scrollIntoView` suave al ancla. Esto
 * mantiene una sola fuente de UI para mobile y desktop y evita
 * mantener estado oculto/visible que rompe el SEO de la ficha.
 *
 * La tab activa se calcula con un IntersectionObserver: la sección
 * más visible en el viewport gana. Si el usuario hace scroll manual,
 * la tab se sincroniza sin que él tenga que hacer nada.
 */
export function ProviderDetailNav() {
  const t = useTranslations('providerDetail.tabs');
  const [active, setActive] = useState<SectionId>('services');

  useEffect(() => {
    // Observamos las tres secciones y elegimos como activa la que
    // tenga mayor ratio de intersección con el viewport.
    const elements = SECTIONS.map((id) => document.getElementById(`section-${id}`)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        const best = visible.reduce((a, b) => (a.intersectionRatio >= b.intersectionRatio ? a : b));
        const id = best.target.id.replace(/^section-/, '') as SectionId;
        if (SECTIONS.includes(id)) setActive(id);
      },
      // rootMargin negativo arriba para que la "zona caliente" empiece
      // por debajo del propio sticky y no por encima.
      { rootMargin: '-120px 0px -50% 0px', threshold: [0.1, 0.5, 0.9] },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const goTo = (id: SectionId) => {
    const el = document.getElementById(`section-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActive(id);
  };

  return (
    <nav className={s.root} aria-label="Secciones de la ficha" data-component="provider-tabs">
      {SECTIONS.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => goTo(id)}
          className={cn(s.tab, active === id && s.tabActive)}
          aria-current={active === id ? 'true' : undefined}
          data-component={`provider-tabs-${id}`}
        >
          {t(id)}
        </button>
      ))}
    </nav>
  );
}
