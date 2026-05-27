'use client';

import { Loader2, MapPin, MapPinOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { useUserLocation } from '@/components/shared/UserLocationProvider';
import { cn } from '@/lib/utils';

import { useLocationPillPopover } from './LocationPill.logic';
import { locationPillStyles as s } from './LocationPill.styles';
import { toVisualState, type LocationPillProps, type PillVisualState } from './LocationPill.types';

/**
 * Pill compacto en el Header que comunica el estado de ubicación del
 * usuario y permite activarla, olvidarla o entender por qué no funciona.
 *
 * Composición:
 *  - Trigger: icono + etiqueta corta (etiqueta visible desde `sm`).
 *  - Popover: tarjeta anclada bajo el trigger con contenido contextual
 *    y un único CTA principal por estado.
 *
 * No se acopla a ningún servicio: todo el estado proviene del hook
 * `useUserLocation` (C1) y la persistencia/cookies se gestionan allí.
 */
export function LocationPill({ className }: LocationPillProps = {}) {
  const t = useTranslations('location');
  const { status, request, clear } = useUserLocation();
  const { open, toggle, close, containerRef } = useLocationPillPopover();

  const visual = toVisualState(status);

  // Pedimos permiso y cerramos el popover en cuanto la promesa resuelve
  // (independientemente del resultado: el provider habrá actualizado el
  // estado y la UI se redibujará sola).
  const handleEnable = async () => {
    await request();
    close();
  };

  // Olvidar la ubicación: borra cookie y vuelve a fallback. Cerramos
  // el popover para confirmar visualmente la acción.
  const handleClear = () => {
    clear();
    close();
  };

  return (
    <div ref={containerRef} className={cn(s.root, className)} data-component="location-pill">
      <button
        type="button"
        onClick={toggle}
        className={s.trigger}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t('pill.openAria')}
        title={getTitleHint(visual, t)}
        data-component="location-pill-trigger"
      >
        <PillIcon visual={visual} />
        <span className={s.triggerLabel}>{getShortLabel(visual, t)}</span>
      </button>

      {open && (
        <div
          className={s.popover}
          role="dialog"
          aria-label={t('pill.ariaLabel')}
          data-component="location-pill-popover"
        >
          <PopoverContent
            visual={visual}
            onEnable={handleEnable}
            onClear={handleClear}
            t={t}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Icono contextual del trigger. Extraído para no inflar el JSX
 * principal con un `switch` de 4 ramas.
 */
function PillIcon({ visual }: { visual: PillVisualState }) {
  if (visual === 'requesting') {
    return <Loader2 aria-hidden="true" className={cn(s.spinner, s.iconMuted)} />;
  }
  if (visual === 'granted') {
    return <MapPin aria-hidden="true" className={cn(s.triggerIcon, s.iconGranted)} />;
  }
  if (visual === 'denied' || visual === 'unavailable') {
    return <MapPinOff aria-hidden="true" className={cn(s.triggerIcon, s.iconMuted)} />;
  }
  // default (idle / fallback)
  return <MapPin aria-hidden="true" className={cn(s.triggerIcon, s.iconMuted)} />;
}

/**
 * Cuerpo del popover según el estado actual. Recibe los callbacks ya
 * compuestos para mantenerlo libre de lógica.
 */
function PopoverContent({
  visual,
  onEnable,
  onClear,
  t,
}: {
  visual: PillVisualState;
  onEnable: () => void;
  onClear: () => void;
  t: ReturnType<typeof useTranslations<'location'>>;
}) {
  const { title, body, action, help } = describeState(visual, { onEnable, onClear, t });

  return (
    <>
      <div className={s.popoverHeader}>
        <span className={s.popoverIconBubble} aria-hidden="true">
          <MapPin className={s.popoverIconBubbleSvg} />
        </span>
        <div className={s.popoverTitleBlock}>
          <p className={s.popoverTitle}>{title}</p>
          {body && <p className={s.popoverBody}>{body}</p>}
        </div>
      </div>
      {help && <p className={s.popoverHelp}>{help}</p>}
      {action && <div className={s.popoverActions}>{action}</div>}
    </>
  );
}

interface DescribeStateDeps {
  onEnable: () => void;
  onClear: () => void;
  t: ReturnType<typeof useTranslations<'location'>>;
}

/**
 * Devuelve el título, descripción, CTA y ayuda contextual para cada
 * estado visual del pill. Centralizar este mapeo evita un `switch`
 * gigante en el JSX y facilita ampliar copy por estado.
 */
function describeState(
  visual: PillVisualState,
  { onEnable, onClear, t }: DescribeStateDeps,
): { title: string; body: string | null; action: ReactNode | null; help: string | null } {
  if (visual === 'granted') {
    return {
      title: t('pill.grantedTitle'),
      body: t('pill.grantedBody'),
      action: (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClear}
          data-component="location-pill-clear"
        >
          {t('clear')}
        </Button>
      ),
      help: null,
    };
  }

  if (visual === 'requesting') {
    return {
      title: t('pill.requestingTitle'),
      body: null,
      action: null,
      help: null,
    };
  }

  if (visual === 'denied') {
    return {
      title: t('pill.deniedTitle'),
      body: t('denied'),
      action: null,
      help: t('deniedHelp'),
    };
  }

  if (visual === 'unavailable') {
    return {
      title: t('pill.unavailableTitle'),
      body: t('unavailable'),
      action: (
        <Button
          type="button"
          size="sm"
          onClick={onEnable}
          data-component="location-pill-retry"
        >
          {t('retry')}
        </Button>
      ),
      help: t('unavailableHelp'),
    };
  }

  // default → idle / fallback
  return {
    title: t('pill.fallbackTitle'),
    body: t('pill.fallbackBody'),
    action: (
      <Button
        type="button"
        size="sm"
        onClick={onEnable}
        data-component="location-pill-enable"
      >
        {t('permissionEnable')}
      </Button>
    ),
    help: null,
  };
}

/**
 * Etiqueta corta visible en el trigger (mobile colapsa a sólo icono).
 */
function getShortLabel(
  visual: PillVisualState,
  t: ReturnType<typeof useTranslations<'location'>>,
): string {
  if (visual === 'granted') return t('pill.shortLabelGranted');
  if (visual === 'requesting') return t('pill.shortLabelRequesting');
  if (visual === 'denied' || visual === 'unavailable') return t('pill.shortLabelUnavailable');
  return t('pill.shortLabelDefault');
}

/**
 * Tooltip nativo (title) del trigger. En el estado por defecto añadimos
 * el matiz "(predeterminado)" para indicar que la ubicación mostrada
 * no es real.
 */
function getTitleHint(
  visual: PillVisualState,
  t: ReturnType<typeof useTranslations<'location'>>,
): string {
  if (visual === 'default') {
    return `${t('barcelona')} — ${t('defaultBadge')}`;
  }
  if (visual === 'granted') return t('pill.grantedTitle');
  if (visual === 'requesting') return t('pill.requestingTitle');
  if (visual === 'denied') return t('pill.deniedTitle');
  return t('pill.unavailableTitle');
}
