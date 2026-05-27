import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';

import { THEME_COOKIE_NAME } from '@/lib/utils/theme';

import { ThemeProvider } from './ThemeToggle.logic';
import { ThemeToggle } from './ThemeToggle';

/**
 * Tests del componente ThemeToggle.
 *
 * Verificamos los tres estados (light / dark / system):
 *  - Renderizado del grupo y los tres botones con sus aria-labels.
 *  - Estado activo (`aria-pressed`) según la preferencia inicial.
 *  - Cambio de preferencia al pulsar y persistencia en cookie + clase `dark`.
 *
 * Envolvemos en `NextIntlClientProvider` con un subset del namespace
 * `theme` para no acoplarnos al fichero de mensajes completo.
 */

const messages = {
  theme: {
    groupLabel: 'Tema',
    light: 'Claro',
    dark: 'Oscuro',
    system: 'Sistema',
  },
};

function renderToggle(initial: 'light' | 'dark' | 'system' = 'system') {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <ThemeProvider initialPreference={initial}>
        <ThemeToggle />
      </ThemeProvider>
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  // Limpiamos la cookie y la clase dark entre tests para evitar fugas.
  document.cookie = `${THEME_COOKIE_NAME}=; path=/; max-age=0`;
  document.documentElement.classList.remove('dark');
  document.documentElement.style.colorScheme = '';
});

describe('ThemeToggle', () => {
  it('renderiza los tres botones (light, dark, system) con sus etiquetas accesibles', () => {
    renderToggle('system');

    const group = screen.getByRole('group', { name: 'Tema' });
    expect(group).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Claro' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Oscuro' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sistema' })).toBeInTheDocument();
  });

  it('marca como pressed el botón correspondiente a la preferencia inicial', () => {
    renderToggle('dark');

    expect(screen.getByRole('button', { name: 'Claro' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Oscuro' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Sistema' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('cambia la preferencia, aplica la clase dark al <html> y persiste la cookie al pulsar Oscuro', async () => {
    const user = userEvent.setup();
    renderToggle('light');

    await user.click(screen.getByRole('button', { name: 'Oscuro' }));

    // El estado activo migra al nuevo botón.
    expect(screen.getByRole('button', { name: 'Oscuro' })).toHaveAttribute('aria-pressed', 'true');
    // Y el efecto colateral se materializa: clase dark + cookie.
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.cookie).toContain(`${THEME_COOKIE_NAME}=dark`);
  });
});
