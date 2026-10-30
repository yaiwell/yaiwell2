import { createClerkClient } from '@clerk/backend';
import { expect, test } from '@playwright/test';
import type { Client } from 'pg';

import es from '../../src/messages/es.json';
import {
  assertClerkDevKeys,
  connectDb,
  countRows,
  createTestUser,
  deleteTestUser,
  leftovers,
  NOTHING_LEFT,
  withRetries,
  type TestUser,
} from './utils/onsite-seed';
import { signInAs } from './utils/sign-in';

/**
 * E2E de la conversión cliente -> profesional (CLAUDE.md §4.bis, «Planes y
 * cuentas de negocio»): un cliente con sesión que llega con la intención de
 * profesional (`/registro?as=provider&plan=pro`) pasa por
 * `/hazte-profesional?plan=pro`, confirma y entra en `/onboarding`, y las
 * APIs del wizard le responden 2xx (no 403: el JWT viejo aún diría `client`).
 *
 * No se crea ningún negocio. Usuario propio de Clerk DEV, borrado al final.
 */

const T = es.becomeProvider;

test.use({ locale: 'es-ES', timezoneId: 'Europe/Madrid', navigationTimeout: 120_000 });
test.setTimeout(180_000);

let db: Client;
let client: TestUser | null = null;
let before: Record<string, number> = {};

test.beforeAll(async () => {
  test.setTimeout(120_000);
  assertClerkDevKeys();
  db = await connectDb();
  before = await countRows(db);
  client = await createTestUser(db, { role: 'client', clerk: true, label: 'become' });
});

test.afterAll(async () => {
  const problems: string[] = [];
  try {
    // El flujo puede haber cambiado el rol del espejo en `users`; se borra igual por id/clerkId.
    problems.push(...(await deleteTestUser(db, client)));
    if (db) {
      const after = await countRows(db);
      console.log('[become-provider] filas antes/después:', JSON.stringify({ before, after }));
      // Con otros specs en paralelo el conteo global no es comparable: se exige que no
      // quede nada de lo sembrado aquí (el balance global se verifica con --workers=1).
      expect(
        await leftovers(db, { userIds: [client?.id], providerIds: [] }),
        'no debe quedar nada de lo sembrado',
      ).toEqual(NOTHING_LEFT);
      void after;
    }
  } finally {
    if (problems.length) console.warn('[become-provider] limpieza con avisos:', problems);
    await db?.end().catch(() => undefined);
  }
});

test('cliente con sesión: /registro?as=provider&plan=pro -> hazte-profesional -> onboarding con API 2xx', async ({
  page,
}) => {
  await signInAs(page, client!.email);

  // 1. Con sesión de cliente, el registro con intención de profesional no enseña el
  //    formulario: redirige a la pantalla que convierte la cuenta, conservando el plan.
  await page.goto('/es/registro?as=provider&plan=pro');
  await expect(page).toHaveURL(/\/es\/hazte-profesional\?plan=pro/);
  await expect(page.getByRole('heading', { name: T.title })).toBeVisible();

  // 2. Confirmar la conversión.
  const confirm = page.getByRole('button', { name: T.cta.confirm });
  await expect(confirm).toBeEnabled();
  await confirm.click();

  // 3. Aterriza en el wizard (el cliente refresca el token antes de navegar).
  await expect(page).toHaveURL(/\/es\/onboarding/, { timeout: 60_000 });
  await expect(page.getByText(T.errors.forbidden)).toHaveCount(0);

  // 4. Una API del wizard responde 2xx con la sesión ya convertida (antes daba 403).
  const res = await page.request.get('/api/provider-onboarding/state');
  expect(res.status(), await res.text()).toBeGreaterThanOrEqual(200);
  expect(res.status()).toBeLessThan(300);

  // 5. El rol quedó en Clerk como profesional (fuente de verdad del JWT).
  const api = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  const role = await withRetries(async () => {
    const user = await api.users.getUser(client!.clerkId);
    return (user.publicMetadata as { role?: string }).role;
  });
  expect(role).toBe('provider');
});
