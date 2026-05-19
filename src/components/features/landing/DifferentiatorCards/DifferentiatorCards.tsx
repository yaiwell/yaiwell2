import { BadgeCheck, Clock, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { differentiatorCardsStyles as s } from './DifferentiatorCards.styles';
import type { DifferentiatorCard } from './DifferentiatorCards.types';

/**
 * Las tres promesas centrales que diferencian Beauly:
 * 1) Disponibilidad real (Clock).
 * 2) Curación premium (BadgeCheck).
 * 3) Sin compromiso (ShieldCheck).
 *
 * Ver VISION.md para el detalle de cada pilar.
 */
const cards: DifferentiatorCard[] = [
  { index: 0, icon: Clock },
  { index: 1, icon: BadgeCheck },
  { index: 2, icon: ShieldCheck },
];

/**
 * Sección "Por qué Beauly" — tres cards con el diferencial frente a la
 * competencia (Treatwell/Booksy/Fresha).
 */
export function DifferentiatorCards() {
  const t = useTranslations('home.differentiator');

  return (
    <section className={s.root}>
      <div className={s.container}>
        <header className={s.header}>
          <h2 className={s.title}>{t('title')}</h2>
        </header>

        <div className={s.grid}>
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <article key={card.index} className={s.card}>
                <span className={s.iconWrap} aria-hidden="true">
                  <Icon className="size-6" />
                </span>
                <h3 className={s.cardTitle}>{t(`cards.${card.index}.title`)}</h3>
                <p className={s.cardBody}>{t(`cards.${card.index}.body`)}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
