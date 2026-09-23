import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

/**
 * Mock de `@/i18n/navigation`: su implementación real importa
 * `next/navigation` con un especificador que el resolver de Vitest no
 * resuelve dentro de happy-dom. Mismo patrón que en
 * `ForProvidersLanding.test.tsx`.
 */
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: ComponentProps<'a'>) => (
    <a href={typeof href === 'string' ? href : '#'} {...rest}>
      {children}
    </a>
  ),
}));

import type { PublicPlan } from '@/lib/services/plans';

import { ForProvidersPricing } from './ForProvidersPricing';

const planCopy = (name: string) => ({
  name,
  tagline: `Tagline ${name}`,
  feature1: 'F1',
  feature2: 'F2',
  feature3: 'F3',
  feature4: 'F4',
});

const messages = {
  forProviders: {
    pricing: {
      eyebrow: 'Planes',
      title: 'Empieza gratis.',
      subtitle: 'Subtítulo planes.',
      popularBadge: 'Más elegido',
      perMonth: '/mes',
      commission: 'Comisión {rate}',
      ctaStart: 'Empezar',
      plans: {
        free: planCopy('Gratis'),
        basic: planCopy('Básico'),
        pro: planCopy('Pro'),
        premium: planCopy('Premium'),
      },
    },
  },
};

function renderPricing(plans: PublicPlan[]) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <ForProvidersPricing plans={plans} />
    </NextIntlClientProvider>,
  );
}

/**
 * Quita todo espacio (incluidos el duro y el fino que Intl inserta
 * antes del `%` en castellano) para comparar solo las cifras. Así el
 * test no se rompe si cambia la convención tipográfica del locale.
 */
function squash(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/gu, '');
}

function cardOf(tier: string): HTMLElement {
  const card = document.querySelector<HTMLElement>(`[data-component="for-providers-plan-${tier}"]`);
  if (!card) throw new Error(`No se ha renderizado la card del plan ${tier}.`);
  return card;
}

function commissionOf(tier: string): string {
  return squash(
    cardOf(tier).querySelector('[data-component="for-providers-plan-commission"]')?.textContent,
  );
}

function priceOf(tier: string): string {
  return squash(
    cardOf(tier).querySelector('[data-component="for-providers-plan-price"]')?.textContent,
  );
}

describe('ForProvidersPricing', () => {
  it('pinta las cifras que recibe, no constantes del componente', () => {
    // Valores imposibles de acertar por casualidad: si alguien
    // reintrodujera un array hardcodeado, este test caería.
    renderPricing([
      { tier: 'free', monthlyPriceCents: 4242, commissionRateBps: 1234, maxServices: 1 },
      { tier: 'pro', monthlyPriceCents: 700, commissionRateBps: 950, maxServices: 50 },
    ]);

    expect(commissionOf('free')).toBe(squash('Comisión 12,34 %'));
    expect(priceOf('free')).toBe('42,42');

    // Medio punto de comisión: 950 bps → "9,5 %" (no "9,50 %" ni "10 %").
    expect(commissionOf('pro')).toBe(squash('Comisión 9,5 %'));
    expect(priceOf('pro')).toBe('7');
  });

  it('solo renderiza las cards de los planes recibidos', () => {
    renderPricing([
      { tier: 'basic', monthlyPriceCents: 1900, commissionRateBps: 1000, maxServices: 10 },
    ]);

    expect(screen.getByRole('heading', { level: 3, name: 'Básico' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 3, name: 'Pro' })).not.toBeInTheDocument();
  });

  it('propaga el tier al CTA para preseleccionar el plan en el alta', () => {
    renderPricing([
      { tier: 'pro', monthlyPriceCents: 4900, commissionRateBps: 800, maxServices: 50 },
    ]);

    expect(screen.getByRole('link', { name: 'Empezar' })).toHaveAttribute(
      'href',
      '/registro?as=provider&plan=pro',
    );
  });

  it('no renderiza la sección si no hay planes', () => {
    const { container } = renderPricing([]);

    expect(container.querySelector('[data-component="for-providers-pricing"]')).toBeNull();
  });
});

// ============================================================================
// Red de seguridad: seed ↔ lo que se publica
// ============================================================================

interface SeedPlan {
  tier: string;
  monthlyPriceCents: number;
  commissionRateBps: number;
}

/**
 * Lee las tarifas directamente del fuente de `prisma/seed.ts`.
 *
 * Parseamos el texto en lugar de importar el módulo porque `seed.ts`
 * ejecuta `main()` al cargarse (abriría una conexión a Postgres).
 */
function readSeedPlans(): SeedPlan[] {
  const source = readFileSync(resolve(process.cwd(), 'prisma/seed.ts'), 'utf8');
  const block = source.slice(
    source.indexOf('const plans = ['),
    source.indexOf('async function seedPlans'),
  );

  const entry =
    /tier:\s*PlanTier\.(\w+)[\s\S]*?monthlyPriceCents:\s*(\d+)[\s\S]*?commissionRateBps:\s*(\d+)/gu;

  const found: SeedPlan[] = [];
  for (const match of block.matchAll(entry)) {
    found.push({
      tier: match[1],
      monthlyPriceCents: Number(match[2]),
      commissionRateBps: Number(match[3]),
    });
  }
  return found;
}

/**
 * Convierte bps a porcentaje con aritmética propia (nada compartido
 * con el código de producción): así el test valida el resultado, no
 * repite la implementación.
 */
function percentFromBps(bps: number): string {
  const value = bps / 100;
  return `${Number.isInteger(value) ? String(value) : String(value).replace('.', ',')}%`;
}

function eurosFromCents(cents: number): string {
  const value = cents / 100;
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace('.', ',');
}

describe('ForProvidersPricing ↔ prisma/seed.ts', () => {
  const seedPlans = readSeedPlans();

  it('el seed sigue definiendo los cuatro tiers', () => {
    expect(seedPlans.map((plan) => plan.tier)).toEqual(['free', 'basic', 'pro', 'premium']);
  });

  it('publica exactamente la comisión y la cuota sembradas en BD', () => {
    // Renderizamos con las cifras del seed: como el componente solo
    // sabe pintar lo que recibe, cualquier reintroducción de tarifas
    // propias (el bug de 12/9/6/4 % frente a 12/10/8/6 %) rompe aquí.
    renderPricing(
      seedPlans.map((plan) => ({
        tier: plan.tier as PublicPlan['tier'],
        monthlyPriceCents: plan.monthlyPriceCents,
        commissionRateBps: plan.commissionRateBps,
        maxServices: 1,
      })),
    );

    for (const plan of seedPlans) {
      expect(commissionOf(plan.tier)).toBe(
        squash(`Comisión ${percentFromBps(plan.commissionRateBps)}`),
      );
      expect(priceOf(plan.tier)).toBe(eurosFromCents(plan.monthlyPriceCents));
    }
  });
});
