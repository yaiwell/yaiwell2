'use client';

import { Dialog } from 'radix-ui';

import { bookingActionDialogStyles as d } from '../BookingActionsList/BookingActionsList.styles';
import type { ReleaseSlotDialogProps } from './ReleaseSlotDialog.types';
import { ReleaseSlotForm } from './ReleaseSlotForm';

/**
 * Diálogo controlado para liberar un hueco con descuento, ya sea tras
 * cancelar una reserva (3 tramos) o sobre un hueco libre (2 tramos).
 *
 * El formulario se monta con `key` por apertura: cada vez arranca con
 * los descuentos por defecto y sin errores de la vez anterior.
 */
export function ReleaseSlotDialog({
  locale,
  request,
  requestKey,
  onClose,
}: ReleaseSlotDialogProps) {
  return (
    <Dialog.Root open={request !== null} onOpenChange={(next) => (next ? undefined : onClose())}>
      <Dialog.Portal>
        <Dialog.Overlay className={d.overlay} />
        <Dialog.Content className={d.content} data-component="release-slot-dialog">
          {request && (
            <ReleaseSlotForm key={requestKey} locale={locale} request={request} onClose={onClose} />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
