/**
 * Tests de `/cuenta/ajustes`: guardar el perfil en Clerk, no ofrecer la baja de
 * Clerk (se saltaría las reglas de la app) y no fingir que se guardó el idioma.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import es from '@/messages/es.json';

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  setProfileImage: vi.fn(),
  openUserProfile: vi.fn(),
  setEmailLocale: vi.fn(),
}));

vi.mock('@clerk/nextjs', () => ({
  useUser: () => ({
    isLoaded: true,
    user: {
      firstName: 'Ana',
      lastName: 'Ruiz',
      imageUrl: 'https://img.clerk.com/a.png',
      hasImage: true,
      primaryEmailAddress: { emailAddress: 'ana@yaiwell.test' },
      update: mocks.update,
      setProfileImage: mocks.setProfileImage,
    },
  }),
  useClerk: () => ({ openUserProfile: mocks.openUserProfile }),
}));
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element -- el test no optimiza imágenes.
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));
vi.mock('@/app/[locale]/cuenta/ajustes/actions', () => ({
  setEmailLocaleAction: mocks.setEmailLocale,
}));
vi.mock('@/components/shared/LangSwitcher', () => ({ LangSwitcher: () => null }));
vi.mock('@/components/shared/LocationPill', () => ({ LocationPill: () => null }));
vi.mock('@/components/shared/ThemeToggle', () => ({ ThemeToggle: () => null }));

import { AccountPreferencesCard, AccountProfileCard } from '.';

const t = es.account.settings;

function wrap(node: ReactNode) {
  render(
    <NextIntlClientProvider locale="es" messages={es}>
      {node}
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.update.mockResolvedValue({});
  mocks.setEmailLocale.mockResolvedValue({ ok: true });
});

describe('AccountProfileCard', () => {
  it('guarda el nombre recortando espacios', async () => {
    wrap(<AccountProfileCard />);

    fireEvent.change(screen.getByLabelText(t.profile.firstName), { target: { value: '  Eva ' } });
    fireEvent.click(screen.getByRole('button', { name: t.profile.save }));

    await screen.findByText(t.profile.saved);
    expect(mocks.update).toHaveBeenCalledWith({ firstName: 'Eva', lastName: 'Ruiz' });
  });

  it('avisa si Clerk rechaza el cambio', async () => {
    mocks.update.mockRejectedValue(new Error('no'));
    wrap(<AccountProfileCard />);

    fireEvent.click(screen.getByRole('button', { name: t.profile.save }));

    expect(await screen.findByText(t.profile.error)).toBeInTheDocument();
  });

  it('abre email y contraseña sin la baja de Clerk', () => {
    wrap(<AccountProfileCard />);

    fireEvent.click(screen.getByRole('button', { name: t.profile.securityCta }));

    expect(mocks.openUserProfile).toHaveBeenCalledWith({
      appearance: { elements: { profileSection__danger: { display: 'none' } } },
    });
  });
});

describe('AccountPreferencesCard', () => {
  const select = () => screen.getByRole('combobox', { name: t.preferences.emailLanguage });

  it('guarda el idioma de los correos', async () => {
    wrap(<AccountPreferencesCard emailLocale="es" />);

    fireEvent.change(select(), { target: { value: 'de' } });

    await screen.findByText(t.preferences.saved);
    expect(mocks.setEmailLocale).toHaveBeenCalledWith('de');
    expect(select()).toHaveValue('de');
  });

  it('si falla vuelve al idioma anterior y lo dice', async () => {
    mocks.setEmailLocale.mockResolvedValue({ ok: false, code: 'internal' });
    wrap(<AccountPreferencesCard emailLocale="es" />);

    fireEvent.change(select(), { target: { value: 'de' } });

    await screen.findByText(t.preferences.error);
    await waitFor(() => expect(select()).toHaveValue('es'));
  });
});
