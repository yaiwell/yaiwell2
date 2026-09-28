export { SearchView } from './SearchView';
export type {
  SearchCategoriesData,
  SearchCategoryOption,
  SearchViewInitialState,
  SearchViewProps,
} from './SearchView.types';
// Funciones puras (sin `'use client'`) que la page ejecuta en servidor.
export { buildSearchCategories } from './SearchView.categories';
export { parseSearchParams } from './SearchView.url';
