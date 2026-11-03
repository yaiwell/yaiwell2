import type {
  LaneSlot,
  PositionedOffer,
  PositionedRow,
  PositionedScheduleBlock,
  WeekdayKey,
} from './WeeklyCalendar.types';

/** Franja vertical de un elemento en su columna (en px o en minutos). */
export interface VerticalSpan {
  start: number;
  end: number;
}

/**
 * Reparte en carriles los elementos de una columna que se solapan, para
 * que no se pinten uno encima de otro (con varios profesionales, dos
 * citas a la misma hora son lo normal).
 *
 * Algoritmo clásico de calendario: se recorren por inicio y cada uno va
 * al primer carril libre; los que se solapan entre sí, aunque sea en
 * cadena, forman un grupo y todos comparten su número de carriles, para
 * que el grupo ocupe el ancho completo sin huecos raros. Dos franjas
 * contiguas (una acaba justo cuando empieza otra) no se solapan.
 *
 * A igual inicio se respeta el orden de entrada: quien llama decide qué
 * va a la izquierda.
 *
 * @param spans — franjas de la columna, en cualquier orden.
 * @returns un carril por franja, en el mismo orden que la entrada.
 */
export function layoutOverlaps(spans: readonly VerticalSpan[]): LaneSlot[] {
  const result: LaneSlot[] = spans.map(() => ({ lane: 0, laneCount: 1 }));
  const order = spans.map((_, index) => index).sort((a, b) => spans[a].start - spans[b].start);

  let group: number[] = [];
  let laneEnds: number[] = [];
  let groupEnd = Number.NEGATIVE_INFINITY;

  const closeGroup = () => {
    for (const index of group) result[index].laneCount = laneEnds.length;
    group = [];
    laneEnds = [];
  };

  for (const index of order) {
    const { start, end } = spans[index];
    if (start >= groupEnd) closeGroup();

    const free = laneEnds.findIndex((laneEnd) => laneEnd <= start);
    const lane = free >= 0 ? free : laneEnds.length;
    laneEnds[lane] = end;
    result[index].lane = lane;
    group.push(index);
    groupEnd = group.length === 1 ? end : Math.max(groupEnd, end);
  }
  closeGroup();

  return result;
}

/** Elementos ya posicionados de un día, por tipo. */
interface DayItems {
  rows: PositionedRow[];
  offers: PositionedOffer[];
  blocks: PositionedScheduleBlock[];
}

/**
 * Asigna carril a reservas, ofertas y bloqueos de cada día compartiendo
 * el mismo reparto: un bloqueo de Ana y una cita de Luis a la misma hora
 * se pintan lado a lado. A igual inicio, bloqueo a la izquierda, luego
 * la reserva y la oferta a la derecha (la de una cancelada queda junto
 * a ella, como antes).
 *
 * Muta los elementos recibidos (son copias recién creadas por los
 * `group*ByWeekday` del mismo render).
 */
export function assignLanesByWeekday(
  grouped: Record<WeekdayKey, PositionedRow[]>,
  groupedOffers: Record<WeekdayKey, PositionedOffer[]>,
  groupedBlocks: Record<WeekdayKey, PositionedScheduleBlock[]>,
): void {
  for (const key of Object.keys(grouped) as WeekdayKey[]) {
    assignDayLanes({ rows: grouped[key], offers: groupedOffers[key], blocks: groupedBlocks[key] });
  }
}

function assignDayLanes({ rows, offers, blocks }: DayItems): void {
  const items: Array<{ topPx: number; heightPx: number; lane?: LaneSlot }> = [
    ...blocks,
    ...rows,
    ...offers,
  ];
  if (items.length === 0) return;
  const lanes = layoutOverlaps(items.map((i) => ({ start: i.topPx, end: i.topPx + i.heightPx })));
  items.forEach((item, index) => {
    item.lane = lanes[index];
  });
}

/** Separación en px entre carriles y con el borde de la columna. */
const LANE_GAP_PX = 2;

/**
 * Posición horizontal en línea de un elemento con carril. Con un solo
 * carril no devuelve nada y manda la clase del bloque (ancho completo).
 */
export function getLaneStyle(lane?: LaneSlot): { left: string; right: string } | undefined {
  if (!lane || lane.laneCount <= 1) return undefined;
  // Redondeamos para no escribir restos de coma flotante (`-7e-15%`).
  const pct = (n: number) => Math.round(n * 1000) / 1000;
  const width = 100 / lane.laneCount;
  const left = pct(lane.lane * width);
  const right = pct((lane.laneCount - lane.lane - 1) * width);
  return {
    left: `calc(${left}% + ${LANE_GAP_PX}px)`,
    right: `calc(${right}% + ${LANE_GAP_PX}px)`,
  };
}
