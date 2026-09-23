'use client';

import { useCallback, useState } from 'react';

import type { Service, ServiceWithRootCategory } from '@/types/domain';

import type { ServiceGroup, SupportedLocale } from './ProviderServicesList.types';

/**
 * Agrupa una lista de servicios por su categoría raíz.
 *
 * La raíz llega **ya resuelta desde servidor** (`service.rootCategory`).
 * No se resuelve aquí contra el catálogo de `fake-data`: sus ids
 * (`cat-beauty`…) no existen en BD, donde `categoryId` es un UUID; ese
 * desajuste mandaba todo el catálogo al grupo de fallback "Otros".
 *
 * Conserva el orden de aparición de los servicios dentro de cada grupo
 * (el repo ya los entrega ordenados por precio ascendente). Los grupos
 * se devuelven en el orden en el que aparece la primera categoría raíz
 * detectada en `services`, para que la jerarquía visual sea estable
 * sin depender de un orden global predefinido.
 *
 * Los servicios cuya categoría no se puede resolver (categoría huérfana
 * en BD) caen en un grupo con `rootCategory: null`, que se renderiza
 * bajo el header "Otros".
 *
 * @param services — servicios a agrupar.
 * @returns lista de grupos en orden de aparición.
 */
export function groupServicesByRootCategory(services: ServiceWithRootCategory[]): ServiceGroup[] {
  // Usamos un Map para preservar el orden de inserción de las raíces y
  // que la salida sea determinista respecto a `services`. La clave es
  // el id de la categoría raíz o el string '__unknown__' para servicios
  // sin raíz resuelta.
  const groups = new Map<string, ServiceGroup>();

  for (const service of services) {
    const root = service.rootCategory;
    const key = root ? root.id : '__unknown__';

    const existing = groups.get(key);
    if (existing) {
      existing.services.push(service);
    } else {
      groups.set(key, { rootCategory: root, services: [service] });
    }
  }

  return Array.from(groups.values());
}

/**
 * Formatea céntimos a un string monetario localizado en euros.
 *
 * Si el importe es múltiplo exacto de 100 (precio "redondo"), se
 * muestra sin decimales para una lectura más limpia. En caso contrario
 * se muestran dos decimales como dicta la convención monetaria.
 *
 * @param cents — importe en céntimos.
 * @param locale — locale activo (`es` o `ca`).
 * @returns string formateado (ej. "55 €", "32,50 €").
 */
export function formatPriceCents(cents: number, locale: SupportedLocale): string {
  const hasDecimals = cents % 100 !== 0;
  const intlLocale = locale === 'ca' ? 'ca-ES' : 'es-ES';

  return new Intl.NumberFormat(intlLocale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  }).format(cents / 100);
}

/**
 * Hook que gestiona el servicio seleccionado para mostrar en el sheet.
 *
 * Mantenemos el servicio entero en estado (no solo su id) para que el
 * sheet pueda renderizar su contenido incluso mientras se cierra con
 * animación, evitando un parpadeo visual durante el desmontado.
 */
export function useServiceSheet(): {
  selectedService: Service | null;
  isOpen: boolean;
  openWith: (service: Service) => void;
  setOpen: (open: boolean) => void;
} {
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const openWith = useCallback((service: Service) => {
    setSelectedService(service);
    setIsOpen(true);
  }, []);

  const setOpen = useCallback((open: boolean) => {
    setIsOpen(open);
    // No reseteamos `selectedService` al cerrar: dejamos que el contenido
    // permanezca mientras la animación de salida termina. Se reemplazará
    // la próxima vez que el usuario abra el sheet con otro servicio.
  }, []);

  return { selectedService, isOpen, openWith, setOpen };
}
