/** Una celda del calendario de `/buscar`. */
export interface SearchDayCell {
  /** Clave `YYYY-MM-DD`. */
  day: string;
  /** Día del mes que se pinta. */
  dayOfMonth: number;
  /** Fuera del rango que se ofrece (anterior a hoy o más allá del último día). */
  outOfRange: boolean;
  /** Primer día de la tira o de un mes: es donde se escribe el mes. */
  showMonth: boolean;
}

export interface SearchDayPickerProps {
  /** Días elegidos (`YYYY-MM-DD`). */
  selected: readonly string[];
  /** Añade o quita un día. */
  onToggle: (day: string) => void;
}
