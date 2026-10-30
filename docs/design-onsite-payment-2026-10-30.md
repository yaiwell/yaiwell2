# Diseño: pago en el local, no presentados y sanciones (2026-10-30)

Reglas en CLAUDE.md §4.bis («Cancelación por el cliente, pago en el local y no presentados»). Decisiones del dev (2026-10-30): pago en el local **opcional por negocio**; reservas en el local sin cerrar se **completan solas a las 72 h**; no presentado en el local **sin comisión**; impago de comisiones → **se desactiva el pago en el local** hasta pagar.

## 1. Datos — migración `9f_onsite_payment_no_show`

- `bookings`:
  - enum `BookingPaymentMode` (`online`, `onsite`), columna `paymentMode NOT NULL DEFAULT 'online'`.
  - `noShowAt TIMESTAMP(3)`, `noShowMarkedBy TEXT` (User.id interno).
  - `CHECK ("paymentMode" = 'online' OR "stripePaymentIntentId" IS NULL)`.
  - Nuevo estado `ALTER TYPE "BookingStatus" ADD VALUE 'no_show'`. No usarlo en la misma migración (un CHECK que lo use iría en `9g_`).
- `client_sanctions` (RLS sin policies + REVOKE a anon/authenticated): `id TEXT PK`, `userId` FK users RESTRICT, `bookingId TEXT UNIQUE` FK bookings RESTRICT, `reason TEXT` (`'no_show'`), `occurredAt` (= startAt), `revokedAt`, `revokedBy`, `revokeReason`, `createdAt`, `updatedAt`. Índice `(userId, occurredAt) WHERE revokedAt IS NULL`.
- `onsite_commission_charges` (RLS igual): `id`, `bookingId UNIQUE`, `providerId` FK, `amountCents CHECK >= 0`, enum `status` (`pending|itemized|invoiced|paid|failed|void`), `stripeInvoiceItemId UNIQUE NULL`, `stripeInvoiceId`, `itemizedAt`, `invoicedAt`, `paidAt`, `lastErrorAt`, `lastError`, `createdAt`, `updatedAt`. Índices `(status, createdAt)`, `(providerId, status)`, `(stripeInvoiceId)`.
- `provider_billing`: `onsitePaymentMethodReadyAt`, `lastCommissionInvoicePeriod TEXT` (`YYYY-MM`), `commissionDebtSince`.
- `providers`: `acceptsOnsitePayment BOOLEAN NOT NULL DEFAULT false` (público a propósito).
- El bloqueo de 3 meses **se calcula** (`computeOnlineOnlyUntil`), no se guarda.

Al añadir `no_show` hay que repasar: `checkout.charge-refunded.service.ts` (`REFUNDABLE_STATUSES` incluye `no_show`), `dashboard-metrics.service.ts`, `admin-metrics.service.ts`, `WeeklyCalendar.types.ts`, `PanelBookingActionStatus`, `BookingCard`, fake-data y etiquetas i18n.

## 2. Reserva en el local

- Nace `confirmed`, sin PaymentIntent ni retención, en la transacción con `lockProfessional` + `findOverlapping`; un 23P01 (`isExclusionViolation`) → `SlotUnavailableError`.
- `createBooking` acepta `{ paymentMode }`; `bookingRepository.create` recibe `status` y `paymentMode`.
- `checkout.onsite.service.ts` → `createOnsiteBooking(input, clientId, now)`: Zod → `!isLastMinuteAtCreation(slotStart, now)` (2h00 permitido) → negocio `acceptsOnsitePayment && onsitePaymentMethodReadyAt && !commissionDebtSince` → cliente no bloqueado (`getClientOnsiteEligibility`) → crear. Error `OnsitePaymentNotAllowedError(reason: 'last_minute'|'provider'|'client_restricted', restrictedUntil?)`.
- Acciones en `reservar/onsite-actions.ts`: `createOnsiteBookingAction({ serviceId, slotStartIso, notes, replacesPendingBookingId? })` (si había una `pending` propia, la cancela antes con `cancelBookingByClientWithRefund`) y `getPaymentOptionsAction` (`onsite: available|last_minute|client_restricted|not_offered`, `restrictedUntil?`).
- UI: `PaymentMethodPicker` en el paso de resumen (antes de crear nada), `OnsiteConfirmPanel` (importe a pagar en el local, cancelación gratis hasta 2 h, aviso de sanción), `BookingConfirmation` «Pagarás X € en el local». Borrador persistido con `paymentMethod`.
- Avisos: confirmación al crear (cliente: paga en el local + aviso de no presentado; negocio: cobra X €, comisión Y € en la factura mensual); línea en el recordatorio; la cancelación del cliente sin cobro dice «sin cargo».

## 3. No presentado y sanciones

- `booking.no-show.service.ts` → `markBookingNoShow(bookingId, providerUserId, now)`: propiedad del negocio, `confirmed`, `now >= startAt`, `now <= startAt + 72 h` (`src/lib/utils/booking-no-show.ts`). Errores `BookingNotStartedError`, `NoShowWindowClosedError`.
- Transacción: `updateMany where { id, status: 'confirmed' }` → `no_show`, `noShowAt`, `noShowMarkedBy`; si 0 filas → `BookingNotConfirmedError`. Si `onsite`: `INSERT client_sanctions ... ON CONFLICT (bookingId) DO NOTHING`.
- Deshacer por el negocio en 24 h (`undoNoShow`): vuelve a `completed`? No: vuelve a `confirmed` y revoca la sanción; si ya pasó la ventana de 72 h, la completa. Después de 24 h solo soporte (`revokeSanction` en `/admin`).
- `markBookingCompleted` pasa a escritura condicional; si `onsite`, inserta en `onsite_commission_charges` en la misma transacción.
- Auto-completar a las 72 h (online y en el local, decidido 2026-10-30): el cron diario completa las `confirmed` con `startAt + 72 h < now` (misma escritura condicional + cola de comisión) y manda la invitación a valorar.
- Módulo `src/lib/services/sanctions/` (`sanctions.calc.ts` puro con `computeOnlineOnlyUntil`, repository, service: `getClientOnsiteEligibility`, `listActiveSanctions`, `revokeSanction`).
- `computeOnlineOnlyUntil`: para cada sanción i ≥ 3 (ordenadas), si `s[i] − s[i−2] ≤ 12 meses`, bloqueo hasta `max(bloqueo, s[i] + 3 meses)`; las de más de 12 meses no cuentan; las revocadas tampoco.
- Panel: `markNoShowAction` / `undoNoShowAction` con `resolveProviderOwner`; botón «No se presentó» con diálogo (sanción si era en el local / sin devolución si online); etiqueta «Pago en el local».
- Aviso al cliente `notifyBookingNoShow` (clave `no-show/<id>`): online → sin devolución; local → «1 sanción (n de 3 en 12 meses)» y, si salta, «hasta el dd/mm solo podrás pagar online»; enlace a soporte.
- `/mis-reservas`: etiqueta `no_show`, «Pago en el local», aviso de bloqueo activo.

## 4. Comisión de reservas en el local completadas

- `billing.commission.itemize.ts`: `invoiceItems.create({ customer, amount, currency: 'eur', description, tax_rates: [IVA 21 % inclusivo], metadata: { kind: 'onsite_commission', bookingId, providerId } }, { idempotencyKey: 'onsite-commission:<bookingId>' })` → `itemized`; si falla queda `pending` y reintenta el cron.
- Negocios con suscripción viva: los conceptos entran solos en la siguiente factura (no asociar a `subscription`).
- Negocios sin suscripción: en el cron diario (`Promise.allSettled`), paso a) reintentar `pending`; paso b) si `lastCommissionInvoicePeriod < periodo actual` (Madrid), `invoices.create({ customer, collection_method: 'charge_automatically', pending_invoice_items_behavior: 'include', auto_advance: true }, { idempotencyKey: 'onsite-commission-invoice:<providerId>:<YYYY-MM>' })` + `finalizeInvoice`; borrador vacío → borrar. Presupuesto ~30 s y tope por ejecución.
- Webhooks: añadir `invoice.finalized`, `invoice.marked_uncollectible`, `invoice.voided`; para facturas con líneas de comisión (líneas en `line.parent.invoice_item_details.invoice_item` con API dahlia) marcar `invoiced|paid|failed`; `payment_failed` → `commissionDebtSince` (desactiva el pago en el local) y aviso `notifyCommissionPaymentFailed`; `paid` lo limpia.
- `billing.setup.ts`: `createOnsiteSetupSession(providerId)` (Checkout `mode: 'setup'`, `metadata.kind = 'onsite_setup'`); en `checkout.session.completed` con `mode === 'setup'` fijar `invoice_settings.default_payment_method` y `onsitePaymentMethodReadyAt`. UI en `/panel/plan`: tarjeta «Cobro en el local» con interruptor, «Añadir método de pago» y aviso de deuda.

## 5. Piezas

- **A · Datos y dominio** (primero; migración revisada por `db-migration-guard` y aplicada): §1, utils, `sanctions/*`, booking (createBooking con paymentMode, completed condicional + cola, no-show), `checkout.onsite.service.ts`, ajustes de `no_show` en servicios.
- **B · Pagos y Billing** (`stripe-payments`, tras A, en paralelo con C): §4, cron, setup, webhook.
- **C · UI, i18n y correos** (tras A, en paralelo con B): §2 UI, §3 panel y `/mis-reservas`, plantillas y textos.
- Cierre: P10 + P15. Pasos manuales: aplicar 9f; añadir los 3 eventos de factura al webhook; revisar reintentos de facturas sueltas en Stripe; actualizar `/terminos` (pago en el local, sanciones, comisión al negocio).
