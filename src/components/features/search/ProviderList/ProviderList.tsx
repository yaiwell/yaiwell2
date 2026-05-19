'use client';

import { useTranslations } from 'next-intl';

import { ProviderCard } from '../ProviderCard';
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
      <div className="flex flex-col items-start gap-2 rounded-3xl border border-dashed border-stone-200 bg-stone-50/50 p-8 text-stone-700">
        <h3 className="font-serif text-xl">{t('title')}</h3>
        <p className="text-sm text-stone-600">{t('subtitle')}</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-5">
      {providers.map((provider) => (
        <li key={provider.id}>
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
