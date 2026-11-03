import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { categoriesHierarchy } from '@/lib/fake-data/categories-hierarchy';

import { AddServiceForm } from './AddServiceForm';

// Mock de la server action — el módulo importa `auth` de @clerk/nextjs/server
// y otros símbolos `server-only` que romperían el render en happy-dom.
const { createServiceMock } = vi.hoisted(() => ({
  createServiceMock: vi.fn(async (..._args: unknown[]) => ({ ok: true as const })),
}));

vi.mock('@/app/[locale]/panel/servicios/nuevo/actions', () => ({
  createServiceAction: createServiceMock,
}));

const messages = {
  providerPanel: {
    services: {
      form: {
        professionalsLabel: 'Quién lo presta',
        professionalsHelp: 'Marca a quién se puede reservar.',
        professionalsRequired: 'Elige al menos a un profesional.',
        professionalsInvalid: 'Alguno ya no está en tu equipo.',
        professionalsOutOfPlan: 'Fuera de tu plan',
      },
    },
    addService: {
      title: 'Añadir servicio',
      subtitle: 'Define un nuevo servicio.',
      back: 'Volver al listado',
      categoryStep: {
        title: 'Clasificación',
        subtitle: 'Elige categoría.',
        rootLabel: 'Categoría',
        rootPlaceholder: 'Selecciona una categoría',
        typeLabel: 'Tipo',
        typePlaceholder: 'Selecciona un tipo',
        subtypeLabel: 'Subtipo',
        subtypePlaceholder: 'Selecciona un subtipo',
        hintAfterRoot: 'Elige primero la categoría.',
        hintAfterType: 'Elige un tipo.',
      },
      detailsStep: {
        title: 'Datos',
        subtitle: 'Información para el cliente.',
        nameLabel: 'Nombre',
        namePlaceholder: 'Ej. Corte mujer',
        descriptionLabel: 'Descripción',
        descriptionPlaceholder: 'Qué incluye',
        durationLabel: 'Duración (minutos)',
        priceLabel: 'Precio (€)',
      },
      submit: 'Publicar servicio',
      submitting: 'Publicando…',
      cancel: 'Cancelar',
      errors: {
        VALIDATION: 'Revisa los campos.',
        CATEGORY_NOT_FOUND: 'Categoría no existe.',
        PROVIDER_NOT_FOUND: 'Negocio no encontrado.',
        INTERNAL: 'Error interno.',
      },
    },
  },
};

function renderForm() {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <AddServiceForm locale="es" categoriesTree={categoriesHierarchy} />
    </NextIntlClientProvider>,
  );
}

describe('AddServiceForm', () => {
  it('deshabilita los selects de tipo y subtipo hasta que se elige la categoría raíz', () => {
    renderForm();

    const typeSelect = screen.getByLabelText('Tipo') as HTMLSelectElement;
    const subtypeSelect = screen.getByLabelText('Subtipo') as HTMLSelectElement;

    expect(typeSelect).toBeDisabled();
    expect(subtypeSelect).toBeDisabled();
  });

  it('habilita el select de tipo al elegir una categoría raíz y muestra sus opciones', async () => {
    const user = userEvent.setup();
    renderForm();

    const rootSelect = screen.getByLabelText('Categoría') as HTMLSelectElement;
    await user.selectOptions(rootSelect, 'cat-beauty');

    const typeSelect = screen.getByLabelText('Tipo') as HTMLSelectElement;
    expect(typeSelect).not.toBeDisabled();

    // El primer tipo de "Belleza" es "Peluquería" según la jerarquía.
    expect(screen.getByRole('option', { name: 'Peluquería' })).toBeInTheDocument();
  });

  it('resetea el tipo al cambiar la categoría raíz para evitar combinaciones inválidas', async () => {
    const user = userEvent.setup();
    renderForm();

    const rootSelect = screen.getByLabelText('Categoría') as HTMLSelectElement;
    await user.selectOptions(rootSelect, 'cat-beauty');
    const typeSelect = screen.getByLabelText('Tipo') as HTMLSelectElement;
    await user.selectOptions(typeSelect, 'cat-hair');

    // Cambiamos la raíz y comprobamos que el tipo vuelve al placeholder.
    await user.selectOptions(rootSelect, 'cat-sport');

    expect((screen.getByLabelText('Tipo') as HTMLSelectElement).value).toBe('');
  });

  it('habilita subtipos solo cuando el tipo está seleccionado', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(screen.getByLabelText('Categoría'), 'cat-beauty');
    await user.selectOptions(screen.getByLabelText('Tipo'), 'cat-hair');

    const subtypeSelect = screen.getByLabelText('Subtipo') as HTMLSelectElement;
    expect(subtypeSelect).not.toBeDisabled();
    expect(screen.getByRole('option', { name: 'Corte' })).toBeInTheDocument();
  });
});

describe('AddServiceForm — «Quién lo presta»', () => {
  const TEAM = [
    { id: 'pro-a', name: 'Ana', outOfPlan: false },
    { id: 'pro-b', name: 'Bea', outOfPlan: true },
  ];

  beforeEach(() => {
    createServiceMock.mockClear();
  });

  /** Rellena lo mínimo para que el envío llegue a la action. */
  async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
    await user.selectOptions(screen.getByLabelText('Categoría'), 'cat-beauty');
    await user.type(screen.getByLabelText('Nombre'), 'Corte');
    await user.type(screen.getByLabelText('Duración (minutos)'), '30');
    await user.type(screen.getByLabelText('Precio (€)'), '20');
    await user.click(screen.getByRole('button', { name: 'Publicar servicio' }));
  }

  function renderWithTeam(professionals = TEAM) {
    return render(
      <NextIntlClientProvider locale="es" messages={messages}>
        <AddServiceForm
          locale="es"
          categoriesTree={categoriesHierarchy}
          professionals={professionals}
        />
      </NextIntlClientProvider>,
    );
  }

  it('no aparece con un solo profesional y no envía professionalIds', async () => {
    const user = userEvent.setup();
    renderWithTeam([TEAM[0]!]);

    expect(screen.queryByText('Quién lo presta')).not.toBeInTheDocument();
    await fillAndSubmit(user);

    await vi.waitFor(() => expect(createServiceMock).toHaveBeenCalledOnce());
    expect(createServiceMock.mock.calls[0]![1]).toMatchObject({ professionalIds: undefined });
  });

  it('con equipo, arranca con todos marcados y envía los elegidos', async () => {
    const user = userEvent.setup();
    renderWithTeam();

    expect(screen.getByText('Fuera de tu plan')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /Bea/ }));
    await fillAndSubmit(user);

    await vi.waitFor(() => expect(createServiceMock).toHaveBeenCalledOnce());
    expect(createServiceMock.mock.calls[0]![1]).toMatchObject({ professionalIds: ['pro-a'] });
  });

  it('exige al menos uno sin llamar al servidor', async () => {
    const user = userEvent.setup();
    renderWithTeam();

    await user.click(screen.getByRole('checkbox', { name: /Ana/ }));
    await user.click(screen.getByRole('checkbox', { name: /Bea/ }));
    await fillAndSubmit(user);

    expect(await screen.findByText('Elige al menos a un profesional.')).toBeInTheDocument();
    expect(createServiceMock).not.toHaveBeenCalled();
  });
});
