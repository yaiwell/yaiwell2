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
- [ ] Configurar RLS policies por tabla (pendiente para cuando Clerk sync exista).
- [ ] Crear proyecto en Clerk (modo desarrollo).
- [ ] Integrar Clerk en Next.js (middleware + ClerkProvider).
- [ ] Definir los 3 roles en Clerk: `client`, `provider`, `admin`.
- [ ] Crear webhook handler vacío en `/api/webhooks/clerk` para sync futuro.
- [ ] Crear cuenta Stripe (modo test) + activar Stripe Connect.
- [ ] Crear webhook handler vacío en `/api/webhooks/stripe`.
- [ ] Crear cuenta Resend + verificar dominio para emails.
- [ ] Crear cuenta Mapbox + obtener token público.
- [ ] Crear cuenta Sentry + integrar SDK en Next.js.

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

- [ ] Auth real con Clerk + sync a Supabase via webhook.
- [ ] Onboarding de cliente.
- [ ] Onboarding de proveedor con verificación.
- [ ] Panel admin con cola de verificación real.
- [ ] Sistema de servicios con jerarquía de categorías editable.
- [x] Motor de scheduling (slots de disponibilidad reales) — `availability.service` con tests vía Prisma mockeado (2026-06-03). Falta conectar a UI y al panel del proveedor.
- [ ] Búsqueda geoespacial con PostGIS.
- [ ] Búsqueda con PostgreSQL full-text search (tsvector + pg_trgm para fuzzy matching).
- [ ] Flujo de reserva real con Stripe Connect.
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

*Última actualización: 2026-06-03 (domain layer Fase 1: availability + booking + review services con tests, 181/181 verde).*

