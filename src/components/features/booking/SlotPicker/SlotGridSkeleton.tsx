import { slotPickerStyles as s } from './SlotPicker.styles';

/**
 * Cuántos bloques falsos pinta cada sección. No pretende adivinar los
 * huecos reales: solo ocupar una altura creíble para que la rejilla no
 * dé un salto brusco cuando llegan los datos.
 */
const PLACEHOLDER_SLOTS = 6;

/**
 * Esqueleto de la rejilla de huecos mientras la petición está en vuelo.
 *
 * Reproduce la estructura real (título de sección + grid de botones) en
 * lugar de un spinner suelto: la forma de la rejilla es conocida y un
 * spinner centrado provocaría un salto de layout al resolver. Es además
 * lo que permite dejar de mostrar "no hay huecos" durante la carga.
 */
export function SlotGridSkeleton({ label }: { label: string }) {
  return (
    <div
      className={s.root}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
      data-component="booking-slot-picker-loading"
    >
      {/* Dos secciones (mañana y tarde) para que la altura se parezca a
          la del estado cargado. Decorativas: el texto accesible lo da
          el `aria-label` del contenedor. */}
      {[0, 1].map((section) => (
        <div key={section} className={s.root}>
          <div className={s.skeletonSectionTitle} aria-hidden />
          <div className={s.slotGrid} aria-hidden>
            {Array.from({ length: PLACEHOLDER_SLOTS }, (_, index) => (
              <div key={index} className={s.skeletonSlot} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
