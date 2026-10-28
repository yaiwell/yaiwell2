import path from 'node:path';

import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright';
import { expect, test, type Page } from '@playwright/test';
import dotenv from 'dotenv';
import type { Client } from 'pg';

import es from '../../src/messages/es.json';
import { getMadridWeekStartKey } from '../../src/lib/utils/madrid-week';
import {
  disconnectPrisma,
  ensureTestProviderInternalUser,
  ensureTestProviderRole,
} from './utils/clerk-test-user';
import {
  HOUR_MS,
  MARK,
  SERVICE_MINUTES,
  SERVICE_PRICE_CENTS,
  connectDb,
  getStripe,
  insertSyntheticBooking,
  seedCenter,
  teardownCenter,
  type SeededCenter,
} from './utils/slot-offers-seed';

/**
 * E2E de «huecos liberados con descuento» (CLAUDE.md §4.bis):
 * panel (cancelar -> liberar -> bloque discontinuo), buscador/ficha
 * (etiqueta y filtro), selector de hora, reserva con precio congelado
 * (BD + PaymentIntent de Stripe en test), retirar y seguridad del tramo.
 *
 * Usuario: el provider de pruebas ya existente (`CLERK_TEST_PROVIDER_*`),
 * que también hace de cliente (no se crea nada en Clerk). Se siembra un
 * centro propio con cuenta Connect de TEST y se borra todo por id.
 * No se paga: el Payment Element no se rellena.
 */

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const PANEL = es.providerPanel.calendar;
const OFFERS = PANEL.slotOffers;
const CAL = '/es/panel/calendario';
const TZ = 'Europe/Madrid';
const STEP_MS = 30 * 60_000;

test.use({ locale: 'es-ES', timezoneId: TZ, navigationTimeout: 120_000 });
test.setTimeout(240_000);
test.describe.configure({ mode: 'serial' });

let db: Client;
let c: SeededCenter;
let seeded = false;
let startA: Date;
let sourceBookingId = '';
let offerAId = '';
let offerBId = '';

const dc = (page: Page, id: string) => page.locator(`[data-component="${id}"]`);
const hm = new Intl.DateTimeFormat('es-ES', {
  timeZone: TZ,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: TZ });
const label = (d: Date) => hm.format(d);
const slotTestId = (d: Date) => `booking-slot-picker-slot-${label(d).replace(':', '')}`;
const pctRe = (pct: number) => new RegExp(`${pct}\\s*%`);
const money = (cents: number) =>
  new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2 }).format(cents / 100);
/** Etiqueta de oferta de nuestro centro en el listado (hermana de la card, enlaza a reservar). */
const offerTagOf = (page: Page) =>
  page.locator(`a[data-component="provider-card-slot-offer"][href*="${c.slugWithId}"]`).first();
const reserveUrl = (slot: Date) =>
  `/es/centro/${c.slugWithId}/reservar?serviceId=${c.serviceId}&slot=${encodeURIComponent(slot.toISOString())}`;

/** Primera hora de la rejilla de 30 min a >= +4 h, lejos de la medianoche (etiquetas 23:30/00:00). */
function pickOfferStart(): Date {
  let t = Math.ceil((Date.now() + 4 * HOUR_MS) / STEP_MS) * STEP_MS;
  while (['23:30', '00:00', '00:30'].includes(label(new Date(t)))) t += STEP_MS;
  return new Date(t);
}

/** Aplica la fórmula de CLAUDE.md §4.bis al precio del servicio. */
const discounted = (pct: number) => Math.round((SERVICE_PRICE_CENTS * (100 - pct)) / 100);

async function apiSlots(page: Page, day: Date) {
  const res = await page.request.get(
    `/api/availability/services/${c.serviceId}?date=${ymd.format(day)}`,
  );
  expect(res.ok()).toBe(true);
  return (
    (await res.json()) as {
      slots: Array<{
        startAtIso: string;
        offer?: { discountPct: number; priceCents: number; originalPriceCents: number };
      }>;
    }
  ).slots;
}

/** Recorre el selector -> resumen -> checkout con el hueco ya preseleccionado en la URL. */
async function reachCheckout(page: Page, slot: Date) {
  await page.goto(reserveUrl(slot));
  const slotButton = dc(page, slotTestId(slot));
  await expect(slotButton).toHaveAttribute('aria-pressed', 'true', { timeout: 30_000 });
  await dc(page, 'booking-flow-next').click();
  await expect(dc(page, 'booking-summary')).toBeVisible();
  await dc(page, 'booking-summary-notes').fill(MARK);
}

async function submitToPayment(page: Page) {
  await dc(page, 'booking-flow-next').click();
  await expect(dc(page, 'booking-stripe-payment')).toBeVisible({ timeout: 60_000 });
}

async function bookingAt(startAt: Date) {
  const { rows } = await db.query(
    `SELECT * FROM bookings WHERE "providerId" = $1 AND "startAt" = $2 AND "clientId" = $3
       AND id <> $4 AND status IN ('pending','confirmed') ORDER BY "createdAt" DESC`,
    [c.providerId, startAt.toISOString(), c.userId, sourceBookingId],
  );
  return rows[0];
}

test.beforeAll(async () => {
  test.setTimeout(240_000);
  if (!process.env.CLERK_SECRET_KEY?.startsWith('sk_test_')) {
    throw new Error('CLERK_SECRET_KEY no es de test; abortamos.');
  }
  getStripe(); // aborta si la clave no es sk_test_
  await ensureTestProviderRole();
  await ensureTestProviderInternalUser();

  db = await connectDb();
  const user = await db.query('SELECT id FROM users WHERE email = $1', [
    process.env.CLERK_TEST_PROVIDER_EMAIL,
  ]);
  c = await seedCenter(db, user.rows[0].id);
  seeded = true;

  startA = pickOfferStart();
  sourceBookingId = await insertSyntheticBooking(db, c, startA, 'confirmed');
});

test.afterAll(async () => {
  try {
    const problems = await teardownCenter(db, seeded ? c : null);
    if (problems.length) console.warn('[slot-offers] limpieza con avisos:', problems);
  } finally {
    await db?.end().catch(() => undefined);
    await disconnectPrisma();
  }
});

test.beforeEach(async ({ page }) => {
  await setupClerkTestingToken({ page });
  await page.goto('/es/entrar', { waitUntil: 'domcontentloaded' });
  await clerk.signIn({ page, emailAddress: process.env.CLERK_TEST_PROVIDER_EMAIL! });
});

test('1. panel: cancelar una reserva sin PaymentIntent ofrece liberar el hueco y publica la oferta', async ({
  page,
}) => {
  await page.goto(`${CAL}?semana=${getMadridWeekStartKey(startA)}`);

  // La reserva sintética sale en el listado; la cancelamos desde ahí.
  const cancelBtn = dc(page, `booking-actions-cancel-${sourceBookingId}`).first();
  await expect(cancelBtn).toBeEnabled();
  await cancelBtn.click();
  await dc(page, `booking-actions-cancel-confirm-${sourceBookingId}`).click();

  const dialog = page.getByRole('dialog', { name: OFFERS.releaseTitle });
  await expect(dialog).toBeVisible();
  // Tramos por defecto de una reserva cancelada: 10 / 20 / 30.
  await expect(dc(page, 'release-slot-tier-over2h')).toContainText(pctRe(10));
  await expect(dc(page, 'release-slot-tier-oneToTwoHours')).toContainText(pctRe(20));
  await expect(dc(page, 'release-slot-tier-underOneHour')).toContainText(pctRe(30));

  await dc(page, 'release-slot-submit').click();
  await expect(dc(page, 'release-slot-success')).toBeVisible();
  // Tras publicar, el título del diálogo cambia: se localiza por su marca.
  await dc(page, 'release-slot-dialog').getByRole('button', { name: OFFERS.close }).click();

  const { rows } = await db.query('SELECT * FROM slot_offers WHERE "sourceBookingId" = $1', [
    sourceBookingId,
  ]);
  expect(rows).toHaveLength(1);
  const offer = rows[0];
  offerAId = offer.id;
  expect(offer.status).toBe('active');
  expect(offer.providerId).toBe(c.providerId);
  expect(offer.professionalId).toBe(c.professionalId);
  expect(offer.serviceId).toBe(c.serviceId);
  expect([offer.discountPctOver2h, offer.discountPct1To2h, offer.discountPctUnder1h]).toEqual([
    10, 20, 30,
  ]);
  expect(offer.startAt.getTime()).toBe(startA.getTime());
  expect(offer.endAt.getTime()).toBe(startA.getTime() + SERVICE_MINUTES * 60_000);
  expect(offer.expiresAt.getTime()).toBe(startA.getTime() - 30 * 60_000);

  const cancelled = await db.query('SELECT status FROM bookings WHERE id = $1', [sourceBookingId]);
  expect(cancelled.rows[0].status).toBe('cancelled');

  // El calendario pinta el bloque discontinuo de la oferta (a +4 h el tramo es el de >2 h).
  const block = dc(page, `weekly-calendar-offer-${offerAId}`);
  await expect(block).toBeVisible();
  await expect(block).toContainText(OFFERS.block.label.replace('{pct}', '10'));
  await block.click();
  const price = dc(page, `weekly-calendar-offer-price-${offerAId}`);
  await expect(price).toContainText(money(discounted(10)));
  await expect(price).toContainText(money(SERVICE_PRICE_CENTS));
});

test('2. cliente: buscador, filtro «Con descuento», ficha y selector de hora muestran la oferta', async ({
  page,
}) => {
  // Coherencia UI <-> servidor: la API de huecos marca la oferta y no marca el vecino.
  const slots = await apiSlots(page, startA);
  const offered = slots.find((s) => new Date(s.startAtIso).getTime() === startA.getTime());
  expect(offered?.offer).toEqual({
    discountPct: 10,
    priceCents: discounted(10),
    originalPriceCents: SERVICE_PRICE_CENTS,
  });

  const others = await db.query(
    `SELECT count(*)::int AS n FROM slot_offers WHERE status = 'active' AND "providerId" <> $1`,
    [c.providerId],
  );

  // Buscador: pulsamos el filtro y la URL pasa a ?discount=1.
  await page.goto('/es/buscar');
  const toggle = page.getByRole('button', { name: es.search.slotOffer.filterToggle }).first();
  await expect(toggle).toBeEnabled();
  await toggle.click();
  await expect(page).toHaveURL(/discount=1/);

  const card = dc(page, `provider-card-${c.slug}`).first();
  await expect(card).toBeVisible({ timeout: 30_000 });
  // La etiqueta es hermana de la card (no puede anidar enlaces): se localiza por su href.
  const tag = offerTagOf(page);
  await expect(tag).toContainText(pctRe(10));
  await expect(tag).toContainText(label(startA));
  if (others.rows[0].n === 0) {
    // Ningún otro centro tiene oferta: el filtro deja solo el nuestro.
    await expect(dc(page, 'provider-card-slot-offer')).toHaveCount(1);
  }

  // Ficha del centro con la misma etiqueta; su enlace lleva al hueco preseleccionado.
  await page.goto(`/es/centro/${c.slugWithId}`);
  const headerTag = dc(page, 'provider-header-slot-offer');
  await expect(headerTag).toContainText(pctRe(10));
  await headerTag.click();
  await expect(page).toHaveURL(/\/reservar\?/);
  const url = new URL(page.url());
  expect(url.searchParams.get('serviceId')).toBe(c.serviceId);
  expect(new Date(url.searchParams.get('slot')!).getTime()).toBe(startA.getTime());

  // Selector: hueco preseleccionado, con la marca «−10 %»; el vecino no la tiene.
  const slotButton = dc(page, slotTestId(startA));
  await expect(slotButton).toHaveAttribute('aria-pressed', 'true', { timeout: 30_000 });
  await expect(slotButton).toHaveAttribute('data-offer', 'true');
  await expect(slotButton.locator('[data-component="booking-slot-picker-slot-offer"]')).toHaveText(
    es.booking.slotOffer.discountBadge.replace('{pct}', '10'),
  );
  const neighbour = new Date(startA.getTime() + 2 * STEP_MS);
  if (ymd.format(neighbour) === ymd.format(startA)) {
    await expect(dc(page, slotTestId(neighbour))).not.toHaveAttribute('data-offer', 'true');
  }
});

test('3. reserva: el servidor congela precio -10 %, referencia, comisión sobre lo cobrado y PaymentIntent', async ({
  page,
}) => {
  await reachCheckout(page, startA);

  // Resumen: precio previsto con el de referencia tachado.
  await expect(dc(page, 'booking-summary-total-original')).toContainText(
    money(SERVICE_PRICE_CENTS),
  );
  await expect(dc(page, 'booking-summary-total')).toContainText(money(discounted(10)));
  await expect(dc(page, 'booking-summary-estimate-hint')).toBeVisible();

  await submitToPayment(page);
  await expect(dc(page, 'booking-stripe-payment-amount-original')).toContainText(
    money(SERVICE_PRICE_CENTS),
  );
  await expect(dc(page, 'booking-stripe-payment-amount')).toContainText(money(discounted(10)));

  const b = await bookingAt(startA);
  expect(b.status).toBe('pending');
  expect(b.priceCents).toBe(discounted(10));
  expect(b.originalPriceCents).toBe(SERVICE_PRICE_CENTS);
  expect(b.discountPct).toBe(10);
  expect(b.slotOfferId).toBe(offerAId);
  expect(b.commissionCents).toBe(Math.floor((b.priceCents * c.commissionRateBps) / 10_000));

  const intent = await getStripe().paymentIntents.retrieve(b.stripePaymentIntentId);
  expect(intent.amount).toBe(b.priceCents);
  expect(intent.application_fee_amount).toBe(b.commissionCents);
  expect(intent.currency).toBe('eur');
  expect(intent.transfer_data?.destination).toBe(c.stripeAccountId);
});

test('4. retirar: un hueco libre de las próximas 2 h se libera, sale en /buscar y al retirarlo desaparece', async ({
  page,
}) => {
  // Aislamos este paso de la oferta A (ya vendida, con la reserva `pending` que
  // la oculta solo durante 30 min de retención): la damos de baja por BD.
  await db.query(
    `UPDATE slot_offers SET status = 'withdrawn', "withdrawnAt" = now() WHERE id = $1`,
    [offerAId],
  );

  await page.goto(CAL);
  const section = dc(page, 'free-slots-section');
  await expect(section).toBeVisible();
  const releaseButtons = page.locator('[data-component^="free-slot-release-"]');
  await expect(releaseButtons.first()).toBeVisible();
  // El último de la lista es el que más tiempo de oferta deja (expira 30 min antes del inicio).
  const last = releaseButtons.last();
  const startB = new Date(
    ((await last.getAttribute('data-component')) ?? '').replace(
      `free-slot-release-${c.serviceId}-`,
      '',
    ),
  );
  expect(Number.isNaN(startB.getTime())).toBe(false);
  expect(startB.getTime() - Date.now()).toBeLessThan(2 * HOUR_MS);
  await last.click();

  const dialog = page.getByRole('dialog', { name: OFFERS.releaseFreeTitle });
  await expect(dialog).toBeVisible();
  await dc(page, 'release-slot-submit').click();
  await expect(dc(page, 'release-slot-success')).toBeVisible();
  // Tras publicar, el título del diálogo cambia: se localiza por su marca.
  await dc(page, 'release-slot-dialog').getByRole('button', { name: OFFERS.close }).click();

  const { rows } = await db.query(
    `SELECT * FROM slot_offers WHERE "providerId" = $1 AND "sourceBookingId" IS NULL AND status = 'active'`,
    [c.providerId],
  );
  expect(rows).toHaveLength(1);
  const offerB = rows[0];
  offerBId = offerB.id;
  expect(offerB.startAt.getTime()).toBe(startB.getTime());
  expect(offerB.discountPctOver2h).toBe(0);
  expect(offerB.expiresAt.getTime()).toBe(startB.getTime() - 30 * 60_000);

  // En /buscar sale con el % del tramo vigente (>= 1 h -> 20 %, < 1 h -> 30 %).
  const pctNow = startB.getTime() - Date.now() >= HOUR_MS ? 20 : 30;
  await page.goto('/es/buscar?discount=1');
  const tag = offerTagOf(page);
  await expect(tag).toBeVisible({ timeout: 30_000 });
  await expect(tag).toContainText(label(startB));
  await expect(tag).toContainText(pctRe(pctNow));

  // Retirar desde el bloque del calendario.
  await page.goto(`${CAL}?semana=${getMadridWeekStartKey(startB)}`);
  await dc(page, `weekly-calendar-offer-${offerBId}`).click();
  await dc(page, `weekly-calendar-offer-withdraw-${offerBId}`).click();
  await expect
    .poll(
      async () =>
        (await db.query('SELECT status FROM slot_offers WHERE id = $1', [offerBId])).rows[0].status,
    )
    .toBe('withdrawn');
  const withdrawn = await db.query('SELECT "withdrawnAt" FROM slot_offers WHERE id = $1', [
    offerBId,
  ]);
  expect(withdrawn.rows[0].withdrawnAt).not.toBeNull();

  // Ya no sale: ni con el filtro, ni en la ficha, ni en la API del selector.
  await page.goto('/es/buscar?discount=1');
  await expect(
    page.getByRole('button', { name: es.search.slotOffer.filterToggle }).first(),
  ).toBeVisible();
  await expect(dc(page, `provider-card-${c.slug}`)).toHaveCount(0);
  await page.goto(`/es/centro/${c.slugWithId}`);
  await expect(dc(page, 'provider-header-slot-offer')).toHaveCount(0);
  const slots = await apiSlots(page, startB);
  expect(
    slots.find((s) => new Date(s.startAtIso).getTime() === startB.getTime())?.offer,
  ).toBeUndefined();
});

test('5. seguridad: una hora sin oferta se cobra a precio normal aunque otra esté rebajada', async ({
  page,
}) => {
  // La oferta A sigue siendo la "rebajada" del día: la reactivamos para que el
  // contraste sea real (el descuento de A no debe filtrarse a otra hora).
  await db.query(`UPDATE slot_offers SET status = 'active', "withdrawnAt" = NULL WHERE id = $1`, [
    offerAId,
  ]);

  const candidates = [60, -60, 90, -90].map((m) => new Date(startA.getTime() + m * 60_000));
  const day = await apiSlots(page, startA);
  const plain = candidates.find(
    (d) =>
      !['23:30', '00:00', '00:30'].includes(label(d)) &&
      day.some((s) => new Date(s.startAtIso).getTime() === d.getTime() && !s.offer),
  );
  test.skip(!plain, 'Sin hueco vecino libre sin oferta ese día.');

  await reachCheckout(page, plain!);
  // Sin oferta no hay precio de referencia tachado ni aviso de previsión.
  await expect(dc(page, 'booking-summary-total-original')).toHaveCount(0);
  await expect(dc(page, 'booking-summary-total')).toContainText(money(SERVICE_PRICE_CENTS));
  await submitToPayment(page);
  await expect(dc(page, 'booking-stripe-payment-amount-original')).toHaveCount(0);

  const b = await bookingAt(plain!);
  expect(b.priceCents).toBe(SERVICE_PRICE_CENTS);
  expect(b.discountPct).toBeNull();
  expect(b.originalPriceCents).toBeNull();
  expect(b.slotOfferId).toBeNull();
  expect(b.commissionCents).toBe(Math.floor((SERVICE_PRICE_CENTS * c.commissionRateBps) / 10_000));
  const intent = await getStripe().paymentIntents.retrieve(b.stripePaymentIntentId);
  expect(intent.amount).toBe(SERVICE_PRICE_CENTS);
  expect(intent.application_fee_amount).toBe(b.commissionCents);
});
