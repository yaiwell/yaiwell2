/**
 * Estilos del campo de búsqueda principal.
 *
 * Estética: redondeado generoso, fondo crema, icono lupa a la izquierda,
 * sin sombra (el contenedor padre ya da elevación).
 */
export const searchBarStyles = {
  form: 'relative flex w-full items-center',
  iconLeft: 'pointer-events-none absolute left-4 flex h-full items-center text-stone-500',
  input:
    'h-12 w-full rounded-full border border-stone-200 bg-white pl-11 pr-12 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition-shadow focus:ring-2 focus:ring-stone-900/10 focus:border-stone-300 sm:h-13 sm:text-base',
  clearButton:
    'absolute right-2 flex size-9 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700',
} as const;
