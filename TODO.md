# TODO.md — Yaiwell

> Lista viva de tareas pendientes. Cuando se completa una tarea, se mueve a `DO.md` con fecha.
> Nuevas tareas descubiertas durante el trabajo se añaden aquí antes de continuar.
> Orden: de arriba abajo por prioridad dentro de cada bloque.

---

## 🚧 Fase 0 — Esqueleto visual + infraestructura (2 semanas)

### Bloque A — Bootstrapping del repo

✅ Bloque A completado el 2026-05-20.

### Bloque B — Infraestructura real (sin lógica todavía)

- [x] Crear proyecto en Supabase Cloud (2026-06-04, región `eu-west-2` Londres).
- [x] Activar extensiones: `postgis`, `pg_trgm`, `uuid-ossp` (2026-06-04).
- [~] ~~Configurar Supabase local con Docker~~ — descartado, trabajamos directo contra remoto (2026-06-04).
- [x] Instalar Prisma y conectar a Supabase (Prisma 7.8 + `prisma.config.ts`, vía Session pooler, 2026-06-04).
- [x] Crear `prisma/schema.prisma` con entidades base (User, Provider, Professional, Category, Service, Booking, Review, VerificationRequest, Plan). Sin RLS todavía, solo schema (2026-06-03).
- [x] Generar primera migración y aplicar a remoto (baseline `0_init`, 2026-06-04).
- [x] Configurar RLS policies por tabla (2026-06-05, migración `1_rls_policies`: RLS activo en 10 tablas, lectura pública del catálogo aprobado, deny-by-default en users/bookings/verification_requests, helper `requesting_clerk_user_id()` listo para policies de ownership cuando se conecte JWT template).
- [x] Crear proyecto en Clerk (modo desarrollo) (2026-06-04).
- [x] Integrar Clerk en Next.js (middleware + ClerkProvider) (2026-06-04, `proxy.ts` compone `clerkMiddleware` + `next-intl`).
- [x] Definir los 3 roles en Clerk: `client`, `provider`, `admin` (2026-06-04, Capa 3: tipo `UserRole` con los 3, promoción unsafe→public en webhook `user.created`, helpers `getRoleFromUser` / `getRoleFromSessionClaims` / `resolvePostAuthDestination`, guard `requireRole` aplicado en `/panel`, `/admin`, `/mis-reservas`). Pendiente operativo en dashboard: configurar JWT template para exponer `publicMetadata` en claims y evitar fallback a `currentUser()`.
- [x] Crear webhook handler vacío en `/api/webhooks/clerk` para sync futuro (2026-06-04, stub 501 hasta tener `CLERK_WEBHOOK_SECRET` y URL pública).
- [~] Crear cuenta Stripe (modo test) + activar Stripe Connect. (Cuenta creada y Connect activado por el dev 2026-06-08; pendiente pegar `STRIPE_SECRET_KEY` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` + `STRIPE_CONNECT_CLIENT_ID` en `.env.local`.)
- [x] Crear webhook handler vacío en `/api/webhooks/stripe` (2026-06-08, `lib/integrations/stripe/` + handler con verificación de firma + 14 tests).
- [x] Crear cuenta Resend + verificar dominio para emails.
  - [x] SDK Resend + wrapper `sendEmail()` con errores tipados y 13 tests (2026-06-09).
  - [x] Cuenta Resend + verificación del dominio `yaiwell.com` confirmada por el dev (2026-06-09). Emails ya pueden salir desde `noreply@yaiwell.com`.
- [x] Crear cuenta Mapbox + obtener token público.
  - [x] Wrapper `src/lib/integrations/mapbox/` con `geocodeAddress` (forward) y `reverseGeocode`, errores tipados, 13 tests (2026-06-09).
  - [x] Cuenta Mapbox creada + `NEXT_PUBLIC_MAPBOX_TOKEN` pegado en `.env.local` y validado con `geocodeAddress` real contra `api.mapbox.com/geocoding/v5` (200 OK, Passeig de Gràcia 92 geocodificado correctamente) (2026-06-11).
  - [ ] **Fase 1**: sustituir dropdown estático del Hero (`any | near-me | barcelona | castellar | llica-vall`) por un autocomplete real con `geocodeAddress`. Requiere rediseño UX del Hero — el wrapper queda listo para enchufar (movido a Fase 1).
- [~] Crear cuenta Sentry + integrar SDK en Next.js.
  - [x] SDK `@sentry/nextjs` + `instrumentation` (server/edge) + `instrumentation-client` + `global-error` + `withSentryConfig` con tunnel `/monitoring` + scrubbing de PII (`__session`, `stripe-signature`, `svix-*`, `email`) y filtrado de control-flow (`NEXT_REDIRECT`, `NEXT_NOT_FOUND`). 15 tests (2026-06-09).
  - [ ] Crear proyecto en Sentry y pegar `NEXT_PUBLIC_SENTRY_DSN` + `SENTRY_AUTH_TOKEN` + `SENTRY_ORG` + `SENTRY_PROJECT` en `.env.local`.

### Bloque C — Sistema de diseño base

- [x] Definir paleta de colores (paleta stone aplicada en `globals.css`).
- [x] Definir tipografías (Geist sans + mono ya integrados).
- [x] Componentes propios mínimos: `Header`, `Footer`, `MobileNav`, `LangSwitcher`, `ProviderCard`, `AvailabilityBadge`.
- [ ] Completar componentes shadcn/ui: Card, Input, Badge, Avatar, Dialog, Sheet, Tabs, Skeleton, Toast (añadir según se necesiten).
- [ ] Componentes propios pendientes: `CategoryPill`, `ServiceCard`, `RatingStars` (extraer cuando aparezca el caso de uso).
- [x] Crear página de prueba `/design-system` listando tokens y componentes (2026-06-03).

### Bloque D — Datos fake creíbles

- [x] `src/lib/fake-data/` con generadores tipados (categories, providers, services, availability).
- [x] 10 proveedores fake repartidos por Barcelona (categorías mezcladas).
- [x] 30 servicios fake con descripciones realistas (es/ca).
- [x] Disponibilidad fake determinista (available_now / available_soon / busy).
- [x] Imágenes Unsplash con URLs estables verificadas.
- [x] 100 reseñas fake (84 en 10 providers + 16 nuevas en prov-11 y prov-12) con nombres locales y mezcla es/ca (2026-06-03).

### Bloque E — Vistas públicas navegables

- [x] Landing pública (`/`) con hero + buscador, categorías populares, cómo funciona, diferencial, CTA final, footer.
- [x] Listado de búsqueda (`/buscar`) con filtros, lista de resultados y mapa lateral.
- [x] Mapa interactivo con pines de colores (verde/ámbar/gris) según disponibilidad.
- [x] Toggle "Solo disponibles ahora" en filtros.
- [x] Ficha de servicio individual con descripción, profesional asignado, precio, duración, cláusulas.
- [x] Selector de slot disponible (calendario simple navegable).
- [x] Flujo de "reserva" simulado: confirmar datos → resumen → "pago" (mock) → confirmación.
- [x] Autocomplete de búsqueda mientras escribes (resultados fake), filtros activos visibles como chips.
- [x] Página 404 personalizada.

✅ Bloque E completado el 2026-05-27.

### Bloque F — Áreas privadas (mock visual)

- [x] Layout de área cliente (`/mis-reservas`) con próximas reservas, historial, valoraciones pendientes.
- [x] Layout de área proveedor (`/panel`) con:
  - [x] Dashboard con métricas fake (ingresos semana, reservas, ticket medio, ocupación).
  - [x] Calendario semanal con reservas fake.
  - [x] Listado de servicios ofrecidos.
  - [x] Pantalla de "añadir servicio" con jerarquía categorías → tipos → subtipos.
  - [x] Pantalla de configuración del centro.
  - [x] Vista de valoraciones recibidas.
- [x] Layout de área admin (`/admin`) con:
  - [x] Cola de verificaciones de proveedores pendientes.
  - [x] Ficha de verificación con documentos y botones aprobar/rechazar.
  - [x] Métricas globales fake.

✅ Bloque F completado el 2026-05-27.

### Bloque G — Pulido final del esqueleto

- [x] Microinteracciones (transitions, hovers, loading states).
- [x] Modo oscuro funcional.
- [x] Responsive perfecto en 375px / 768px / 1024px / 1440px (audit `docs/audit-2026-05-27.md`).
- [x] SEO básico (meta tags, OG image, sitemap).
- [x] Verificar que todo el texto está en es/ca (audit + 🔴 hardcoded labels arreglados).
- [ ] Aplicar 🟠 y 🟡 restantes del audit (`docs/audit-2026-05-27.md`).
- [ ] Verificar Lighthouse: Performance > 90, Accessibility > 95.
- [ ] Deploy final en Vercel con dominio definitivo.
- [ ] Captura de pantallas para la presentación a la cliente.

---

## 📦 Fase 1 — MVP funcional (cuando se firme contrato)

*Se detallará al cerrar Fase 0. Por ahora referencia genérica.*

- [x] Auth real con Clerk + sync a Supabase via webhook. (Capa 1 UI custom + Capa 2 webhook svix + Capa 3 roles/guards, 2026-06-04. Bloque Clerk completo.)
- [ ] Clerk JWT template (prioridad baja): exponer `publicMetadata.role` en los claims del JWT para que los guards (`requireRole`) lean el rol del token en vez de llamar a `currentUser()` en cada request. Config 100% en el dashboard de Clerk + ajuste de 1-2 líneas en `getRoleFromSessionClaims`. Ahorra ~50-100ms por request protegido. No es blocker — los guards funcionan vía fallback hoy.
- [ ] Onboarding de cliente.
- [~] Onboarding de proveedor con verificación.
  - [x] Resolver `userId → providerId` + helper `requireCurrentProvider` aplicado en `/panel/layout.tsx` (kill del `getProviderById('prov-01')` hardcodeado). Si el provider no existe aún, redirige a `/panel/onboarding` (el wizard lo creará). 7 tests verde (2026-06-09).
  - [x] Supabase Storage: 3 buckets públicos (`provider-photos`, `service-photos`, `avatars`) con RLS deny-all + writes vía service-role en backend. Wrapper `src/lib/integrations/supabase/` (upload/delete/getPublicUrl + errores tipados), endpoint `POST /api/storage/upload` con authorization (avatars↔clerkId, provider/service-photos↔Provider.userId), componente compartido `PhotoUploader` (drag&drop, preview, max files, i18n 4 locales). 8 tests endpoint + integración i18n es/ca/en/de (2026-06-09).
  - [~] Wizard `/onboarding` (5 pasos: tipo → datos + geocoding → fotos → primer servicio → plan).
    - [x] **Vía A routing**: redirect del panel ahora apunta a `/onboarding` (no `/panel/onboarding`) para evitar bucle con el layout. Helper `slugifyBusinessName` añadido. Proxy `GET /api/geocoding/forward` con auth Clerk + Zod + mapeo de `MapboxConfigError`/`MapboxRequestError` (2026-06-09, 9 tests endpoint + 7 tests slugify).
    - [x] **Capa 1 backend**: módulo `src/lib/services/provider-onboarding/` (Opción B — crea Provider al cerrar paso 2, updates idempotentes en 3-5). 6 errores tipados (`SlugAlreadyTakenError`, `FreePlanNotSeededError`, `OnboardingAlreadyCompleteError`, `ProviderForOnboardingNotFoundError`, `CategoryNotFoundError`, `PlanTierNotFoundError`). 5 endpoints REST + `slug-availability` (auth, ownership, validación Zod). Componente compartido `AddressAutocomplete` (TanStack Query, debounce 300ms, ARIA combobox, navegación teclado) + namespace i18n `addressAutocomplete` en 4 locales. 79 tests nuevos (19 service + 51 API + 9 UI), total 427 verdes (2026-06-09).
    - [x] **Capa 2 UI**: orquestador `OnboardingWizard` + 5 step components (BusinessType → BusinessData → Location → CategoriesService → Confirm), draft persistido en sessionStorage, polling sync de Clerk, errores tipados con i18n en 4 locales, 20 tests UI (2026-06-10). Decisión: sin paso de fotos (post-onboarding) y plan `free` por defecto.
    - [~] **Capa 3**: pulido i18n + E2E del flujo completo (Playwright).
      - [x] Pulido i18n 4 locales (2026-06-10): título y `addressLabel` neutralizados (servían sólo para "centro" cuando el wizard cubre autónomos también), `slugPrefix` unificado a `yaiwell.com/centro/` (era bug: la URL real es siempre `/centro/[slug]-[id]` pero el prefijo mostrado variaba por locale), "Salon" alemán → "Studio/Geschäft" (Salon es demasiado específico de peluquería), género neutralizado en ES/CA (`solo o sola` → `por mi cuenta`, `Soc autònom/a` → `Pel meu compte`).
      - [~] E2E con Playwright recorriendo los 5 pasos contra Supabase dev (2026-06-10): infra montada (`@clerk/testing` + `clerkSetup` + helpers `ensureTestProviderRole` / `cleanupTestProviderBD` + intercept Mapbox vía `page.route()`); spec `tests/e2e/onboarding-wizard.spec.ts` recorre tipo → datos → ubicación → categoría+servicio → publicar → redirect a `/panel`. **Pendiente del dev**: crear user provider de pruebas en dashboard de Clerk con email `<tu>+clerk_test@…` y password, pegar `CLERK_TEST_PROVIDER_EMAIL`/`PASSWORD` en `.env.local`. Instrucciones completas en `tests/e2e/README-onboarding.md`. Tras eso, `npm run test:e2e` debería pasar.
- [x] **Panel admin con cola de verificación real** (`/admin` + `/admin/verificaciones/[id]`): nuevo módulo `lib/services/verification/` (service+repository+validation+errors+types+index) lee `Provider.verificationStatus='pending'` con JOIN a `users` y primera categoría asociada. `approveProvider` y `rejectProvider` (notas obligatorias ≥5 chars) actualizan `Provider.verificationStatus` y registran decisión en `VerificationRequest` (UPSERT por providerId) dentro de una `$transaction`. Server actions `approveProviderAction`/`rejectProviderAction` con `requireRole(['admin'])` + `ensureUserFromClerk`. `VerificationDetail` ahora es Client real con `useTransition` + `AlertDialog` Radix para el motivo de rechazo. Nuevo `lib/services/admin-metrics/` calcula KPIs reales (bookings hoy, GMV semanal, providers pending, tasa cancelación semanal); `deltaPercent=0` por ahora (cálculo de delta semanal queda como pulido). 12 tests nuevos del service. **Operativa**: para usar el panel el dev debe asignarse rol `admin` en Clerk dashboard → User → Public metadata → `{"role":"admin"}`. (2026-06-30)
- [ ] Sistema de servicios con jerarquía de categorías editable.
- [~] Panel del proveedor (`/panel/*`) sobre datos reales — queries de lectura ya cableadas; persistencia y CRUD aún pendientes.
  - [x] `/panel/centro` lee Provider real desde BD (businessName, vatNumber, description, address, photos). Botón Guardar sigue siendo visual; persistencia en pendiente abajo (2026-06-11).
  - [x] `/panel` (dashboard): agregaciones reales sobre bookings (revenue/count/avgTicket + deltas semanales + dailyRevenue + topServices). Ocupación queda en 0 hasta cálculo basado en `Professional.schedule` (2026-06-12).
  - [x] `/panel/calendario`: query real de bookings de la semana actual con joins (client/service/professional) y mapping en timezone Europe/Madrid (2026-06-12).
  - [x] `/panel/servicios`: listado real de Services del provider con conteo de bookings últimos 30 días por servicio (2026-06-12). El estado "paused" llega siempre como `'active'` porque BD no tiene columna; cuando se añada `Service.isActive` se mapea.
  - [x] `/panel/valoraciones`: listado real de Reviews del provider con joins a author/service (2026-06-12). Falta cablear la acción "responder" del proveedor al `replyToReview` ya existente (subitem aparte abajo).
  - [~] **CRUD de servicios** desde `/panel/servicios`:
    - [x] **Crear nuevo** (`/panel/servicios/nuevo`): formulario cableado a server action `createServiceAction` reutilizando `createFirstServiceForProvider` del módulo de onboarding (validación Zod + ownership + creación en BD). Categorías cargadas server-side desde BD vía `getCategoriesTree` (jerarquía 3 niveles). `LocalizedText` se rellena solo en el locale activo; el resto de idiomas se completan más adelante con editor de traducciones (2026-06-12).
    - [x] **Editar** servicio existente en `/panel/servicios/[id]/editar`: reutiliza el `AddServiceForm` con `serviceId` + `initialValues`. Helper `findCategoryPath` traduce `Service.categoryId` plano al path completo del árbol para pre-seleccionar la cascada. `updateServiceAction` fusiona el `LocalizedText` para no perder los idiomas no editados (2026-06-12).
    - [x] **Pausar/reactivar** servicio: migración `6_service_is_active` añade `Service.isActive Boolean @default(true)` + partial index. Server action `toggleServiceActiveAction` con ownership check. UI: `ServiceToggleButton` cliente con `useTransition` (2026-06-12).
    - [x] **Aplicar filtro `isActive=true`** en búsqueda pública (`searchRepository.searchServices` con `AND "isActive" = true`) y en `booking.service.createBooking` (nuevo `ServicePausedError` tipado + chequeo `service.isActive` + chequeo `service.deletedAt` previo a `ServiceNotFoundError`). 2 tests nuevos en `booking.service.test.ts` (ServicePaused / ServiceNotFound soft-delete). El partial index `idx_services_provider_active` queda como soporte futuro al planner (2026-06-29).
    - [x] **Eliminar** servicio (soft delete via `deletedAt` + `isActive=false` por coherencia). Server action `deleteServiceAction` con ownership check. UI: `ServiceDeleteButton` cliente con `AlertDialog` de Radix (shadcn no tenía AlertDialog instalado), diálogo se mantiene abierto si la action devuelve error. 6 tests nuevos (5 del botón + 1 del listado). (2026-06-29)
    - [ ] **Refactor**: renombrar `createFirstServiceForProvider` a `createServiceForProvider` o similar — el "first" es histórico, la función ya se reutiliza fuera del onboarding.
  - [x] **Subir fotos del negocio** en `/panel/centro`: `ProviderPhotosCard` cablea el `PhotoUploader` compartido (bucket `provider-photos`) a server action `updateProviderPhotosAction` que reutiliza `updateProviderPhotos` del onboarding. Persiste `Provider.photos` con cada cambio (2026-06-12).
  - [x] **Card "Añadir otro negocio (Próximamente)"** en `/panel/centro` como señal de roadmap para multi-negocio (Fase 1). Botón deshabilitado con chip "Próximamente", mensaje neutro autónomo/centro (2026-06-12).
  - [ ] **Multi-negocio real**: implementar el alta de un segundo Provider asociado al mismo `User.id`. Afecta a `requireCurrentProvider` (hoy devuelve el primero) y al panel layout (necesita selector de negocio activo).
  - [x] **Acción "responder a reseña"** en `/panel/valoraciones` cableada via server action `replyToReviewAction` (reutiliza `replyToReview` del service) + nuevo Client Component `ReviewReplyForm` (estructura §6.bis, abre textarea inline al pulsar "Responder"; si ya hay `providerResponse` muestra card read-only). 4 tests UI (2026-06-29).
  - [x] **Persistencia del botón "Guardar"** en `/panel/centro` activada: nuevo módulo `lib/services/provider/` (separado de `provider-onboarding` y del `providers/` con fake-data) + `updateProviderSettingsAction`. `ProviderSettings` ahora Client Component con form controlado + `useTransition` + feedback real success/error. Descripción fusiona `LocalizedText` (mismo patrón que `updateServiceAction`). Inputs todavía no cubiertos (phone, email, ciudad/CP, horario) quedan `disabled` para señalar que aún no persisten. 6 tests del service (2026-06-29).
  - [ ] **Cálculo de ocupación** en `/panel` (dashboard) basado en `Professional.schedule` (horas trabajables / día) vs horas reservadas. Hoy queda en 0%.
  - [ ] **Cálculo timezone preciso** en panel/calendario y dashboard: hoy usamos límites semanales en UTC con desfase de 1-2h vs Madrid. Cuando llegue temporal-polyfill o equivalente, ajustar al lunes 00:00 Madrid exacto.
  - [~] Campos no recogidos en el wizard que el formulario de `/panel/centro` ya pinta vacíos con placeholder y necesitarán flujo: **horario semanal ya editable** (`ScheduleEditor` cablea a `Professional.schedule` del primer profesional via `updateProviderScheduleAction`, en paralelo con `updateProviderSettingsAction` desde el mismo botón Guardar — 2026-06-30); pendientes phone, email de contacto, city/postal separados. Decidir si city/postal se descomponen de `Provider.address` o se añaden como columnas extra. Para centros con N profesionales el editor edita el horario del **primer** professional (deuda multi-profesional explícita en la sección Multi-negocio).
- [x] Motor de scheduling (slots de disponibilidad reales) — `availability.service` con tests vía Prisma mockeado (2026-06-03). Falta conectar a UI y al panel del proveedor.
- [ ] Búsqueda geoespacial con PostGIS (consulta `ST_DWithin` en `providers.repository.findAll` cuando crezca el catálogo; hoy filtramos en Node con Haversine, suficiente <500 providers).
- [~] **`/buscar` sobre Postgres real (provisional)**: `providersRepository` y `providers.service` ahora leen `providers`/`services`/`reviews` reales vía raw SQL con `ST_X`/`ST_Y` para PostGIS + `array_agg` para categoryIds. Auto-approve `verificationStatus` en dev/preview (`VERCEL_ENV !== 'production'`), pending en prod. `getProviderDetail` paraleliza Provider + Services + Reviews + breakdown calculado en Node. `availability.status` queda en `'available_now'` placeholder hasta conectar motor real al listado público (sería N×M cascada). FTS de `lib/services/search` aún no se usa aquí — filter en Node hasta crecer catálogo. (2026-06-30)
- [~] Búsqueda con PostgreSQL full-text search (tsvector + pg_trgm para fuzzy matching).
  - [x] Migración `2_fts_search`: `search_vector` GENERATED STORED en `services` y `providers`, 2 triggers + `category_label_cache` para cross-table, 6 índices (2 GIN tsvector + 4 GIN trigram), spanish+simple combinados para multi-lengua es/ca (2026-06-09).
  - [x] Módulo `src/lib/services/search/` con `searchServices` / `searchProviders` (ranking 70% FTS + 30% trigram, validación Zod, 12 tests verde, 2026-06-09).
  - [x] Seed-dev con 36 services + 12 providers fake (`prisma/seed-dev.ts`, idempotente vía `ON CONFLICT (slug)`) + smoke script `scripts/search-smoke.ts` con 8 casos representativos: match directo, typo "masage"→"masaje", catalán, description hit, stemming "depilaciones"→"depilación", provider por nombre/dirección/typo. Todos devuelven rankings esperados (2026-06-09).
  - [x] API route `/api/search` (`GET ?type=services|providers&q&lang&limit&offset`) con validación Zod + cliente HTTP tipado en `src/lib/services/search/search.client.ts` + `SearchRequestError` (2026-06-09, 8 tests).
  - [x] API route `/api/suggestions` (`GET ?q&lang`) + módulo `src/lib/services/suggestions/` (service async, client HTTP, validation, errors). El service delega hoy en `searchSuggestions` fake; cuando llegue Postgres solo cambia esa función (2026-06-09, 7 tests).
  - [x] `SearchAutocomplete` cableado a `/api/suggestions` vía TanStack Query v5 (debounce 250ms en `debouncedValue`, `staleTime` 30s, `placeholderData` para evitar parpadeo, cancelación con `AbortSignal`) — `QueryProvider` montado en `[locale]/layout.tsx` entre NextIntl y Theme (2026-06-09).
  - [x] `getSuggestions` ahora consulta Postgres real: combina `searchServices` + `searchProviders` (FTS) + `suggestionsRepository.findCategoriesMatching` en paralelo con `Promise.all` (3 svc + 3 prov + 2 cat = top 8). Lookup batched O(1) de proveedores para enriquecer servicios. Query <2 chars devuelve `[]` sin tocar BD. `SearchValidationError` reempaquetado como `SuggestionsValidationError`. UI y endpoint intactos. 10 tests nuevos. El fake `searchSuggestions` queda sin uso productivo (sólo en su propio test) — limpieza posterior. (2026-06-29)
- [~] Flujo de reserva real con Stripe Connect.
  - [x] **Onboarding del provider a Stripe Connect (Express)** (2026-06-30): nuevo módulo `lib/services/payments/` con `ensureConnectAccount` (idempotente — reusa stripeAccountId si existe), `createOnboardingLink` (AccountLink temporal de Stripe, 5 min TTL), `getConnectAccountStatus` (consulta directa a Stripe, no cacheamos), `getProviderPaymentsStatus` (composición que la UI usa). Migración 7 añade `Provider.stripeAccountId String? @unique`. Server actions `startStripeOnboardingAction` (redirect al onboarding de Stripe) y `refreshStripeStatusAction`. Pages `/panel/centro/stripe/return` y `/refresh` como callbacks de Stripe (return redirige al panel, refresh regenera AccountLink). UI nuevo `StripeConnectCard` en `/panel/centro` con 3 estados (no conectado / pending / habilitado) + banner de retorno + tolerancia a fallo de Stripe sin tumbar la página. i18n 4 locales. 11 tests del service.
  - [ ] **Aplicar la migración 7 manualmente** en Supabase SQL Editor (la `DATABASE_URL` actual usa transaction pooler que no soporta DDL): pegar el contenido de `prisma/migrations/7_provider_stripe_account_id/migration.sql` y ejecutar.
  - [ ] **Env vars Stripe** en `.env.local` y en Vercel: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_CONNECT_CLIENT_ID` (este último necesario para Connect OAuth — ya configurado en el dashboard de Stripe Connect).
  - [ ] **Configurar return/refresh URLs** en Stripe Connect dashboard: `https://www.yaiwell.app/{locale}/panel/centro/stripe/{return,refresh}` (todos los locales soportados).
  - [ ] **Flujo de cobro real** (siguiente sesión): PaymentIntent + Stripe Elements al confirmar reserva, webhook `payment_intent.succeeded` → Booking a `confirmed`, comisión de plataforma via `application_fee_amount`.
- [~] Cancelación y refunds (política de 2h).
  - [x] Regla 2h en `booking.service.cancelBookingByProvider` (validada en Zod + servicio, no solo en UI) y antelación mínima 2h también en `createBooking` para que no nazcan reservas "incancelables" (2026-06-03).
  - [ ] Cliente puede cancelar (política TBD): full-refund hasta -2h, no-show sin refund (probable).
  - [ ] Refund automático íntegro al cliente vía Stripe Connect cuando la cancela el proveedor (pendiente `payments.service`).
  - [ ] UI: bloquear botón de cancelar a <2h en panel del proveedor.
- [~] Sistema de valoraciones (cliente → proveedor).
  - [x] `review.service.createReview` aplica regla §4.bis: solo cliente del booking, solo si `status=completed`, ventana 30 días desde `completedAt`, unicidad por booking (2026-06-03).
  - [x] `replyToReview` para que el proveedor responda a la reseña (2026-06-03).
  - [ ] UI: CTA "Valorar" solo visible cuando booking pasa a `completed` desde el panel.
  - [ ] Formulario de reseña (rating + texto + fotos opcionales).
- [ ] Notificaciones por email (Resend).
- [ ] 4 planes de suscripción con Stripe Billing.
- [ ] Onboarding de proveedor con formulario manual (jerarquía categoría → tipo → subtipo).
- [ ] Huecos sueltos con descuento automático.
- [ ] Multi-centro para empresarios.
- [ ] Panel de métricas para proveedores.
- [ ] Términos, política de privacidad, cookies, GDPR compliance.
- [ ] Tests E2E de los flujos críticos.
- [ ] **Pulido visual**: migrar `/cuenta` (`src/app/[locale]/cuenta/page.tsx`) de tokens `bg-stone-*` / `border-stone-*` / `text-stone-*` hardcoded a tokens semánticos shadcn (`bg-card`, `border-border/60`, `text-foreground`, `text-muted-foreground`, `bg-muted`). Detectado en auditoría P7 del 2026-06-11: divergencia visible al navegar `/panel` → `/cuenta` → `/mis-reservas` (los shells nuevos ya usan tokens semánticos, `/cuenta` se quedó con la paleta stone hardcoded heredada de Fase 0). Sin urgencia — no rompe nada, sólo coherencia.

---

## 📱 Fase 2 — Apps móviles (post-lanzamiento, presupuesto aparte)

- [ ] Setup React Native + Expo.
- [ ] Reutilizar tipos compartidos.
- [ ] Implementar flujos cliente.
- [ ] Implementar flujos proveedor.
- [ ] Push notifications.
- [ ] Apple Pay + Google Pay.
- [ ] Publicación App Store + Play Store.

---

## 🔮 Fase 3 — Futuro (requiere ingresos para justificar costes recurrentes)

- [ ] Sincronización Google/Outlook Calendar.
- [ ] Reservas recurrentes.
- [ ] Lista de espera.
- [ ] Mensajería interna cliente-profesional.
- [ ] Programas de fidelización.
- [ ] Políticas de cancelación personalizables por centro.
- [ ] Bonos / packs / multipase.
- [ ] Reserva grupal con división de pago.
- [ ] Walk-in tracking para gimnasios.
- [ ] Buscador semántico con embeddings (pgvector) si el volumen de catálogo lo justifica.
- [ ] Onboarding asistido por IA (foto del menú → extracción automática de servicios).

---

*Última actualización: 2026-06-30 (onboarding del provider a Stripe Connect Express; falta aplicar migración 7 y pegar env vars).*

