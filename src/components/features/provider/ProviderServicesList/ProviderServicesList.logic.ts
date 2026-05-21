'use client';

import { useCallback, useState } from 'react';

import { fakeCategories } from '@/lib/fake-data/categories';
import type { Category, Service } from '@/types/domain';

import type { ServiceGroup, SupportedLocale } from './ProviderServicesList.types';

/**
 * Mapa indexado de categorías por id, construido una sola vez al cargar
 * el módulo. Evita recorrer `fakeCategories` por cada lookup cuando
 * resolvemos la raíz de un servicio.
 */
const categoryById = new Map<string, Category>(
  fakeCategories.map((category) => [category.id, category]),
);

/**
 * Resuelve la categoría raíz a partir de un `categoryId`.
 *
 * Sube por la cadena `parentId` hasta encontrar una categoría con
 * `parentId === null`. Si en algún punto la cadena se rompe (id
 * desconocido), devuelve `null`. Tope de seguridad a 5 saltos para
 * no quedarnos colgados si los datos tienen un ciclo.
 *
 * @param categoryId — id de la categoría hoja o intermedia.
 * @returns la categoría raíz, o `null` si no puede resolverse.
 */
function getRootCategory(categoryId: string): Category | null {
  let current = categoryById.get(categoryId);
  let hops = 0;

  while (current && current.parentId !== null && hops < 5) {
    current = categoryById.get(current.parentId);
    hops += 1;
  }

  return current && current.parentId === null ? current : null;
}

/**
 * Agrupa una lista de servicios por su categoría raíz.
 *
 * Conserva el orden de aparición de los servicios dentro de cada grupo
 * (el repo ya los entrega ordenados por precio ascendente). Los grupos
 * se devuelven en el orden en el que aparece la primera categoría raíz
 * detectada en `services`, para que la jerarquía visual sea estable
 * sin depender de un orden global predefinido.
 *
 * Los servicios cuya categoría no se puede resolver caen en un grupo
 * con `rootCategory: null` (se renderizará bajo el header "Otros").
 *
 * @param services — servicios a agrupar.
 * @returns lista de grupos en orden de aparición.
 */
export function groupServicesByRootCategory(services: Service[]): ServiceGroup[] {
  // Usamos un Map para preservar el orden de inserción de las raíces y
  // que la salida sea determinista respecto a `services`. La clave es
  // el id de la categoría raíz o el string '__unknown__' para servicios
  // sin raíz resuelta.
  const groups = new Map<string, ServiceGroup>();

  for (const service of services) {
    const root = getRootCategory(service.categoryId);
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
