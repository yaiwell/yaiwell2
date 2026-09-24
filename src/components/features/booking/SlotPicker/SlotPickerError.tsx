import { RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { slotPickerStyles as s } from './SlotPicker.styles';

/**
 * Estado de error del selector de huecos.
 *
 * Existe para no confundir "no hemos podido consultar la agenda" con
 * "el centro no tiene hueco": lo segundo cierra la venta, lo primero
 * solo pide reintentar. El botón dispara el `refetch` de TanStack Query
 * para que el usuario no tenga que recargar la página entera y perder
 * el resto del flujo de reserva.
 */
export function SlotPickerError({
  title,
  subtitle,
  retryLabel,
  onRetry,
}: {
  title: string;
  subtitle: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  return (
    <div className={s.error} role="alert" data-component="booking-slot-picker-error">
      <div>
        <p className={s.errorTitle}>{title}</p>
        <p className={s.errorSubtitle}>{subtitle}</p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRetry}
        data-component="booking-slot-picker-retry"
      >
        <RefreshCw aria-hidden />
        {retryLabel}
      </Button>
    </div>
  );
}
