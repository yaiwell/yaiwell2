/**
 * API pública de la feature `search`.
 *
 * Consumir desde aquí, nunca desde archivos internos:
 *
 *   import { SearchView } from '@/components/features/search';
 */
export { SearchView } from './SearchView';
export type { SearchViewInitialState, SearchViewProps } from './SearchView';

export { SearchAutocomplete } from './SearchAutocomplete';
export type { SearchAutocompleteProps } from './SearchAutocomplete';

export { ActiveFiltersChips } from './ActiveFiltersChips';
export type {
  ActiveFilterChip,
  ActiveFiltersChipsProps,
  ActiveFiltersState,
} from './ActiveFiltersChips';
