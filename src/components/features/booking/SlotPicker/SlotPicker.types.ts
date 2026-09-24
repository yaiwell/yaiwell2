import type { BookingSlot } from '@/lib/services/availability/availability.client';

/**
 * Tipos del componente SlotPicker.
 */

/**
 * Locales soportados por la app. Se repite aquí (en vez de importar el
 * union del módulo de i18n) porque el componente solo necesita decidir
 * el formateador de `Intl`, no acoplarse a la configuración de rutas.
 */
export type SlotPickerLocale = 'es' | 'ca' | 'en' | 'de';

export interface SlotPickerProps {
  providerId: string;
  serviceId: string;
  serviceDurationMinutes: number;
  locale: SlotPickerLocale;
  /** Slot actualmente seleccionado (su `startAtIso`), si lo hay. */
  selectedStartIso: string | null;
  /** Callback al seleccionar un slot disponible. */
  onSelect: (slot: BookingSlot) => void;
  /** `now` opcional para tests; en producción se toma del logic. */
  now?: Date;
}

/**
 * Representación de un día en la tira navegable superior.
 */
export interface DayTab {
  date: Date;
  /** Etiqueta corta tipo "Lun" o "Dl". */
  weekdayShort: string;
  /** Número del día del mes (1-31). */
  dayOfMonth: number;
  /** `true` si es el día seleccionado actualmente. */
  isSelected: boolean;
  /** `true` si es el día actual del usuario. */
  isToday: boolean;
}
