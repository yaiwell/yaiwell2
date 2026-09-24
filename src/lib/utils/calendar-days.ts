/**
 * Helpers de calendario civil (día natural, sin hora).
 *
 * ¿Por qué viven en `lib/utils` y no en el dominio `availability`?
 * Porque no saben nada de horarios, profesionales ni reservas: solo
 * manipulan fechas civiles. Además los consume un Client Component (la
 * tira de días del `SlotPicker`), y `lib/services/availability/index.ts`
 * arrastra Prisma al bundle. `lib/utils/*` son archivos planos sin
 * barrel, así que importarlos desde cliente es seguro por construcción.
 *
 * OJO con la zona horaria: aquí trabajamos deliberadamente en la zona
 * local del dispositivo. Son las fechas que el usuario ve y pulsa en el
 * calendario ("hoy", "mañana"), no instantes de negocio. La conversión a
 * hora del centro (`Europe/Madrid`) es responsabilidad de quien pinta
 * las horas concretas de cada hueco, no de esta capa.
 */

/**
 * Devuelve la clave `YYYY-MM-DD` de una fecha en la zona horaria local.
 *
 * Evitamos `toISOString()` a propósito: colapsaría el día a UTC y un
 * usuario en Canarias pediría los huecos del día equivocado a partir de
 * las 00:00 locales.
 *
 * @param date — fecha a serializar.
 * @returns clave de día en formato `YYYY-MM-DD`.
 */
export function getDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Construye la lista de los próximos `days` días empezando por `from`.
 *
 * La usa el calendario del `SlotPicker` para renderizar las pestañas
 * navegables. Cada fecha se normaliza a las 00:00 de su día local para
 * que no arrastre horas/minutos del instante de entrada y las
 * comparaciones de "día seleccionado" sean estables.
 *
 * @param from — fecha de inicio (incluida).
 * @param days — cantidad de días a generar.
 * @returns array de fechas a las 00:00 de su día local.
 */
export function buildUpcomingDays(from: Date, days: number): Date[] {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return Array.from({ length: days }, (_, i) => {
    const next = new Date(start);
    next.setDate(start.getDate() + i);
    return next;
  });
}
