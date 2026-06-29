'use client';

import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AlertDialog } from 'radix-ui';
import { useState, useTransition } from 'react';

import { deleteServiceAction } from '@/app/[locale]/panel/servicios/actions';
import { Button } from '@/components/ui/button';
import type { AppLocale } from '@/i18n/routing';

import { serviceDeleteButtonStyles as s } from './ServiceDeleteButton.styles';

interface ServiceDeleteButtonProps {
  locale: AppLocale;
  serviceId: string;
}

/**
 * Botón cliente que elimina (soft-delete) un Service vía server action.
 *
 * Abre un AlertDialog de confirmación porque la acción es destructiva.
 * El icono Lucide se renderiza dentro de este Client Component (no se
 * pasa como prop desde un Server Component) para evitar el bug de
 * serialización RSC documentado en DO.md el 2026-06-11: los iconos
 * Lucide son `forwardRef` no serializables a través de la frontera RSC.
 *
 * Los textos vienen de `providerPanel.services.delete.*` — el cliente
 * lee i18n directamente porque las claves son específicas de este botón
 * y no las usa el listado padre.
 */
export function ServiceDeleteButton({ locale, serviceId }: ServiceDeleteButtonProps) {
  const t = useTranslations('providerPanel.services.delete');
  const [open, setOpen] = useState(false);
  const [errorCode, setErrorCode] = useState<'notFound' | 'forbidden' | 'internal' | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setErrorCode(null);
    startTransition(async () => {
      const result = await deleteServiceAction(locale, serviceId);
      if (result.ok) {
        // Cerramos sólo en éxito. Tras el revalidate, el servidor re-rendea
        // el listado sin esta fila, por lo que el componente se desmonta.
        setOpen(false);
        return;
      }
      // Mapeo de códigos de error a clave i18n. Los códigos del backend
      // son SCREAMING_CASE; las claves del namespace son camelCase para
      // no exponer detalle interno al cliente.
      switch (result.code) {
        case 'SERVICE_NOT_FOUND':
          setErrorCode('notFound');
          break;
        case 'FORBIDDEN':
          setErrorCode('forbidden');
          break;
        default:
          setErrorCode('internal');
      }
    });
  }

  function handleOpenChange(next: boolean) {
    // Si se cierra (cancel o tecla Escape), limpiamos el error para que
    // la próxima apertura aparezca en estado neutro.
    if (!next) {
      setErrorCode(null);
    }
    setOpen(next);
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={handleOpenChange}>
      <AlertDialog.Trigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={s.triggerButton}
          data-component={`services-list-delete-${serviceId}`}
        >
          <Trash2 className="size-3.5" aria-hidden />
          {t('button')}
        </Button>
      </AlertDialog.Trigger>

      <AlertDialog.Portal>
        <AlertDialog.Overlay className={s.overlay} />
        <AlertDialog.Content
          className={s.content}
          data-component={`services-list-delete-dialog-${serviceId}`}
        >
          <AlertDialog.Title className={s.title}>{t('confirmTitle')}</AlertDialog.Title>
          <AlertDialog.Description className={s.description}>
            {t('confirmDescription')}
          </AlertDialog.Description>

          {errorCode && (
            <p
              role="alert"
              className={s.errorBanner}
              data-component={`services-list-delete-error-${serviceId}`}
            >
              {t(`errors.${errorCode}`)}
            </p>
          )}

          <div className={s.actions}>
            <AlertDialog.Cancel asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                data-component={`services-list-delete-cancel-${serviceId}`}
              >
                {t('cancel')}
              </Button>
            </AlertDialog.Cancel>
            {/*
              No usamos AlertDialog.Action porque cierra el diálogo
              automáticamente al click — necesitamos mantenerlo abierto
              en caso de error para mostrar el banner. Cerramos a mano
              cuando la action devuelve ok.
            */}
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isPending}
              onClick={handleConfirm}
              data-component={`services-list-delete-confirm-${serviceId}`}
            >
              {isPending ? t('deleting') : t('confirmAction')}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
