# DO.md — Beauly

> Registro de tareas completadas. Cada entrada incluye fecha (YYYY-MM-DD) y descripción breve.
> Las tareas se mueven aquí desde `TODO.md` cuando se terminan.
> Las entradas más recientes van arriba.

---

## 2026-05

### 2026-05-27

- **Ronda 2 multi-agente: cierre de Bloque E + Bloque F del esqueleto.** 5 implementadores en paralelo (worktrees aislados), 4 namespaces i18n nuevos en es/ca, ningún archivo > 250 líneas, todos los componentes en estructura §6.bis (`.tsx`/`.styles.ts`/`.logic.ts`/`.types.ts`/`index.ts`).
  - **E1 — 404 + ficha de servicio individual.** `src/app/[locale]/not-found.tsx` con copy editorial y CTAs Inicio + Buscar. Nueva ruta `centro/[slugWithId]/servicio/[serviceId]/page.tsx`. Componentes `NotFoundView` y `ServiceDetail` (con `policy` mostrando cancelación 2h y `ratingHint` recordando que solo puede valorar quien tenga `booking.status === 'completed'`). Añadidos `getProviderService(providerId, serviceId)` al `providers.service` y `findServiceByProvider` al repositorio. Namespace i18n `notFound` + `serviceDetail`.
  - **E2 — Flujo de reserva mock completo.** Ruta `centro/[slugWithId]/reservar?serviceId=...` (Server Component) que renderiza `BookingFlow` (Client) con steps slot → resumen → pago mock → confirmación. Componentes: `BookingFlow`, `SlotPicker` (calendario navegable mañana/tarde con buffer), `BookingSummary` (notas opcionales), `MockPaymentStep` (800ms simulados, NO toca Stripe), `BookingConfirmation`. Generador determinista `booking-slots.ts` con hash xor + Knuth para variar ocupados entre proveedores. CTA "Reservar" en `ServiceDetailSheet` ahora linka al flujo. Namespace `booking.*` con subniveles `flow`, `slotPicker`, `summary`, `policy`, `payment`, `confirmation`.
  - **E3 — Autocomplete + chips de filtros activos.** `SearchAutocomplete` (Client) con debounce 250ms, navegación teclado (↑/↓/Enter/Esc), ARIA combobox (`role=combobox`, `aria-controls`, `aria-activedescendant`), IDs estables con `useId`. Integrado en `SearchBar` (hero landing + `/buscar`). `ActiveFiltersChips` muestra filtros aplicados como chips removibles con "Limpiar todo". Generador `search-suggestions.ts` (categorías + servicios + centros). Namespace `searchAutocomplete` + `searchFilters.chips`.
  - **F1 — Área cliente `/mis-reservas` + Área admin `/admin`.** Cliente: `CustomerShell` (sidebar/topbar responsive), `BookingsList` Server que parte bookings en `upcoming` / `pendingReview` / `past`, `BookingCard` con badge de estado y CTA "Cancelar" deshabilitado si <2h (§4.bis). Admin: `AdminShell` con badge ADMIN, `AdminMetricsGrid` (4 KPIs con delta semanal), `VerificationsQueue`, `VerificationDetail` con documentos y acciones aprobar/rechazar con toast accesible (`role=status`). Nuevo helper puro `lib/utils/booking-cancellation.ts` con `canCancelBooking` (umbral 2h + estados activos) + 9 tests. Namespace `customerArea` y `adminArea`. Como efecto colateral, `vitest.config.ts` ganó alias para `next/navigation` que desbloquea tests RTL con `Link` localizado.
  - **F2 — Área proveedor `/panel`.** Layout con sidebar desktop + bottom tab bar móvil. Subrutas: `panel/` (dashboard con KPIs + mini-gráfica CSS + top services), `panel/calendario` (vista semana 7×13h con bloques absolute-positioned), `panel/servicios` (listado), `panel/servicios/nuevo` (formulario con cascada categoría → tipo → subtipo), `panel/centro` (settings), `panel/valoraciones` (filtros estrellas/periodo/sin-respuesta). Fake data: `panel-metrics`, `panel-bookings`, `panel-services`, `panel-reviews`, `categories-hierarchy`. Sin librerías de gráficos pesadas. Namespace `providerPanel.*` con subniveles `nav`, `dashboard`, `calendar`, `services`, `addService`, `settings`, `reviews`.
  - **Validaciones globales tras merge:** `tsc --noEmit` limpio, `npm run lint` limpio, `npm run test -- --run` 100/100 verde (18 archivos).

- **TEST.md + andamiaje de tests.** Vitest (happy-dom) + Playwright + RTL + @testing-library/jest-dom. Scripts npm: `test`, `test:watch`, `test:ui`, `test:e2e`, `test:e2e:ui`. ESLint ignora `.claude/**`, `playwright-report/**`, `test-results/**`. Ejemplos: `provider-slug.test.ts` (8 unit), `AvailabilityBadge.test.tsx` (5 RTL, 3 variantes), `tests/e2e/provider-flow.spec.ts` (Playwright). Setup compartido en `tests/setup.ts` con jest-dom matchers + cleanup. Convenciones documentadas en TEST.md.

### 2026-05-21

- **Ficha de proveedor (`/centro/[slug]-[id]`) completa.** Construida en paralelo por 6 agentes especializados con scopes no solapados y contratos de props acordados de antemano.
  - **Datos + servicio:** `getProviderDetail(providerId)` en `providers.service.ts` devuelve `{provider, services, reviews, ratingBreakdown}`. Nuevo módulo `src/lib/fake-data/reviews.ts` con 84 reseñas (`rev-01`..`rev-84`) repartidas por los 10 proveedores, en mezcla es/ca, sin <3★, fechas relativas a `2026-05-20T12:00:00Z`. Helpers `getReviewsByProvider(id)` y `getRatingBreakdown(id)`. Tipo `Review` añadido a `types/domain.ts`. Utilidad `provider-slug.ts` con `buildProviderSlugWithId` y `parseProviderIdFromSlugWithId` (regex `/-(prov-\d+)$/`).
  - **Routing:** `src/app/[locale]/centro/[slugWithId]/page.tsx` como Server Component que parsea el segmento, valida locale, llama al service, enriquece el `Provider` con `availability` actual y `distanceKm: null`, y compone `<ProviderDetail>`. `generateMetadata` con título, descripción i18n y OG image. `not-found.tsx` con CTA de vuelta a `/buscar`. `ProviderCard` ahora envuelve el `<article>` en `<Link>` hacia `/centro/${buildProviderSlugWithId(provider)}`.
  - **Componentes (6 features, todos en `src/components/features/provider/`):**
    - `ProviderHeader` (Server): breadcrumb (Home › Buscar › Nombre, primer crumb oculto en mobile), tipo (autónomo/centro), h1 `font-display`, dirección con `MapPin`, columna derecha con `AvailabilityBadge` + price chip + valoración. `ProviderHeader.logic.ts` aísla `Date.now()` para no romper la regla de pureza de React.
    - `ProviderGallery` (Client): carrusel scroll-snap en mobile + grid 60/40 (1 principal + 4 thumbnails) en desktop, mismo DOM con `lg:hidden`/`hidden lg:grid`. Hook `useProviderGallery` con cycling y `onKeyDown`.
    - `ProviderServicesList` (Server): agrupa servicios por categoría raíz subiendo por `parentId`. `formatPriceCents` con `Intl.NumberFormat`. Botón "Próximamente" deshabilitado (shadcn `outline`).
    - `ProviderReviewsSection` (Client): rating breakdown con barras `role="progressbar"` (relleno amber-400), avatares con iniciales, hook `useReviewsCollapse(total, 5)` + `formatRelativeDate` (semanas/meses en es/ca).
    - `ProviderInfoPanel` (Server) + `ProviderInfoMap` (Client, dynamic `ssr:false`): mini-mapa Leaflet con pin reutilizando `buildPinHtml` (status `available_now`), horario hard-codeado (TODO Fase 1: campo en schema), dirección y CTA "Cómo llegar" a Google Maps.
    - `ProviderDetail` (Server, compositor): orden Header → Gallery → Nav sticky mobile (`ProviderDetailNav` Client con `IntersectionObserver` scroll-spy) → Services → Reviews → Info. Cada sección con `id="section-{name}"` y `scroll-mt-28 md:scroll-mt-20`.
  - **i18n:** `providerDetail.*` añadido a `messages/es.json` y `ca.json` (breadcrumb, header, tabs, services, reviews, info, notFound).
  - **COMPONENTS.md:** nueva sección "Página de proveedor" con todos los `data-component` (~40 nuevos identificadores).
  - **Validación:** `tsc --noEmit` y `npm run lint` limpios. Tarea completada según workflow CLAUDE.md §7.

### 2026-05-19

- **Rediseño UI iteración 2 — categorías con foto, buscador desktop, identificadores universales.**
  - **CategoryGrid:** rediseño de las 8 categorías. Antes: bloques planos con color en hover. Ahora: card con imagen Unsplash en el 60% superior + bloque pastel (rotando entre `brand-rose`/`brand-sky`/`brand-sage`/`brand-peach`/`brand-lilac`/`brand-butter`) en el 40% inferior con icono + nombre siempre visibles. Imágenes verificadas HTTP 200.
  - **Hero (buscador desktop):** el form en escritorio se veía raro (selects nativos dentro de pill rounded-full). Reemplazado por 3 campos icono+label+valor con divisores verticales (`Tags`, `MapPin`, `CalendarClock`), `ChevronDown` indicadores y botón submit circular (`md:h-12 md:w-12 md:rounded-full`). Mobile mantiene layout vertical compacto.
  - **Header mobile cleanup:** eliminado botón hamburguesa redundante con MobileNav inferior. Acciones mobile reducidas a `<LangSwitcher compact />`.
  - **Sistema de identificadores universal:** ~95 atributos `data-component` en kebab-case añadidos en toda la UI (header, hero, search, footer, mobile-nav, lang-switcher, category-grid, how-it-works, differentiator-cards, final-cta, search-view, search-bar, filters-bar, filters-sheet, provider-list, provider-card, availability-badge, search-map). Glosario completo en `COMPONENTS.md` (raíz). Esto permite al usuario decir "modifica el `hero-search-submit`" sin ambigüedad.
  - **Auditoría de diseño (Agent D):** purga total de `stone-*` en componentes de búsqueda (`ProviderCard`, `FiltersBar`, `FiltersSheet`, `SearchView`, `SearchBar`, `SearchMap`, `AvailabilityBadge`) — reemplazado por tokens semánticos (`text-foreground`, `text-muted-foreground`, `bg-card`, `bg-muted`, `bg-primary`, `text-primary-foreground`, `border-border`). `font-serif` → `font-display` para consistencia con la decisión Fraunces. `focus-visible:ring-2 focus-visible:ring-primary/40` en elementos interactivos.
  - **AvailabilityBadge:** contraste reforzado en variante `subtle` (`emerald-900` sobre `emerald-100`, `amber-900` sobre `amber-100`) tras audit de accesibilidad. Variante `solid` mantenida para fondos oscuros.
  - **ProviderList:** estilos inline movidos a `ProviderList.styles.ts` (cumplimiento CLAUDE.md §6.bis).
  - **i18n:** claves `search.card.typeAutonomous` / `typeCenter` (es/ca) reemplazan strings hardcodeados en JSX.



- **Prototipo visible: landing + búsqueda con mapa funcionando en Vercel** (https://beauly-ten.vercel.app). Construido en paralelo por 2 agentes coordinados por verticales sin solape de archivos.
- **Vertical de búsqueda (`/buscar`):**
  - Datos fake creíbles de Barcelona: 10 proveedores con coordenadas reales (Eixample, Gràcia, Sant Antoni, Born, Sarrià, Poblenou, Pedralbes, Raval, Sant Gervasi), 30 servicios con precios calibrados a BCN 2026, generador determinista de disponibilidad (~40% ahora / ~30% pronto / ~30% ocupado) por hash de providerId.
  - Capa de servicios Supabase-ready en `src/lib/services/providers/`: `providers.repository.ts` es la frontera de swap (hoy fake, mañana Prisma, misma firma), `providers.service.ts` con `searchProviders` (filtros + Haversine + ordenación), Zod schemas, errores tipados.
  - Página `/buscar` como Server Component con searchParams (Next 16 async) que pasa snapshot inicial a `SearchView` (Client). Cambios de filtros vía URL state + `useTransition`, sin Server Actions. URL compartible.
  - 8 componentes en `src/components/features/search/` con estructura §6.bis. Mapa con `react-leaflet` + tiles OSM gratis, cargado vía `next/dynamic({ ssr: false })`. Pines coloreados verde/ámbar/gris.
  - Mobile-first responsive: <768px tabs Lista/Mapa, ≥1024px split 50/50 lista+mapa.
  - Tipos compartidos en `src/types/domain.ts` para la futura app móvil.
  - Deps añadidas: `zod`, `react-leaflet@5`, `leaflet@1.9`, `@types/leaflet`.
- **Shell de app + landing:**
  - Header sticky (logo Beauly, nav, LangSwitcher es/ca, botones placeholder, hamburguesa mobile), MobileNav bottom tab bar con safe-area-inset iOS (4 tabs), Footer (3 columnas + redes + copyright), LangSwitcher pill que preserva pathname con `useRouter().replace(pathname, { locale })`.
  - Layout `[locale]/layout.tsx` integra el shell preservando `setRequestLocale`, `NextIntlClientProvider`, `generateStaticParams`, `hasLocale`. Padding inferior en `<main>` para no quedar tapado por el MobileNav.
  - Landing `/` con 5 secciones premium-cálidas (paleta stone): Hero (título 2 líneas + buscador estilo Airbnb que navega a `/buscar` con searchParams), CategoryGrid (8 categorías scroll horizontal mobile / grid 4 col desktop), HowItWorks (3 pasos), DifferentiatorCards (3 ventajas), FinalCTA.
  - Imágenes Unsplash con `background-image` CSS (no `next/image`) para evitar configurar `remotePatterns` y porque son decorativas sin carga semántica. URLs verificadas con curl HTTP 200.
  - Iconos sociales sustituidos por genéricos: `lucide-react@1.16` retiró Instagram/Twitter/Linkedin por licencia. Cuando definamos cuentas reales meteremos SVGs custom de Simple Icons.
- **Decisiones arquitectónicas clave para Supabase futuro:**
  - El **repository pattern** ya está aplicado: cuando lleguemos a Bloque B (Supabase + Prisma), solo se sustituye el cuerpo de `providers.repository.ts` sin tocar service ni componentes.
  - El **service layer** ya valida con Zod, lanza errores tipados y no toca infraestructura — agnóstico de la fuente de datos.
  - Los **tipos de dominio** ya están en `src/types/domain.ts` desacoplados de Prisma — cuando se genere el cliente Prisma, mapearemos sus tipos a estos (o usaremos selecciones tipadas).

### 2026-05-20

- **Deploy en Vercel funcionando: https://beauly-ten.vercel.app**
  - `/` sirve castellano ("Belleza, bienestar y deporte cuando tú quieras"), `/ca` sirve catalán ("Bellesa, benestar i esport quan tu vulguis"). Build de producción con Turbopack.
  - Obstáculo resuelto en el camino: Vercel Hobby bloquea deploys cuyo commit author no está vinculado a la cuenta. Los commits iniciales usaban `jgraells@vteq.es` (email del trabajo) en lugar de `jorgegraellsgarcia@gmail.com` (cuenta de Vercel/GitHub). Solución aplicada: reescritura del author de los 7 commits con `git filter-branch --env-filter` y force-push a `main`. Repo fresco sin colaboradores, riesgo cero. Configurado `git config --local user.email "jorgegraellsgarcia@gmail.com"` para que los commits futuros desde este entorno salgan correctos sin volver a tocar nada.
  - ✅ **Bloque A de TODO.md completado.**
- **Repositorio publicado en GitHub:** [jorgegraells/beauly](https://github.com/jorgegraells/beauly). Branch renombrado `master` → `main`. Estado anterior (initial commit + bootstrap + tooling + shadcn) reagrupado en 4 commits temáticos siguiendo Conventional Commits en castellano: `chore: añadir documentación base`, `style: reformatear archivos generados por create-next-app`, `build: configurar tooling de calidad`, `feat: instalar shadcn/ui con paleta stone`. Añadido `.claude/` al `.gitignore` (preferencias locales del cliente).
- **next-intl configurado con `es` (por defecto) y `ca`.**
  - Instalado `next-intl ^4.12.0` como dependencia de producción.
  - `src/i18n/routing.ts` con `defineRouting({ locales: ['es','ca'], defaultLocale: 'es', localePrefix: 'as-needed' })`. Decisión: `as-needed` → `/` sirve castellano sin prefijo (mercado primario, URLs limpias), `/ca/...` sirve catalán.
  - `src/i18n/navigation.ts` con wrappers tipados (`Link`, `redirect`, `usePathname`, `useRouter`, `getPathname`) vía `createNavigation(routing)`.
  - `src/i18n/request.ts` con `getRequestConfig` que valida `requestLocale` con `hasLocale` y carga `messages/${locale}.json`.
  - `src/proxy.ts` (no `middleware.ts` — en Next.js 16 el file convention se renombró a `proxy.ts`) con `createMiddleware(routing)` y matcher `'/((?!api|_next|_vercel|.*\\..*).*)'`.
  - `src/messages/es.json` y `src/messages/ca.json` con claves de prueba (`common.{appName,loading,error}`, `home.{title,subtitle,cta}`) en castellano y catalán reales.
  - `src/app/[locale]/layout.tsx` y `page.tsx`: el layout (Server Component) usa `params: Promise<{locale}>` (Next 16 hace `params` async), `generateStaticParams`, `hasLocale` + `notFound()`, `setRequestLocale`, envuelve children en `<NextIntlClientProvider>` y setea `<html lang={locale}>`. La página resuelve params en async y delega el render a un subcomponente síncrono que usa `useTranslations('home')`.
  - `src/global.d.ts` augmenta `AppConfig` de next-intl v4 con `Locale` y `Messages` derivados de `es.json` para autocompletado/type-safety en `t(...)` y `setRequestLocale`.
  - `next.config.ts` envuelto con `createNextIntlPlugin('./src/i18n/request.ts')`.
  - Verificado: typecheck, lint, format:check y `npm run build` limpios. Build genera estáticamente `/es` y `/ca`.
- **Estructura de carpetas creada según `CLAUDE.md` §5.**
  - Nuevas carpetas (con `.gitkeep` para trackearlas vacías): `src/components/shared/`, `src/components/features/`, `src/lib/services/`, `src/lib/db/`, `src/lib/integrations/`, `src/lib/utils/`, `src/types/`, `src/styles/`, `prisma/`, `tests/`, `docs/`.
  - `src/lib/utils.ts` (helper `cn()` de shadcn) y `src/lib/utils/` (carpeta para helpers futuros) conviven sin conflicto.
  - Ningún archivo `.ts/.tsx` ni `index.ts` re-export creado todavía: las carpetas son placeholders hasta que se llenen con código real (regla §6.bis: no abstracciones prematuras).
- **`.env.example` creado con las variables de `CLAUDE.md` §9.**
  - Cabecera explicativa: es plantilla commiteable, valores reales en `.env.local` gitignored.
  - Bloques agrupados con cabeceras `# === Servicio ===`: Supabase, Clerk, Stripe, Mapbox, Resend, App. Cada variable con comentario en castellano explicando su propósito y si va en cliente o servidor.

### 2026-05-19

- **shadcn/ui instalado y configurado con paleta `stone` + Radix.**
  - Inicializado shadcn v4 (`npx shadcn@latest init`) con preset **Nova** (Lucide + Geist) y base **Radix UI** (frente a Base UI, que es más nueva y con menos recursos en internet).
  - `components.json` configurado: `style: radix-nova`, `baseColor: stone`, `iconLibrary: lucide`, alias `@/components`, `@/components/ui`, `@/lib`, `@/lib/utils`, `@/hooks`, `rsc: true`, `tsx: true`, `cssVariables: true`.
  - **Paleta `stone` aplicada manualmente en `src/app/globals.css`.** Decisión de marca: stone (gris cálido con tinte amber, evoca papel natural / madera / piedra de spa) frente a neutral/slate/gray/zinc por encajar con la estética "premium, unisex, bienestar" definida en `VISION.md` y guardada en memoria. Cubre tema claro y oscuro con valores OKLCH oficiales de shadcn v4 stone.
  - Generado primer componente: `src/components/ui/button.tsx` (con primitiva `Slot` de Radix UI y variantes via `cva`, todas las variantes default/outline/secondary/ghost/destructive/link + sizes default/xs/sm/lg/icon/icon-xs/icon-sm/icon-lg).
  - Generado helper `src/lib/utils.ts` con `cn()` (clsx + tailwind-merge), tal como prevé el patrón de `CLAUDE.md` sección 6.bis.
  - Dependencias de producción añadidas: `radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css`, `lucide-react` (ver siguiente tarea — esto cierra también "Configurar Lucide React").
  - Limpieza: removidos `@base-ui/react` (sin uso tras switch a Radix) y `shadcn` CLI movido a `devDependencies`.
  - Verificado: `typecheck`, `lint`, `format:check` y `npm run build` pasan limpios. Build de producción: compila en ~1.5s con Turbopack.
- **Lucide React configurado.** Instalado como dependencia (`lucide-react ^1.16.0`) y registrado en `components.json` como `iconLibrary: "lucide"`, para que cada componente añadido vía `npx shadcn@latest add` use Lucide automáticamente.
- **Bootstrapping del proyecto Next.js (Bloque A — parcial).**
  - Inicializado el proyecto con `create-next-app`: **Next.js 16.2.6** (no v15 como decía el `TODO.md` original), React 19.2.4, Tailwind CSS v4, TypeScript 5 con `strict: true`, App Router. Alias `@/*` → `./src/*` configurado en `tsconfig.json`. Dev server verificado en `localhost:3000` con Turbopack.
  - Reorganizada documentación: movidos `CLAUDE.md`, `VISION.md`, `TODO.md`, `DO.md`, `README.md` de `C:\JORGE\` a la raíz del proyecto. Borrado el `CLAUDE.md` que generó Next.js (solo contenía `@AGENTS.md`) y añadida la directiva `@AGENTS.md` al inicio de nuestro `CLAUDE.md`. Actualizada la sección 2 del `CLAUDE.md` con `Next.js 16`.
- **Tooling de calidad de código: ESLint + Prettier + lint-staged + Husky + commitlint.**
  - `eslint.config.mjs` endurecido sobre la base de `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`: prohibido `@typescript-eslint/no-explicit-any`, `no-unused-vars` con escape `_`, `consistent-type-imports` con estilo inline, `no-console` (permite `warn`/`error`), `prefer-const`, `no-var`. Integración con Prettier vía `eslint-config-prettier/flat` al final del array.
  - `.prettierrc.json` con `singleQuote`, `trailingComma: all`, `printWidth: 100`, `endOfLine: lf`, plugin `prettier-plugin-tailwindcss` para ordenar clases. `.prettierignore` excluye `node_modules`, build outputs, env y **los `.md` de documentación** (los mantenemos formateados a mano para no romper tablas/saltos cuidados en castellano).
  - `commitlint.config.mjs` con `@commitlint/config-conventional` y `type-enum` cerrado a `feat/fix/refactor/chore/docs/test/style/perf/build/ci/revert`. Asunto libre en castellano, header máximo 100.
  - Husky inicializado (`npx husky init`), `core.hooksPath = .husky/_` verificado. Hooks: `pre-commit` → `npx lint-staged`; `commit-msg` → `commitlint --edit "$1"`. `lint-staged` configurado en `package.json` con globs para `.ts/.tsx/.js/.jsx/.mjs/.cjs` (eslint --fix + prettier --write) y `.json/.md/.css/.yaml/.yml` (prettier --write).
  - Scripts npm añadidos: `format`, `format:check`, `lint:fix`, `typecheck`. Verificación final: `typecheck`, `lint` y `format:check` pasan limpios sin warnings.

### 2026-05-18

- **Convenciones de código codificadas en `CLAUDE.md` sección 6.bis.** Reglas no negociables establecidas:
  - **Idioma:** código en inglés, comentarios y commits en castellano, textos al usuario via i18n (es/ca).
  - **Comentarios JSDoc obligatorios** en funciones públicas, explicando el *por qué* no el *qué*.
  - **Separación estricta UI / lógica / estilos / tipos** en archivos separados (`Componente.tsx`, `Componente.logic.ts`, `Componente.styles.ts`, `Componente.types.ts`, `index.ts`).
  - **Separación estricta backend** (`servicio.service.ts`, `servicio.repository.ts`, `servicio.validation.ts`, `servicio.types.ts`, `servicio.errors.ts`, `index.ts`).
  - **Estilos con Tailwind agrupados en `*.styles.ts`** (opción 1: objetos de clases agrupadas por elemento + `cva` para variantes). Nada de Tailwind largo inline en JSX.
  - **Máximo 250 líneas por archivo.** Imports ordenados en 3 grupos. Re-exports limpios desde `index.ts`.
  - **Validación con Zod en cada borde del sistema** + errores tipados como clases específicas.
- **Documentación de visión y operativa.** Creados dos archivos complementarios:
  - `VISION.md` con visión de producto, posicionamiento frente a competidores, modelo de negocio, diferenciadores prioritarios, principios y antiprincipios de diseño, criterios de éxito y filosofía del proyecto. Documento maestro para cualquier decisión de producto.
  - `README.md` operativo con requisitos, primer arranque, comandos disponibles, estructura del proyecto, flujo Git y política de seguridad. Puerta de entrada al repo.
- **Decisión arquitectónica: cero APIs de IA con coste en MVP.** Se elimina del stack: Anthropic API, OpenAI embeddings, pgvector. El buscador se implementa con PostgreSQL full-text search nativo (`tsvector`, `tsquery`, `pg_trgm`) — gratis, suficiente para los primeros 12-18 meses y sin dependencias externas. El buscador semántico y el onboarding asistido por IA pasan a Fase 3, condicionados a tener ingresos que justifiquen costes recurrentes de inferencia.
- **Documentación base del proyecto.** Creados los tres archivos pilares del repositorio:
  - `CLAUDE.md` con contexto técnico, stack, decisiones arquitectónicas, reglas del proyecto y flujo de trabajo con Claude Code.
  - `TODO.md` con desglose de tareas para Fase 0 (esqueleto + infra) y referencia genérica de Fase 1, 2 y 3.
  - `DO.md` con plantilla de registro de progreso.

---

*Nuevas entradas se añaden encima, agrupadas por mes.*
