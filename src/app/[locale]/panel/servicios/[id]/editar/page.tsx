import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { AddServiceForm } from '@/components/features/provider-panel/AddServiceForm';
import type {
  AddServiceDraft,
  CategoryRoot,
} from '@/components/features/provider-panel/AddServiceForm/AddServiceForm.types';
import { routing } from '@/i18n/routing';
import { requireCurrentProvider } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { pickLocalized } from '@/lib/i18n/pickLocalized';
import { getCategoriesTree } from '@/lib/services/provider-panel';
import type { LocalizedText } from '@/types/domain';

interface EditServicePageProps {
  params: Promise<{ locale: string; id: string }>;
}

/**
 * Recorre el árbol de categorías para localizar el path completo
 * (raíz → tipo → subtipo) que lleva al `categoryId` actual. Sin esto,
 * abrir un servicio en edición no pre-seleccionaría la cascada correcta.
 *
 * Si el `categoryId` está en cualquiera de los 3 niveles, devuelve el
 * path hasta ese nivel; los más profundos quedan `null`.
 */
function findCategoryPath(
  tree: CategoryRoot[],
  categoryId: string,
): { rootCategoryId: string | null; typeId: string | null; subtypeId: string | null } {
  for (const root of tree) {
    if (root.id === categoryId) {
      return { rootCategoryId: root.id, typeId: null, subtypeId: null };
    }
    for (const type of root.types) {
      if (type.id === categoryId) {
        return { rootCategoryId: root.id, typeId: type.id, subtypeId: null };
      }
      for (const sub of type.subtypes) {
        if (sub.id === categoryId) {
          return { rootCategoryId: root.id, typeId: type.id, subtypeId: sub.id };
        }
      }
    }
  }
  return { rootCategoryId: null, typeId: null, subtypeId: null };
}

/**
 * Edición de un servicio existente (`/panel/servicios/[id]/editar`).
 *
 * Reutiliza el `AddServiceForm` en modo edición: la página carga el
 * Service del provider autenticado (ownership check vía where clause)
 * y pre-rellena el draft con los datos actuales. El nombre y la
 * descripción se desempaquetan al locale activo; el resto de idiomas
 * se conservan al guardar (ver `updateServiceAction`).
 *
 * El `categoryId` plano de BD se traduce al path completo del árbol
 * (root → type → subtype) para que la cascada arranque pre-seleccionada
 * al nivel correcto.
 */
export default async function EditServicePage({ params }: EditServicePageProps) {
  const { locale, id } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const panelLocale = locale as 'es' | 'ca' | 'en' | 'de';
  const { id: providerId } = await requireCurrentProvider(panelLocale);

  // Ownership baked into the where: si el id no es del provider, sale null.
  const service = await prisma.service.findFirst({
    where: { id, providerId, deletedAt: null },
    select: {
      id: true,
      name: true,
      description: true,
      durationMinutes: true,
      priceCents: true,
      categoryId: true,
    },
  });
  if (!service) {
    notFound();
  }

  const categoriesTree = await getCategoriesTree();
  const categoryPath = findCategoryPath(categoriesTree, service.categoryId);

  const initialValues: AddServiceDraft = {
    ...categoryPath,
    // Pre-rellenamos el formulario con la versión del locale activo.
    // El resto de idiomas se mantiene intacto en BD al guardar.
    name: pickLocalized(service.name as unknown as LocalizedText, panelLocale),
    description: pickLocalized(service.description as unknown as LocalizedText, panelLocale),
    durationMinutes: service.durationMinutes.toString(),
    // priceCents → euros con 2 decimales, sin coma para que el input
    // `type=number` lo acepte sin parsear locale.
    priceEuros: (service.priceCents / 100).toFixed(2),
  };

  return (
    <AddServiceForm
      locale={panelLocale}
      categoriesTree={categoriesTree}
      serviceId={service.id}
      initialValues={initialValues}
    />
  );
}
