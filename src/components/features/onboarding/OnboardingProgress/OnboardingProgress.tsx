import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

import { onboardingProgressStyles as s } from './OnboardingProgress.styles';
import type { OnboardingProgressProps } from './OnboardingProgress.types';

/**
 * Indicador visual del paso actual del wizard.
 *
 * Pinta una bolita por paso conectada por una barra de progreso.
 * Por accesibilidad incluye un `<p>` con la cadena "Paso X de N" que
 * los lectores de pantalla anuncian; las bolitas decorativas tienen
 * `aria-hidden` porque la información ya está en el caption.
 */
export function OnboardingProgress({ current, total }: OnboardingProgressProps) {
  const t = useTranslations('onboarding.stepper');

  // Generamos el array de pasos [1..total] sin crear una nueva
  // referencia en cada render (no nos importa: lista corta y estable).
  const steps = Array.from({ length: total }, (_, i) => i + 1);

  // Porcentaje de relleno de la barra de progreso entre la primera y
  // última bolita. En el paso 1 está a 0; en el último a 100.
  const progress = total <= 1 ? 0 : ((current - 1) / (total - 1)) * 100;

  // Etiquetas i18n por paso. Usamos un objeto de claves para que
  // `useTranslations` valide cada acceso.
  const labelKey = (step: number): 'step1' | 'step2' | 'step3' | 'step4' | 'step5' => {
    switch (step) {
      case 1:
        return 'step1';
      case 2:
        return 'step2';
      case 3:
        return 'step3';
      case 4:
        return 'step4';
      default:
        return 'step5';
    }
  };

  return (
    <div className={s.root} data-component="onboarding-progress">
      <div className={s.trackWrapper} aria-hidden>
        <span className={s.track} />
        <span className={s.trackFill} style={{ width: `${progress}%` }} />
        {steps.map((step) => {
          const isCurrent = step === current;
          const isDone = step < current;
          return (
            <div key={step} className={s.step}>
              <span
                className={cn(
                  s.dotBase,
                  isCurrent ? s.dotCurrent : isDone ? s.dotDone : s.dotPending,
                )}
              >
                {step}
              </span>
              <span className={cn(s.label, isCurrent && s.labelCurrent)}>{t(labelKey(step))}</span>
            </div>
          );
        })}
      </div>
      <p className={s.caption} aria-live="polite">
        {t('current', { current, total })}
      </p>
    </div>
  );
}
