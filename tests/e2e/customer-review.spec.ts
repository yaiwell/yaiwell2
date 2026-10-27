import path from 'node:path';

import { createClerkClient } from '@clerk/backend';
import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright';
import { expect, test, type Page } from '@playwright/test';
import dotenv from 'dotenv';
import { Client } from 'pg';

import es from '../../src/messages/es.json';

/**
 * E2E del flujo de valorar del cliente (§4.bis): CTA solo en reservas
 * `completed`, validaciones del formulario, envío con teclado, reflejo en
 * la ficha pública y imposibilidad de valorar dos veces.
 *
 * La BD es la de producción: se crea UNA reserva sintética marcada con
 * `PRUEBA E2E` y se borra (con su review) por id en `afterAll`. Al borrar
 * la review, el trigger devuelve la nota del proveedor a 0/0; se comprueba.
 */

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const PROVIDER_ID = '70a8dc5a-2fed-4aa4-907c-ad93a49eb879';
const SERVICE_ID = '239d106c-8967-4f2e-adb1-614e78d84206';
const PROFESSIONAL_ID = '820ebfb1-8aae-4517-8956-1571d0a378a6';
const REVIEW_TEXT = 'PRUEBA E2E: trato excelente y puntualidad total en la cita.';
const T = es.customerArea;

test.use({ locale: 'es-ES', timezoneId: 'Europe/Madrid', navigationTimeout: 120_000 });
test.setTimeout(180_000);
test.describe.configure({ mode: 'serial' });

let db: Client;
let clientId = '';
let clerkUserId = '';
let bookingId = '';
let clientEmail = '';
let providerSlug = '';
let otherBookingIds: string[] = [];

const dc = (page: Page, id: string) => page.locator(`[data-component="${id}"]`);

async function providerRating() {
  const { rows } = await db.query(
    'SELECT "ratingAvg", "ratingCount" FROM providers WHERE id = $1',
    [PROVIDER_ID],
  );
  return rows[0] as { ratingAvg: number; ratingCount: number };
}

test.beforeAll(async () => {
  if (!process.env.CLERK_SECRET_KEY?.startsWith('sk_test_')) {
    throw new Error('CLERK_SECRET_KEY no es de test; abortamos.');
  }
  db = new Client({ connectionString: process.env.DIRECT_URL });
  await db.connect();

  // Cliente de test propio de esta ejecución: usuario de Clerk (dominio
  // `+clerk_test`, solo dev) y su espejo en `users`. Se borran por id en afterAll.
  const clerkApi = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  clientEmail = `e2e-review-${Date.now()}+clerk_test@example.com`;
  const created = await clerkApi.users.createUser({
    emailAddress: [clientEmail],
    skipPasswordRequirement: true,
    publicMetadata: { role: 'client' },
  });
  clerkUserId = created.id;
  const inserted = await db.query(
    `INSERT INTO users (id, "clerkId", email, role, locale, "fullName", "updatedAt")
     VALUES (gen_random_uuid()::text, $1, $2, 'client', 'es', 'PRUEBA E2E', now())
     RETURNING id`,
    [clerkUserId, clientEmail],
  );
  clientId = inserted.rows[0].id;
  providerSlug = (await db.query('SELECT slug FROM providers WHERE id = $1', [PROVIDER_ID])).rows[0]
    .slug;

  const before = await providerRating();
  if (before.ratingCount !== 0 || Number(before.ratingAvg) !== 0) {
    throw new Error(`Studio Aura no parte de 0/0 (${JSON.stringify(before)}); abortamos.`);
  }

  const service = await db.query('SELECT "priceCents" FROM services WHERE id = $1', [SERVICE_ID]);
  const ins = await db.query(
    `INSERT INTO bookings (id, "clientId", "serviceId", "professionalId", "providerId",
       "startAt", "endAt", status, "priceCents", "commissionCents", notes, "completedAt", "updatedAt")
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4,
       now() - interval '2 days', now() - interval '2 days' + interval '30 minutes',
       'completed', $5, 0, $6, now() - interval '2 days', now())
     RETURNING id`,
    [
      clientId,
      SERVICE_ID,
      PROFESSIONAL_ID,
      PROVIDER_ID,
      service.rows[0].priceCents,
      `PRUEBA E2E valorar (${new Date().toISOString()})`,
    ],
  );
  bookingId = ins.rows[0].id;

  const others = await db.query(
    `SELECT id FROM bookings WHERE "clientId" = $1 AND status IN ('pending','confirmed')`,
    [clientId],
  );
  otherBookingIds = others.rows.map((r: { id: string }) => r.id);
});

/** Borra el usuario de Clerk con reintentos: la API a veces da `fetch failed` por red. */
async function deleteClerkUser(id: string) {
  const api = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  for (let attempt = 1; ; attempt++) {
    try {
      await api.users.deleteUser(id);
      return;
    } catch (error) {
      if (attempt >= 5) throw error;
      await new Promise((r) => setTimeout(r, 3000 * attempt));
    }
  }
}

test.afterAll(async () => {
  try {
    if (db) {
      if (bookingId) {
        await db.query('DELETE FROM reviews WHERE "bookingId" = $1', [bookingId]);
        await db.query('DELETE FROM bookings WHERE id = $1', [bookingId]);
      }
      if (clientId) await db.query('DELETE FROM users WHERE id = $1', [clientId]);
    }
    if (clerkUserId) await deleteClerkUser(clerkUserId);
    if (db) {
      const after = await providerRating();
      expect(after.ratingCount, 'ratingCount debe volver a 0').toBe(0);
      expect(Number(after.ratingAvg), 'ratingAvg debe volver a 0').toBe(0);
    }
  } finally {
    await db?.end();
  }
});

test('valorar una reserva completada, de principio a fin', async ({ page }) => {
  await setupClerkTestingToken({ page });
  // Hace falta una página con el cliente JS de Clerk cargado (como en el E2E de onboarding).
  await page.goto('/es/entrar', { waitUntil: 'domcontentloaded' });
  await clerk.signIn({ page, emailAddress: clientEmail });

  // 1. CTA solo en la completada.
  await page.goto('/es/mis-reservas');
  const cta = dc(page, `customer-booking-review-${bookingId}`);
  await expect(cta).toBeVisible();
  for (const id of otherBookingIds) {
    await expect(dc(page, `customer-booking-card-${id}`)).toBeVisible();
    await expect(dc(page, `customer-booking-review-${id}`)).toHaveCount(0);
  }

  // 2. Validaciones: sin estrellas y con texto corto.
  await cta.click();
  const dialog = dc(page, `customer-review-dialog-${bookingId}`);
  await expect(dialog).toBeVisible();
  const submit = dc(page, 'customer-review-submit');
  await submit.click();
  await expect(dialog.getByRole('alert')).toContainText(T.reviewForm.fieldErrors.RATING_REQUIRED);

  // Elegir 4 estrellas con teclado: foco en el grupo y flechas.
  await dc(page, 'customer-review-star-1').focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(dc(page, 'customer-review-star-4')).toBeChecked();

  await dc(page, 'customer-review-text').fill('corto');
  await submit.click();
  await expect(dialog.getByRole('alert')).toContainText(
    T.reviewForm.fieldErrors.TEXT_TOO_SHORT.replace('{min}', '10'),
  );

  await dc(page, 'customer-review-text').fill(REVIEW_TEXT);
  await submit.click();

  // 3. Éxito, sin CTA y con la reseña existente de 4 estrellas.
  await expect(dc(page, 'customer-review-success')).toContainText(T.reviewForm.success);
  await expect(cta).toHaveCount(0);
  const existing = dc(page, `customer-booking-existing-review-${bookingId}`);
  await expect(existing).toBeVisible();
  await expect(existing.getByRole('img')).toHaveAccessibleName(
    T.existingReview.ratingAria.replace('{rating}', '4'),
  );
  await expect(existing).toContainText(REVIEW_TEXT);

  // 4. Ficha pública: 4,0 y 1 valoración, reseña visible.
  const { rows } = await db.query('SELECT id FROM providers WHERE id = $1', [PROVIDER_ID]);
  await page.goto(`/es/centro/${providerSlug}-${rows[0].id}`);
  const section = dc(page, 'provider-reviews-section');
  await expect(section).toContainText(REVIEW_TEXT);
  await expect(page.getByText(es.ratingSummary.new)).toHaveCount(0);
  await expect(page.getByText(/4[,.]0/).first()).toBeVisible();
  await expect(page.getByText(/\b1 valoración\b/).first()).toBeVisible();

  // 5. Recarga: no se puede valorar dos veces.
  await page.goto('/es/mis-reservas');
  await expect(dc(page, `customer-booking-existing-review-${bookingId}`)).toBeVisible();
  await expect(dc(page, `customer-booking-review-${bookingId}`)).toHaveCount(0);
});
