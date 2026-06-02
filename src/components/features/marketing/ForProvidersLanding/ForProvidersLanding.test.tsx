import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

/**
 * Mockeamos `@/i18n/navigation` porque su implementación real importa
 * `next/navigation` con un especificador sin extensión que el resolver
 * de Vitest no consigue resolver dentro de happy-dom. En el unit test
 * solo necesitamos comprobar que los `Link` se rendericen con su `href`
 * correcto, así que un `<a>` plano es suficiente. Mismo patrón que en
 * `NotFoundView.test.tsx`.
 */
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: ComponentProps<'a'>) => (
    <a href={typeof href === 'string' ? href : '#'} {...rest}>
      {children}
    </a>
  ),
}));

import { ForProvidersLanding } from './ForProvidersLanding';

/**
 * Mensajes mínimos necesarios para que el árbol completo renderice.
 * Mantenemos la misma estructura que `src/messages/es.json#forProviders`
 * para que un cambio en producción salte aquí si quita alguna clave.
 */
const messages = {
  forProviders: {
    meta: {
      title: 'Para profesionales',
      description: 'Descripción mock.',
    },
    hero: {
      eyebrow: 'Para centros y autónomos',
      titleLine1: 'Tu agenda llena,',
      titleLine2: 'sin esfuerzo.',
      subtitle: 'Subtítulo del hero.',
      ctaPrimary: 'Empezar gratis',
      ctaSecondary: 'Cómo funciona',
      trustNote: 'Sin permanencia',
      mockBadge: 'Reservas en directo',
      mockBookingService: 'Corte + lavado',
      mockBookingClient: 'Marta · 18:30',
      mockBookingStatus: 'Confirmada',
      mockOccupancyLabel: 'Ocupación',
      mockOccupancyValue: '86%',
    },
    benefits: {
      eyebrow: 'Beneficios',
      title: 'Pensado para que tú solo abras las puertas.',
      subtitle: 'Subtítulo de beneficios.',
      items: {
        liveBookings: { title: 'Reservas en directo', body: 'Body 1' },
        noCalls: { title: 'Cero llamadas', body: 'Body 2' },
        yourHours: { title: 'Tú decides tus huecos', body: 'Body 3' },
        noLockIn: { title: 'Sin permanencia', body: 'Body 4' },
      },
    },
    pricing: {
      eyebrow: 'Planes',
      title: 'Empieza gratis.',
      subtitle: 'Subtítulo planes.',
      popularBadge: 'Más elegido',
      perMonth: '/mes',
      commission: 'Comisión {rate}',
      ctaStart: 'Empezar',
      plans: {
        free: {
          name: 'Gratis',
          tagline: 'Tagline gratis',
          feature1: 'F1',
          feature2: 'F2',
          feature3: 'F3',
          feature4: 'F4',
        },
        basic: {
          name: 'Básico',
          tagline: 'Tagline básico',
          feature1: 'F1',
          feature2: 'F2',
          feature3: 'F3',
          feature4: 'F4',
        },
        pro: {
          name: 'Pro',
          tagline: 'Tagline pro',
          feature1: 'F1',
          feature2: 'F2',
          feature3: 'F3',
          feature4: 'F4',
        },
        premium: {
          name: 'Premium',
          tagline: 'Tagline premium',
          feature1: 'F1',
          feature2: 'F2',
          feature3: 'F3',
          feature4: 'F4',
        },
      },
    },
    faq: {
      eyebrow: 'Preguntas frecuentes',
      title: 'Lo que nos preguntáis.',
      items: {
        start: { question: 'Q1', answer: 'A1' },
        payouts: { question: 'Q2', answer: 'A2' },
        cancel: { question: 'Q3', answer: 'A3' },
        regret: { question: 'Q4', answer: 'A4' },
        platform: { question: 'Q5', answer: 'A5' },
        verification: { question: 'Q6', answer: 'A6' },
      },
    },
    cta: {
      eyebrow: 'Listo',
      title: '¿Listo para llenar tu agenda?',
      subtitle: 'Subtítulo CTA.',
      primary: 'Crear cuenta gratis',
      secondary: 'Hablar con ventas',
    },
  },
};

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe('ForProvidersLanding', () => {
  it('renderiza el h1 del hero con título y acento', () => {
    renderWithIntl(<ForProvidersLanding />);

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    // El h1 contiene la línea 1 y la línea 2 (acentuada). Comprobamos
    // ambas como texto agregado del nodo.
    expect(heading.textContent).toContain('Tu agenda llena,');
    expect(heading.textContent).toContain('sin esfuerzo.');
  });

  it('renderiza los 4 planes con su nombre como heading nivel 3', () => {
    renderWithIntl(<ForProvidersLanding />);

    // Cada card de plan expone su nombre como h3. Comprobamos los 4.
    const planNames = ['Gratis', 'Básico', 'Pro', 'Premium'];
    for (const name of planNames) {
      expect(screen.getByRole('heading', { level: 3, name })).toBeInTheDocument();
    }

    // El plan popular ("Pro") muestra el badge específico.
    expect(screen.getByText('Más elegido')).toBeInTheDocument();
  });

  it('expone el CTA primario del hero como enlace a /registro?as=provider', () => {
    renderWithIntl(<ForProvidersLanding />);

    const cta = screen.getByRole('link', { name: /Empezar gratis/i });
    expect(cta).toHaveAttribute('href', '/registro?as=provider');
  });

  it('renderiza el CTA secundario final con mailto al equipo de ventas', () => {
    renderWithIntl(<ForProvidersLanding />);

    const sales = screen.getByRole('link', { name: 'Hablar con ventas' });
    expect(sales).toHaveAttribute('href', 'mailto:hola@yeiwell.es');
  });
});
