/**
 * Estilos del componente BecomeProviderConfirm.
 * Misma familia visual que `/cuenta`: tarjeta piedra, tipografía serif.
 */
export const becomeProviderConfirmStyles = {
  shell: 'mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-10 sm:max-w-xl sm:py-16',
  header: 'flex flex-col gap-3',
  eyebrow:
    'inline-flex w-fit items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700 dark:bg-stone-800/60 dark:text-stone-300',
  eyebrowIcon: 'size-3.5',
  title: 'font-serif text-3xl tracking-tight text-stone-900 sm:text-4xl dark:text-stone-50',
  description: 'text-base text-stone-600 dark:text-stone-400',
  note: 'flex items-start gap-3 rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-700 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300',
  noteIcon: 'mt-0.5 size-4 shrink-0 text-stone-500 dark:text-stone-400',
  error:
    'rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200',
  actions: 'flex flex-col gap-3 sm:flex-row',
  confirm:
    'inline-flex items-center justify-center gap-2 rounded-full bg-stone-900 px-6 py-3 text-sm font-medium text-stone-50 transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200',
  cancel:
    'inline-flex items-center justify-center gap-2 rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-medium text-stone-900 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800',
} as const;
