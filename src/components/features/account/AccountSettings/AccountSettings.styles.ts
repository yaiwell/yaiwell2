/**
 * Estilos compartidos por las tarjetas de `/cuenta/ajustes`.
 */
export const accountSettingsStyles = {
  card: 'flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900',
  title: 'text-sm font-medium text-stone-900 dark:text-stone-100',
  hint: 'text-xs text-stone-500 dark:text-stone-400',
  row: 'flex flex-col gap-2 border-t border-stone-200 pt-4 first:border-t-0 first:pt-0 dark:border-stone-800',
  rowInline: 'flex flex-wrap items-center justify-between gap-3',
  label: 'text-sm font-medium text-stone-800 dark:text-stone-200',
  input:
    'min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-base text-stone-900 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100',
  fields: 'grid gap-3 sm:grid-cols-2',
  field: 'flex flex-col gap-1',
  avatarRow: 'flex flex-wrap items-center gap-4',
  avatar: 'size-16 shrink-0 rounded-full object-cover',
  actions: 'flex flex-wrap items-center gap-2',
  primaryButton:
    'inline-flex min-h-11 items-center justify-center rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-stone-50 transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200',
  button:
    'inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-900 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800',
  fileInput: 'sr-only',
  saved: 'text-sm text-emerald-700 dark:text-emerald-400',
  error: 'text-sm text-red-700 dark:text-red-300',
} as const;
