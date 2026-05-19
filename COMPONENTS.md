# Glosario de componentes — Beauly

> Mapa de identificadores `data-component` para localizar cualquier elemento
> de la UI. Inspecciona el DOM con devtools y busca el `data-component`
> para identificar qué referenciar en una conversación.
>
> Convención: kebab-case en inglés. Los items dinámicos usan el `slug` del
> recurso cuando es estable (`provider-card-{slug}`).

---

## Páginas raíz

- `home-page` — wrapper de la landing en `/[locale]`.
- `search-page` — wrapper de la vista de búsqueda en `/[locale]/buscar`.

---

## Landing pública (`/`)

### `hero` — Sección principal con buscador

- `hero` — `<section>` raíz del hero.
- `hero-badge` — píldora "Belleza, bienestar y deporte".
- `hero-search-card` — tarjeta del buscador con 3 campos + botón.
- `hero-search-category` — campo "¿Qué buscas?".
- `hero-search-location` — campo de localización.
- `hero-search-when` — campo de cuándo (hoy / ahora / etc.).
- `hero-search-submit` — botón "Buscar".

### `category-grid` — Categorías populares

- `category-grid` — `<section>` raíz.
- `category-card-peluqueria`
- `category-card-masajes`
- `category-card-manicura`
- `category-card-gimnasio`
- `category-card-estetica`
- `category-card-yoga`

### `how-it-works` — Cómo funciona (3 pasos)

- `how-it-works` — `<section>` raíz.
- `how-it-works-header` — cabecera con el título.
- `how-it-works-step-buscar` — primer paso (icono MapPin).
- `how-it-works-step-reservar` — segundo paso (icono CalendarDays).
- `how-it-works-step-disfrutar` — tercer paso (icono Sparkle).

### `differentiator-cards` — Por qué Beauly (3 cards)

- `differentiator-cards` — `<section>` raíz.
- `differentiator-cards-header` — cabecera con el título.
- `differentiator-card-availability` — card "Disponibilidad real" (icono Clock).
- `differentiator-card-curation` — card "Curación premium" (icono BadgeCheck).
- `differentiator-card-no-commitment` — card "Sin compromiso" (icono ShieldCheck).

### `final-cta` — Banner final

- `final-cta` — `<section>` raíz.
- `final-cta-banner` — banner cálido interior.
- `final-cta-button` — CTA que enlaza a `/buscar`.

---

## Shell común

### `header` — Cabecera sticky

- `header` — `<header>` sticky.
- `header-desktop-actions` — wrapper de acciones desktop (auth + lang).
- `header-mobile-actions` — wrapper de acciones mobile (solo lang).
- `header-brand` — logo / nombre de marca.
- `header-nav-home` — enlace "Inicio".
- `header-nav-search` — enlace "Buscar".
- `header-providers-link` — CTA "Soy profesional".
- `header-sign-in` — botón iniciar sesión.
- `header-sign-up` — botón registrarse.
- `header-lang-switcher` — instancia del LangSwitcher en el header.

### `footer` — Pie de página

- `footer` — `<footer>` raíz.
- `footer-col-brand` — columna izquierda con marca y socials.
- `footer-brand` — logo + nombre.
- `footer-tagline` — texto bajo la marca.
- `footer-socials` — wrapper de iconos sociales.
- `footer-social-instagram` — enlace Instagram (icono Camera).
- `footer-social-twitter` — enlace X/Twitter (icono AtSign).
- `footer-social-contact` — enlace Contacto (icono Send).
- `footer-col-product` — columna "Producto".
- `footer-col-company` — columna "Empresa".
- `footer-col-legal` — columna "Legal".
- `footer-link-product-howItWorks`
- `footer-link-product-categories`
- `footer-link-product-pricing`
- `footer-link-company-about`
- `footer-link-company-blog`
- `footer-link-company-careers`
- `footer-link-legal-terms`
- `footer-link-legal-privacy`
- `footer-link-legal-cookies`
- `footer-bottom` — barra inferior con copyright.
- `footer-copyright` — texto de copyright.
- `footer-made-in` — texto "Hecho en Barcelona".

### `mobile-nav` — Barra de navegación inferior (mobile)

- `mobile-nav` — `<nav>` raíz, solo visible en <768px.
- `mobile-nav-tab-home` — pestaña Inicio.
- `mobile-nav-tab-search` — pestaña Buscar.
- `mobile-nav-tab-bookings` — pestaña Reservas.
- `mobile-nav-tab-profile` — pestaña Perfil.

### `lang-switcher` — Selector de idioma

- `lang-switcher` — wrapper del grupo de botones.
- `lang-switcher-option-es` — botón "es".
- `lang-switcher-option-ca` — botón "ca".

---

## Página de búsqueda (`/buscar`)

### `search-view` — Layout principal

- `search-view` — wrapper raíz de la vertical.
- `search-sticky-top` — bloque sticky superior con buscador, filtros y tabs.
- `search-header-row` — fila con título "Buscar" y contador de resultados.
- `search-results-count` — texto "X resultados".
- `search-mobile-tabs` — wrapper de tabs lista/mapa (solo mobile).
- `search-mobile-tab-list` — tab "Lista".
- `search-mobile-tab-map` — tab "Mapa".
- `search-body` — wrapper del contenido (split lista + mapa).
- `search-list-column` — columna de la lista de proveedores.
- `search-map-column` — columna del mapa.

### `search-bar` — Campo de búsqueda principal

- `search-bar` — `<form role="search">`.
- `search-bar-input` — `<input type="search">`.
- `search-bar-clear` — botón "x" para limpiar (solo si hay texto).

### `filters-bar` — Barra de filtros principales (chips + toggle + botón)

- `filters-bar` — wrapper raíz.
- `filters-bar-categories` — scroll horizontal de chips de categoría.
- `filters-bar-category-all` — chip "Todas".
- `filters-bar-category-belleza`
- `filters-bar-category-estetica`
- `filters-bar-category-bienestar`
- `filters-bar-category-deporte`
- `filters-availability-toggle` — toggle "Solo disponibles ahora".
- `filters-bar-open-sheet` — botón que abre el sheet de filtros avanzados.

### `filters-sheet` — Sheet modal de filtros avanzados

- `filters-sheet-overlay` — overlay oscuro del Dialog.
- `filters-sheet` — contenedor del Dialog.Content.
- `filters-sheet-header` — cabecera con título y botón cerrar.
- `filters-sheet-close` — botón cerrar (x).
- `filters-sheet-section-price` — sección "Rango de precio".
- `filters-sheet-price-1` — chip "€".
- `filters-sheet-price-2` — chip "€€".
- `filters-sheet-price-3` — chip "€€€".
- `filters-sheet-section-rating` — sección "Valoración mínima".
- `filters-sheet-rating-any` — chip "Cualquiera".
- `filters-sheet-rating-4` — chip "4.0+".
- `filters-sheet-rating-4-5` — chip "4.5+".
- `filters-sheet-rating-4-8` — chip "4.8+".
- `filters-sheet-footer` — pie con botones aplicar/limpiar.
- `filters-sheet-clear` — botón "Limpiar".
- `filters-sheet-apply` — botón "Aplicar".

### `provider-list` — Lista de cards

- `provider-list` — `<ul>` con todos los proveedores.
- `provider-list-empty` — estado vacío cuando no hay resultados.
- `provider-list-item-{slug}` — `<li>` envoltorio de cada card.

### `provider-card-{slug}` — Card de proveedor

> El sufijo `{slug}` es el slug estable del proveedor (no el id).

- `provider-card-{slug}` — `<article>` raíz.
- `provider-card-image` — wrapper de la foto.
- `provider-card-availability` — overlay con el AvailabilityBadge.
- `provider-card-price-range` — etiqueta con rango de precio (€/€€/€€€).
- `provider-card-body` — cuerpo textual.
- `provider-card-type` — etiqueta "Autónomo" / "Centro".
- `provider-card-name` — nombre del proveedor (`<h3>`).
- `provider-card-address` — dirección textual.
- `provider-card-meta` — fila con rating, reviews y distancia.
- `provider-card-rating` — nota + estrella.
- `provider-card-reviews` — número de reseñas.
- `provider-card-distance` — distancia en km (si hay geolocalización).
- `provider-card-footer` — fila inferior con precio "desde" y CTA.
- `provider-card-from-price` — precio "desde".
- `provider-card-cta` — enlace "Ver detalle".

### `availability-badge` — Píldora de disponibilidad

- `availability-badge-available-now` — estado "Disponible ahora".
- `availability-badge-available-soon` — estado "En X minutos".
- `availability-badge-busy` — estado "Ocupado".

### `search-map` — Mapa Leaflet

- `search-map` — wrapper del MapContainer.
- `search-map-attribution` — atribución OSM personalizada.

---

## Notas

- Los `data-component` son atributos puramente identificativos: no
  afectan al estilo, al accesibility tree ni al comportamiento.
