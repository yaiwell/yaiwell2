/**
 * Estilos del FiltersSheet.
 *
 * En móvil se presenta como bottom-sheet (animación slide-up).
 * En desktop como modal centrado, con max-width para no estirarse.
 */
export const filtersSheetStyles = {
  overlay:
    'fixed inset-0 z-40 bg-stone-950/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
  content:
    'fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white p-6 shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl',
  header: 'mb-5 flex items-start justify-between gap-4',
  titleBlock: 'flex flex-col gap-1',
  title: 'font-serif text-xl text-stone-900',
  description: 'text-sm text-stone-600',
  closeButton:
    'flex size-9 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700',
  section: 'flex flex-col gap-3 border-t border-stone-100 py-5 first-of-type:border-t-0',
  sectionLabel: 'text-sm font-medium text-stone-900',
  priceRow: 'flex flex-wrap gap-2',
  priceChip:
    'inline-flex items-center justify-center rounded-full border px-4 py-1.5 text-sm transition-colors',
  priceChipIdle: 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50',
  priceChipActive: 'border-stone-900 bg-stone-900 text-white',
  ratingRow: 'flex flex-wrap gap-2',
  ratingChip:
    'inline-flex items-center gap-1 rounded-full border px-4 py-1.5 text-sm transition-colors',
  ratingChipIdle: 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50',
  ratingChipActive: 'border-stone-900 bg-stone-900 text-white',
  footer: 'mt-auto flex items-center justify-between gap-3 border-t border-stone-100 pt-5',
  applyButton:
    'inline-flex h-11 flex-1 items-center justify-center rounded-full bg-stone-900 px-6 text-sm font-medium text-white transition-opacity hover:opacity-90',
  clearButton:
    'inline-flex h-11 items-center justify-center rounded-full px-4 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100',
} as const;
