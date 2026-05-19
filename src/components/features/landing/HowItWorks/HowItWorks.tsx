import { CalendarDays, MapPin, Sparkle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { howItWorksStyles as s } from './HowItWorks.styles';
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

/**
 * Sección "Cómo funciona" — tres pasos breves para explicar el flujo.
 *
 * Server Component: no tiene estado ni eventos, todo viene de i18n.
 */
export function HowItWorks() {
  const t = useTranslations('home.howItWorks');

  return (
    <section className={s.root}>
      <div className={s.container}>
        <header className={s.header}>
          <h2 className={s.title}>{t('title')}</h2>
        </header>

        <ol className={s.grid}>
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <li key={step.index} className={s.step}>
                <span className={s.stepIndex} aria-hidden="true">
                  0{step.index + 1}
                </span>
                <span className={s.stepIconWrap} aria-hidden="true">
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
