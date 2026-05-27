import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';

import { AddServiceForm } from './AddServiceForm';

const messages = {
  providerPanel: {
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
      cancel: 'Cancelar',
      mockNotice: 'Mock notice.',
    },
  },
};

function renderForm() {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <AddServiceForm locale="es" />
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
