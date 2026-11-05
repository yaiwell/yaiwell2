/**
 * Estilos del bloque «Tus datos» de `/cuenta`.
 */
export const accountDataCardStyles = {
  root: 'flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900',
  title: 'text-sm font-medium text-stone-900 dark:text-stone-100',
  hint: 'text-xs text-stone-500 dark:text-stone-400',
  actions: 'flex flex-col gap-2 sm:flex-row',
  button:
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-900 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800',
  dangerButton:
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-red-700 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60',
  icon: 'size-4',
  confirm:
    'flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/40',
  confirmTitle: 'text-sm font-medium text-red-900 dark:text-red-100',
  confirmText: 'text-xs text-red-900 dark:text-red-100',
  error: 'text-sm text-red-700 dark:text-red-300',
} as const;
