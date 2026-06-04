# Revisión final esqueleto Yaiwell — 2026-05-27

> Revisor: Round 4 agent (#10). Snapshot del repo en la rama `master` (commit inicial `f4f8e48`, equivalente al estado tras las rondas 1-3 en local).
> Esta revisión complementa — y NO duplica — `docs/audit-2026-05-27.md` (audit de responsive/a11y/i18n/SEO realizado en la Ronda 3 G3). Donde aplique, se referencia y se anota si el hallazgo del audit ha sido remediado en HEAD.

---

## Resumen ejecutivo

El esqueleto está en muy buena forma para cerrar Fase 0. Las cuatro validaciones automáticas (typecheck, lint, build, tests) pasan limpias, la cobertura de tests unitarios crece de forma sana (112 tests sobre 20 archivos), y las dos reglas de negocio críticas de `CLAUDE.md` §4.bis (cancelación 2h y valoración solo tras `completed`) están implementadas correctamente como funciones puras testeadas. La principal deuda heredada del audit anterior es **estructural en `lib/fake-data/*`**: varios módulos los consumen directamente las páginas y componentes, sin pasar por un repositorio, lo que multiplicará el coste del swap a Supabase en Fase 1. Tres tareas concretas (doble bottom nav en `/panel/*` móvil, nav duplicada en `AdminShell`, ausencia de `generateMetadata` en rutas indexables) siguen pendientes del audit y conviene cerrarlas antes de presentar a la cliente.

---

## Validaciones automáticas

Ejecutadas el 2026-05-27 sobre el HEAD revisado.

| Comando | Resultado | Notas |
|---|---|---|
| `npm run typecheck` (`tsc --noEmit`) | OK | sin errores ni warnings |
| `npm run lint` (`eslint`) | OK | sin advertencias |
| `npm run build` (`next build` con Turbopack) | OK | compila en 2.3 s; genera 25 páginas estáticas (sitemap y robots incluidos); las rutas `[locale]/*` salen como `ƒ` (dynamic) como se espera con `setRequestLocale` |
| `npm run test -- --run` (vitest) | OK | **20 archivos / 112 tests passing**, 4.5 s |

Tests E2E (Playwright) **no se ejecutan** en esta revisión por coste y porque la auditoría visual ya está cubierta por `docs/audit-2026-05-27.md` con inferencia estática.

---

## Hallazgos por severidad

### 🔴 Crítico (bloquea Fase 1)

Ninguno. No se detecta bloqueante técnico ni regulatorio para arrancar Fase 1.

### 🟠 Importante (recomendado antes de Fase 1)

1. **Fugas de `lib/fake-data/*` fuera del repositorio.** 44 ficheros importan directamente desde `@/lib/fake-data/...`, incluyendo páginas (`app/[locale]/admin/page.tsx`, `app/[locale]/mis-reservas/page.tsx`, `app/[locale]/panel/*`), componentes (`SearchView.tsx`, `Hero.logic.ts`, `BookingsList.logic.ts`, `WeeklyCalendar.*`, `FiltersBar.tsx`...) y sus tests. Solo el dominio `providers` está aislado correctamente vía `lib/services/providers/providers.repository.ts`. Cuando llegue Supabase, el swap exigirá tocar todos esos puntos en lugar de un único repositorio. **Acción recomendada antes de Fase 1**: replicar el patrón de `providers` para los dominios `bookings` (customer + panel), `categories`, `availability`, `reviews`, `verifications`, `panel-metrics`. Esfuerzo estimado: 1-2 días de refactor controlado, sin cambios de UI.
2. **Doble bottom nav en móvil bajo `/panel/*`.** `MobileNav` global (`bottom-0`) coexiste con `PanelLayout.bottomNav` (`bottom-20`) sin que el primero se oculte en rutas del panel. Audit ya lo señaló (§A.9) y no se ha corregido en HEAD: `src/components/shared/MobileNav/MobileNav.tsx:33-45` siempre renderiza. Fix: ocultar `MobileNav` si `usePathname()` empieza por `/panel` (~20 min).
3. **`AdminShell` nav duplicada.** `src/components/features/admin/AdminShell/AdminShell.tsx:34,37`: dos `<Link>` distintos (`admin-nav-dashboard` y `admin-nav-queue`) apuntan ambos a `/admin`. Audit ya lo señaló (§A.5). Definir destino real para "queue" (probablemente `/admin#verificaciones` o ruta nueva) o eliminar uno de los dos.
4. **`generateMetadata` solo en 3 rutas indexables.** `src/app/[locale]/page.tsx` (landing) y `src/app/[locale]/buscar/page.tsx` (búsqueda) no exportan `generateMetadata` propio. Heredan del layout (`title.template = '%s | Yaiwell'`) que sí está bien configurado, pero entonces ninguna de las dos rutas indexables aporta un `<title>` específico. Tras los SEO mocks de G2, conviene cerrar esta brecha antes de abrir el sitio a la cliente. Esfuerzo: 30 min cada una.
5. **`src/lib/fake-data/reviews.ts` (752 líneas), `services.ts` (443), `categories-hierarchy.ts` (296), `admin-verifications.ts` (288), `panel-bookings.ts` (284)** superan el umbral de ~250 líneas de §6.bis. Son datos, no lógica, pero al cablear Supabase deberían trocearse por categoría/tipo para reducir el ruido en revisiones y diffs. Esfuerzo: cuando se haga el swap, se resuelve solo.

### 🟡 Sugerencia (mejora continua)

6. **Acción "cancelar" no expuesta en panel del proveedor.** §4.bis exige que el proveedor pueda cancelar desde su panel (con bloqueo a < 2h). Hoy `WeeklyCalendar` muestra el estado `cancelled` pero no expone botón. Es coherente con Fase 0 (sin mutaciones reales) y `canCancelBooking` ya está listo para reutilizarse. Anotar en `TODO.md` para Fase 1.
7. **Acción "marcar como finalizado".** §4.bis dice que `completed` lo dispara el profesional desde su panel y es lo que desbloquea la valoración. No existe UI todavía para ese paso (esperado en Fase 0). Conviene añadirlo en `TODO.md` con prioridad alta para Fase 1 porque es el quid de la regla de valoración.
8. **Acción "Valorar".** El botón de `BookingCard` (`variant="pendingReview"`) hoy es decorativo (no hace nada al click). Suficiente para Fase 0; anotar TODO para Fase 1.
9. **`ThemeToggle.logic.tsx`** usa extensión `.tsx` en vez de `.ts` (convención §6.bis). Justificado porque exporta `ThemeProvider` con JSX, pero rompe el patrón uniforme. Alternativa: extraer el componente `ThemeProvider` a `ThemeProvider.tsx` y dejar el hook puro en `.logic.ts`.
10. **Fichero huérfano `.tmp-i18n-check.mjs`** en la raíz del repo (artefacto de validación de paridad de claves en esta revisión). No está commiteado pero conviene borrarlo manualmente o añadir `.tmp-*` a `.gitignore`.
11. **`prisma/` solo contiene `.gitkeep`.** Coherente con Fase 0 (sin schema), pero conviene crear el `schema.prisma` base aunque sea vacío al arrancar Fase 1, para no posponer el setup de Prisma + Supabase otra semana.
12. **`lib/integrations/` y `lib/db/` vacíos** (solo `.gitkeep`). Esperado. Anotar TODOs concretos por integración (Clerk, Stripe, Resend, Mapbox) con el orden recomendado para arranque de Fase 1.

---

## Coherencia con CLAUDE.md §6/§6.bis

| Regla | Estado |
|---|---|
| TypeScript strict, sin `any` | ✅ 0 ocurrencias de `: any`, `<any>` o `as any` en `src/` |
| No `localStorage`/`sessionStorage` | ✅ 1 sola mención en `lib/utils/theme.ts:4-8` y es comentario justificando el uso de cookie en lugar de localStorage |
| Sin `next/link` (usar `@/i18n/navigation`) | ✅ 0 ocurrencias de `from 'next/link'` |
| `params` y `searchParams` como Promise (Next.js 16) | ✅ 18/18 archivos de `app/` que tipan `params` lo hacen como `Promise<...>` |
| Estructura `.tsx` / `.styles.ts` / `.logic.ts` / `.types.ts` / `index.ts` | ✅ Aplicada en todas las features y shared; cada subcarpeta tiene `index.ts` |
| Comentarios en castellano explicando *por qué* | ✅ Excelente. Spot-check de 8 archivos (booking-cancellation, providers.service, BookingFlow, SkipToContent, BookingsList, BookingCard, PanelLayout, layout) confirma comentarios densos, justificando decisiones (por ejemplo "Necesario para habilitar el renderizado estático dependiente del locale" en layout.tsx:182) |
| Imports ordenados (externos → @/ → relativos) | ✅ Spot-check confirma. Sin desviaciones encontradas |
| Skip link en layout | ✅ `SkipToContent` integrado en `[locale]/layout.tsx:208` con `id="main"` en `<main>` |
| Validación con Zod en bordes | ✅ Ejemplo `providers.validation.ts`; pendiente extender a futuros services (review/booking) en Fase 1 |
| Errores tipados | ✅ `providers.errors.ts` con `InvalidSearchFiltersError`. Pendientes los del booking/review para Fase 1 |
| Ningún archivo > 250 líneas | ⚠️ 5 ficheros en `lib/fake-data/*` superan el umbral (ver §🟠 hallazgo 5). Datos, no lógica. El resto de `src/` cumple |
| Server Components por defecto | ✅ Mayoría de páginas y componentes son RSC. 52 ficheros marcan `'use client'`, todos con justificación clara (interactividad, hooks de navegador, eventos) |

### Hallazgos específicos sobre `'use client'`

Spot-check de 5 componentes con `'use client'`: en todos hay justificación válida (estado, `onMouseEnter`/`onClick`, hooks de cliente). El comentario superior del componente suele explicarlo (por ejemplo `ProviderCard.tsx:18-21`). Ningún hallazgo de uso innecesario.

---

## Reglas de negocio §4.bis

### Cancelación 2h

- **Centralizada** en `src/lib/utils/booking-cancellation.ts` con dos funciones puras (`canCancelBooking`, `getLeadTimeMs`) y constantes con nombre (`MIN_CANCELLATION_LEAD_MS`, `ACTIVE_STATUSES`).
- **Testeada** en `src/lib/utils/booking-cancellation.test.ts`: cubre umbral exacto, 1h59min (caso límite §4.bis), reservas iniciadas, estados `completed`/`cancelled`/`refunded`, y `getLeadTimeMs` signo.
- **Usada** desde `src/components/features/customer/BookingCard/BookingCard.tsx:52` (`cancellable = canCancelBooking(booking, now)`) que deshabilita el botón y renderiza `cancelBlockedHint` cuando aplica.
- **Texto i18n** del bloqueo presente en es/ca (`customerArea.actions.cancelBlockedHint`).
- **Pendiente** lado proveedor: el panel no expone aún botón de cancelar (Fase 1). Ver hallazgo 🟡 6.

### Valoración solo si `booking.status === 'completed'`

- **Lógica de partición** en `src/components/features/customer/BookingsList/BookingsList.logic.ts:32`: `pendingReview` solo incluye `status === 'completed' && !hasReview`.
- **UI condicionada**: `BookingCard.tsx:117` solo renderiza el CTA "Valorar" si `variant === 'pendingReview'`. Esta variante se asigna desde `BookingsList.tsx:64` exclusivamente al array `pendingReview`. El JSX no expone "Valorar" en ningún otro caso.
- **Texto i18n** del comportamiento presente en `customerArea.sections.pendingReview` (es/ca).
- **Pendiente**: acción real de marcar como "completed" desde el panel del proveedor (hallazgo 🟡 7). Mientras no exista, los bookings `completed` solo aparecen porque los fakedata los ponen así (`customer-bookings.ts:160-186`). Esto es aceptable para la demo de Fase 0.

### Cancelación lado proveedor

- Texto traducido (es/ca, namespaces `booking.cancellationPolicy` y `providerArea.metrics.cancellationRate`) refleja la política de 2h.
- Sin UI ni endpoint todavía (Fase 0). Anotación en TODO recomendada.

---

## i18n

La paridad es/ca está confirmada en `docs/audit-2026-05-27.md` §C.1 y refrendada por la coincidencia de líneas en `src/messages/`: ambos ficheros tienen exactamente **661 líneas**.

Hallazgos del audit C.2 (aria-labels hardcodeados en `LangSwitcher`, `ProviderHeader`, `ProviderGallery`) **están remediados en HEAD**: grep de los patrones `aria-label="Language"`, `aria-label="Valoración"`, `aria-label="Galería..."`, `aria-label="Foto..."` devuelve 0 ocurrencias.

Hallazgo nuevo en esta revisión: ninguno.

---

## Preparación para Fase 1 (Supabase swap)

### Lo que está bien preparado

- **Tipos de dominio compartidos** en `src/types/domain.ts` (150 líneas): `Provider`, `Service`, `Review`, etc. Listos para que Prisma genere clientes con tipos compatibles.
- **Patrón service/repository** ya aplicado correctamente para `providers`. Cada método del repositorio tiene comentado encima el equivalente Prisma (`prisma.provider.findUnique...`). Es el blueprint a replicar.
- **Errores tipados, validación Zod, contrato async** ya en su sitio para `providers`.
- **`canCancelBooking`** es lib pura y no requiere swap; servirá tanto al cliente como al endpoint de Fase 1.
- **`splitBookings`** es lib pura sobre el tipo `CustomerBooking`. Cuando ese tipo migre a la entidad real, basta sustituir la fuente de datos.

### Archivos a reemplazar / refactorizar

Por dominio, lo que toca crear / extender:

- `lib/services/bookings/` (no existe): mover `splitBookings` y la fuente de datos, exponer `getCustomerBookings()`, `getPanelBookings()`, `createBooking()`, `cancelBooking()`, `markCompleted()`.
- `lib/services/categories/`: hoy `lib/fake-data/categories.ts` y `categories-hierarchy.ts` se consumen directamente. Crear `categoriesRepository` + servicio.
- `lib/services/reviews/`: ídem para `lib/fake-data/reviews.ts`. Servicio debe validar la regla §4.bis al crear (FK obligatoria a un `Booking` `completed`, ventana 30 días).
- `lib/services/availability/`: `lib/fake-data/availability.ts` y `booking-slots.ts` deben moverse a un servicio que reciba el `professionalId` y resuelva slots reales con PostGIS + Bookings activos.
- `lib/services/verifications/` y `lib/services/admin-metrics/`: para los paneles internos.
- `lib/services/search-suggestions/`: hoy el autocomplete consume `lib/fake-data/search-suggestions.ts` directamente. Debe pasarse a un endpoint `pg_trgm` + `tsvector`.
- `prisma/schema.prisma`: crear con las entidades definidas en CLAUDE.md §4. Activar PostGIS extension.
- `lib/integrations/`: crear `clerk.ts`, `stripe.ts`, `resend.ts`, `mapbox.ts` con sus wrappers tipados.

### Contratos a respetar al hacer swap

- La función pública de cada service NO cambia de firma. Solo cambia el cuerpo del `repository`.
- `canCancelBooking` y `splitBookings` siguen siendo puras y no aceptan dependencias inyectadas.
- Tipos en `types/domain.ts` son la fuente de verdad; los modelos Prisma deben mapear hacia ellos (idealmente vía Pick/Omit o transformer dedicado).

---

## Conclusión y siguientes pasos

**¿Esqueleto listo para presentar a la cliente?** Sí, con las salvedades del bloque 🟠. Los 3 hallazgos importantes pendientes (doble bottom nav, `AdminShell` nav duplicada, `generateMetadata` en `/` y `/buscar`) son fixes de 15-30 min cada uno y mejoran sensiblemente la primera impresión.

**¿Qué bloquearía empezar Fase 1 esta misma semana?** Nada técnico. La validación automática pasa y la arquitectura está alineada con `CLAUDE.md`. El único trabajo previo recomendado es el **refactor de `fake-data` hacia repositorios** (1-2 días) para que el cableado de Supabase en Fase 1 sea quirúrgico en lugar de masivo.

**Plan sugerido para cerrar Fase 0 (medio día):**

1. Resolver los hallazgos 🟠 2-4 (~1 h).
2. Vaciar / borrar `.tmp-i18n-check.mjs` (10 s).
3. Reservar 1 día de "preparación Fase 1" para extraer los servicios listados en §Preparación para Fase 1, con tests cubriendo el contrato público.
4. Crear `prisma/schema.prisma` esqueleto con las entidades de §4 y abrir migraciones contra Supabase local.

A partir de ahí, Fase 1 arranca con superficie limpia.

---

*Revisión cerrada — 2026-05-27.*
