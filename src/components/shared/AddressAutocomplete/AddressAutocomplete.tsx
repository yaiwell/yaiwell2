'use client';

/**
 * Componente compartido AddressAutocomplete.
 *
 * Usa el namespace i18n `addressAutocomplete` con estas claves:
 *  - `placeholder` — texto del placeholder del input.
 *  - `loading` — mensaje mientras hay request en vuelo.
 *  - `error` — mensaje cuando el geocoder falla.
 *  - `no_results` — mensaje cuando no hay coincidencias.
 *  - `clear` — aria-label del botón X que limpia el input.
 *
 * (Las traducciones es/ca/en/de las añade el orquestador, no este
 * componente.)
 */

import { Loader2, MapPin, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useAddressAutocomplete } from './AddressAutocomplete.logic';
import { addressAutocompleteStyles as s } from './AddressAutocomplete.styles';
import type { AddressAutocompleteProps } from './AddressAutocomplete.types';

// `useTranslations` está tipado contra `messages/es.json` (ver
// `src/global.d.ts`). El namespace `addressAutocomplete` aún no existe
// en el JSON cuando este componente se mergea: el orquestador añade las
// cinco claves después. Casteamos a `never` para que TS no falle ahora
// y vuelva a tipar correctamente en cuanto el JSON se actualice. Es la
// única `any`-like de este archivo y está justificada por el orden de
// operaciones del playbook.
const T_NAMESPACE = 'addressAutocomplete' as never;

/**
 * Input de dirección con autocompletado contra `/api/geocoding/forward`.
 *
 * Implementa el patrón ARIA 1.2 de combobox:
 *  - `role="combobox"` en el input con `aria-expanded`, `aria-controls`,
 *    `aria-autocomplete="list"` y `aria-activedescendant`.
 *  - Listbox `role="listbox"` y opciones `role="option"` con
 *    `aria-selected` reflejando el ítem activo del teclado.
 *
 * Mobile-first: el listbox flota ocupando el ancho del wrapper padre,
 * por lo que en <640px ocupa el ancho del input (suficiente para móvil)
 * y en desktop respeta el contenedor del formulario.
 */
export function AddressAutocomplete(props: AddressAutocompleteProps) {
  // `tRaw` viene tipado contra `messages/es.json`. Como el namespace y
  // las claves aún no existen en el JSON (las añade el orquestador en
  // un commit posterior), nos apoyamos en una firma laxa `(key: string)
  // => string` para no pelearnos con `NamespacedMessageKeys`. En cuanto
  // las claves estén en el JSON, esta indirección sigue funcionando.
  const tRaw = useTranslations(T_NAMESPACE);
  const t = tRaw as unknown as (key: string) => string;
  const {
    value,
    inputId,
    listboxId,
    optionId,
    inputRef,
    results,
    activeIndex,
    isOpen,
    isLoading,
    isError,
    handleInputChange,
    handleKeyDown,
    handleFocus,
    handleBlur,
    handleSelectResult,
    handleClear,
  } = useAddressAutocomplete(props);

  const { label, placeholder, disabled, required, ariaDescribedBy } = props;

  // Mostramos el botón de limpiar siempre que haya texto y el input no
  // esté deshabilitado. La prop `onClear` es opcional: el handler local
  // ya limpia el input aunque el consumidor no quiera reaccionar.
  const showClear = !disabled && value.length > 0;
  const hasResults = results.length > 0;
  const activeOptionId = isOpen && activeIndex >= 0 ? optionId(activeIndex) : undefined;

  return (
    <div className={s.root} data-component="address-autocomplete">
      {label && (
        <label htmlFor={inputId} className={s.label}>
          {label}
        </label>
      )}

      <div className={s.fieldWrapper}>
        <span className={s.iconLeft} aria-hidden>
          <MapPin className="size-4" />
        </span>

        <input
          ref={inputRef}
          id={inputId}
          type="text"
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
          aria-label={label ? undefined : (placeholder ?? t('placeholder'))}
          aria-describedby={ariaDescribedBy}
          placeholder={placeholder ?? t('placeholder')}
          value={value}
          disabled={disabled}
          required={required}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={s.input}
          data-component="address-autocomplete-input"
        />

        {isLoading && (
          <span className={s.loadingSpinner} aria-hidden>
            <Loader2 className="size-4" />
          </span>
        )}

        {showClear && (
          <button
            type="button"
            aria-label={t('clear')}
            onClick={handleClear}
            className={s.clearButton}
            data-component="address-autocomplete-clear"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>

      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={label ?? placeholder ?? t('placeholder')}
          className={s.listbox}
          data-component="address-autocomplete-listbox"
        >
          <div className={s.listboxInner}>
            {isError && (
              <li className={s.errorRow} role="presentation">
                {t('error')}
              </li>
            )}

            {!isError && isLoading && !hasResults && (
              <li className={s.statusRow} role="presentation">
                {t('loading')}
              </li>
            )}

            {!isError && !isLoading && !hasResults && (
              <li className={s.statusRow} role="presentation">
                {t('no_results')}
              </li>
            )}

            {!isError &&
              results.map((result, index) => {
                const isActive = index === activeIndex;
                return (
                  <li
                    key={result.id}
                    id={optionId(index)}
                    role="option"
                    aria-selected={isActive}
                    className={s.option}
                    // `onMouseDown` (no `onClick`) para que el evento se
                    // dispare antes del blur del input y la selección no
                    // se pierda por cierre prematuro del listbox.
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectResult(result);
                    }}
                    data-component="address-autocomplete-option"
                  >
                    <span className={s.optionIcon} aria-hidden>
                      <MapPin className="size-4" />
                    </span>
                    <span className={s.optionBody}>
                      <span className={s.optionName}>{result.name}</span>
                      <span className={s.optionFullAddress}>{result.fullAddress}</span>
                    </span>
                  </li>
                );
              })}
          </div>
        </ul>
      )}
    </div>
  );
}
