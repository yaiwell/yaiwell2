# TODO.md — Beauly

> Lista viva de tareas pendientes. Cuando se completa una tarea, se mueve a `DO.md` con fecha.
> Nuevas tareas descubiertas durante el trabajo se añaden aquí antes de continuar.
> Orden: de arriba abajo por prioridad dentro de cada bloque.

---

## 🚧 Fase 0 — Esqueleto visual + infraestructura (2 semanas)

### Bloque A — Bootstrapping del repo

✅ Bloque A completado el 2026-05-20.

### Bloque B — Infraestructura real (sin lógica todavía)

- [ ] Crear proyecto en Supabase Cloud.
- [ ] Activar extensiones: `postgis`, `pg_trgm`, `uuid-ossp`.
- [ ] Configurar Supabase local con Docker (`supabase init` + `supabase start`).
- [ ] Instalar Prisma y conectar a Supabase.
- [ ] Crear `prisma/schema.prisma` con entidades base (User, Provider, Professional, Category, Service, Booking, Review, Plan, VerificationRequest). Sin RLS todavía, solo schema.
- [ ] Generar primera migración y aplicar a local + remoto.
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

- [ ] Definir paleta de colores (CSS variables en `globals.css`).
- [ ] Definir tipografías (importar de Google Fonts via `next/font`).
- [ ] Configurar tokens en `tailwind.config.ts`.
- [ ] Crear componentes shadcn/ui necesarios: Button, Card, Input, Badge, Avatar, Dialog, Sheet, Tabs, Skeleton, Toast.
- [ ] Crear componentes propios: `Header`, `Footer`, `MobileNav`, `CategoryPill`, `ProviderCard`, `ServiceCard`, `AvailabilityBadge`, `RatingStars`.
- [ ] Crear página de prueba `/_design-system` listando todos los componentes.

### Bloque D — Datos fake creíbles

- [ ] Crear `src/lib/fake-data/` con generadores tipados.
- [ ] Generar 10 proveedores fake repartidos por Barcelona (categorías mezcladas).
- [ ] Generar 30-40 servicios fake con descripciones realistas.
- [ ] Generar disponibilidad fake creíble (slots libres y ocupados).
- [ ] Generar 50-100 reseñas fake con nombres y textos variados.
- [ ] Imágenes via Unsplash con URLs estables (categorizar por tipo de negocio).

### Bloque E — Vistas públicas navegables

- [ ] Landing pública (`/`) con hero, propuesta de valor, categorías destacadas, footer.
- [ ] Listado de búsqueda (`/buscar`) con filtros, lista de resultados y mapa lateral.
- [ ] Mapa interactivo con pines de colores (verde/ámbar/gris) según disponibilidad.
- [ ] Toggle "Solo disponibles ahora" en filtros.
- [ ] Ficha de proveedor (`/centro/[slug]-[id]`) con galería, servicios, valoraciones, mapa, info.
- [ ] Ficha de servicio individual con descripción, profesional asignado, precio, duración, cláusulas.
- [ ] Selector de slot disponible (calendario simple navegable).
- [ ] Flujo de "reserva" simulado: confirmar datos → resumen → "pago" (mock) → confirmación.
- [ ] Buscador principal con input grande, sugerencias mientras escribes (autocomplete con resultados fake), filtros activos en chips.
- [ ] Página 404 personalizada.

### Bloque F — Áreas privadas (mock visual)

- [ ] Layout de área cliente (`/mis-reservas`) con próximas reservas, historial, valoraciones pendientes.
- [ ] Layout de área proveedor (`/panel`) con:
  - [ ] Dashboard con métricas fake (ingresos semana, reservas, ticket medio, ocupación).
  - [ ] Calendario semanal con reservas fake.
  - [ ] Listado de servicios ofrecidos.
  - [ ] Pantalla de "añadir servicio" con jerarquía categorías → tipos → subtipos.
  - [ ] Pantalla de configuración del centro.
  - [ ] Vista de valoraciones recibidas.
- [ ] Layout de área admin (`/admin`) con:
  - [ ] Cola de verificaciones de proveedores pendientes.
  - [ ] Ficha de verificación con documentos y botones aprobar/rechazar.
  - [ ] Métricas globales fake.

### Bloque G — Pulido final del esqueleto

- [ ] Microinteracciones (transitions, hovers, loading states).
- [ ] Modo oscuro funcional.
- [ ] Responsive perfecto en 375px / 768px / 1024px / 1440px.
- [ ] SEO básico (meta tags, OG image, sitemap).
- [ ] Verificar Lighthouse: Performance > 90, Accessibility > 95.
- [ ] Verificar que todo el texto está en es/ca (cambio de idioma funciona).
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
- [ ] Motor de scheduling (slots de disponibilidad reales).
- [ ] Búsqueda geoespacial con PostGIS.
- [ ] Búsqueda con PostgreSQL full-text search (tsvector + pg_trgm para fuzzy matching).
- [ ] Flujo de reserva real con Stripe Connect.
- [ ] Cancelación y refunds (política de 2h).
- [ ] Sistema de valoraciones (cliente → proveedor).
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

*Última actualización: 2026-05-20.*
