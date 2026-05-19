export interface SearchBarProps {
  /** Valor inicial controlado por la URL. */
  initialValue?: string;
  /** Callback al confirmar (Enter o blur con debounce) — actualiza la URL. */
  onSubmit: (value: string) => void;
}
