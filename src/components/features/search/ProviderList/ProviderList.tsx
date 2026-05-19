'use client';

import { useTranslations } from 'next-intl';

import { ProviderCard } from '../ProviderCard';
import { providerListStyles as s } from './ProviderList.styles';
import type { ProviderListProps } from './ProviderList.types';

/**
 * Lista de cards de proveedor. Componente "tonto": orquesta la
 * iteración, el empty-state y propaga el hover hacia el padre.
 *
 * No usa virtualización porque el MVP nunca renderiza más de ~50 items
 * a la vez (cinturón de seguridad: documentar en TODO si crece).
 */
export function ProviderList({
  providers,
  fromPriceMap,
  highlightedId,
  onHoverProvider,
}: ProviderListProps) {
  const t = useTranslations('search.empty');

  if (providers.length === 0) {
    return (
      <div className={s.empty} data-component="provider-list-empty">
        <h3 className={s.emptyTitle}>{t('title')}</h3>
        <p className={s.emptySubtitle}>{t('subtitle')}</p>
      </div>
    );
  }

  return (
    <ul className={s.list} data-component="provider-list">
      {providers.map((provider) => (
        <li key={provider.id} data-component={`provider-list-item-${provider.slug ?? provider.id}`}>
          <ProviderCard
            provider={provider}
            fromPriceCents={fromPriceMap[provider.id] ?? null}
            highlighted={highlightedId === provider.id}
            onHover={onHoverProvider}
          />
        </li>
      ))}
    </ul>
  );
}
