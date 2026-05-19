import { CalendarDays, MapPin, Sparkle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { howItWorksStyles as s, howItWorksToneStyles } from './HowItWorks.styles';
import type { HowItWorksStep } from './HowItWorks.types';

/**
 * Tres pasos del onboarding conceptual del usuario.
 *
 * Buscar (MapPin) → Reservar (CalendarDays) → Disfrutar (Sparkle).
 */
const steps: HowItWorksStep[] = [
  { index: 0, icon: MapPin },
  { index: 1, icon: CalendarDays },
  { index: 2, icon: Sparkle },
];

// Slugs estables para `data-component` de cada paso. Coinciden con el
// glosario en COMPONENTS.md y permiten referenciar cada paso en
// conversaciones aunque cambien los textos i18n.
const stepSlugs = ['buscar', 'reservar', 'disfrutar'] as const;

/**
 * Sección "Cómo funciona" — tres pasos breves para explicar el flujo.
 *
 * Server Component: no tiene estado ni eventos, todo viene de i18n.
 */
export function HowItWorks() {
  const t = useTranslations('home.howItWorks');

  return (
    <section className={s.root} data-component="how-it-works">
      <div className={s.container}>
        <header className={s.header} data-component="how-it-works-header">
          <h2 className={s.title}>{t('title')}</h2>
        </header>

        <ol className={s.grid}>
          {steps.map((step) => {
            const Icon = step.icon;
            const slug = stepSlugs[step.index];
            return (
              <li key={step.index} className={s.step} data-component={`how-it-works-step-${slug}`}>
                <span className={s.stepIndex} aria-hidden="true">
                  0{step.index + 1}
                </span>
                <span className={howItWorksToneStyles[step.index]} aria-hidden="true">
                  <Icon className="size-6" />
                </span>
                <h3 className={s.stepTitle}>{t(`steps.${step.index}.title`)}</h3>
                <p className={s.stepDescription}>{t(`steps.${step.index}.description`)}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
