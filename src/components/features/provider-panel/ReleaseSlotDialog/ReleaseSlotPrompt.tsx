'use client';

import { ReleaseSlotDialog } from './ReleaseSlotDialog';
import type { ReleaseSlotPromptProviderProps } from './ReleaseSlotDialog.types';
import { ReleaseSlotPromptContext, useReleaseSlotPromptState } from './ReleaseSlotPrompt.logic';

/**
 * Monta el diálogo de liberar hueco una sola vez para todo el
 * calendario y deja abrirlo desde cualquier botón descendiente
 * (cancelar reserva, «Liberar con descuento» de un hueco libre).
 */
export function ReleaseSlotPromptProvider({ locale, children }: ReleaseSlotPromptProviderProps) {
  const { request, requestKey, open, close } = useReleaseSlotPromptState();

  return (
    <ReleaseSlotPromptContext.Provider value={open}>
      {children}
      <ReleaseSlotDialog
        locale={locale}
        request={request}
        requestKey={requestKey}
        onClose={close}
      />
    </ReleaseSlotPromptContext.Provider>
  );
}
