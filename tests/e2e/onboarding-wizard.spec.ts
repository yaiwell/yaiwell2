import { clerk } from '@clerk/testing/playwright';
import { expect, test } from '@playwright/test';

import {
  cleanupTestProviderBD,
  disconnectPrisma,
  ensureTestProviderInternalUser,
  ensureTestProviderRole,
} from './utils/clerk-test-user';

/**
 * E2E del wizard de onboarding del proveedor (Capa 3 del #57).
 *
 * Estrategia:
 *  - Auth real contra Clerk dev usando `@clerk/testing` + un user de
 *    pruebas con email/password en `.env.local` (`CLERK_TEST_PROVIDER_*`).
 *  - BD real contra Supabase dev: cada test limpia el `Provider` del
 *    user antes de empezar para que el wizard arranque siempre en paso 1.
 *  - Geocoding interceptado con `page.route()` para no quemar requests
 *    contra Mapbox ni depender de la latencia/disponibilidad del proxy.
 *
 * Si falta el user de pruebas en Clerk, el helper `ensureTestProviderRole`
 * lanza con instrucciones de qué crear en el dashboard.
 *
 * El test recorre los 5 pasos: tipo → datos + slug → ubicación →
 * categoría + primer servicio → confirmar + publicar. Verifica el
 * redirect final a `/panel` (sin entrar a verificar lo que hay dentro;
 * eso es responsabilidad de otros E2E).
 */

const ES_PREFIX = '/es';

test.describe('Wizard de onboarding del proveedor', () => {
  test.beforeAll(async () => {
    // Asegura `publicMetadata.role = 'provider'`. El user creado a mano
    // en el dashboard arranca con metadata vacío y `requireRole` lo
    // rechazaría.
    await ensureTestProviderRole();
    // Y crea el row `User` interno en Supabase: cuando el user se crea
    // a mano en Clerk dashboard el webhook `user.created` no se dispara,
    // así que sin esto el wizard se queda en "Sincronizando…" infinito.
    await ensureTestProviderInternalUser();
  });

  test.beforeEach(async () => {
    // Cada test parte de cero: borra cualquier Provider asociado al
    // user de pruebas. El webhook `user.created` ya habrá creado el
    // `User` interno; solo limpiamos las filas que el wizard maneja.
    await cleanupTestProviderBD();
  });

  test.afterAll(async () => {
    await disconnectPrisma();
  });

  test('recorre los 5 pasos y publica → redirect a /panel', async ({ page }) => {
    // Interceptamos el geocoding antes de cualquier navegación para que
    // el step 3 no toque Mapbox real.
    await page.route('**/api/geocoding/forward*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [
            {
              id: 'e2e-suggestion-1',
              name: 'Carrer Major, 10',
              fullAddress: 'Carrer Major, 10, 08001 Barcelona, España',
              lat: 41.3851,
              lng: 2.1734,
              kind: 'address',
            },
          ],
        }),
      });
    });

    // 1. Login programático.
    await page.goto('/');
    await clerk.signIn({
      page,
      signInParams: {
        strategy: 'password',
        identifier: process.env.CLERK_TEST_PROVIDER_EMAIL!,
        password: process.env.CLERK_TEST_PROVIDER_PASSWORD!,
      },
    });

    // 2. Entrar al wizard.
    await page.goto(`${ES_PREFIX}/onboarding`);

    // Si el webhook `user.created` aún no ha completado, vemos pantalla
    // "Sincronizando tu cuenta…". El wizard hace 5 reintentos de 2s, así
    // que con 12s de espera total estamos cubiertos.
    await expect(page.getByRole('heading', { name: '¿Cómo trabajas?' })).toBeVisible({
      timeout: 15_000,
    });

    // ─── Paso 1: tipo de negocio ─────────────────────────────────────
    await page.getByRole('radio', { name: /Por mi cuenta/i }).click();
    await page.getByTestId('onboarding-next').click();

    // ─── Paso 2: datos del negocio ───────────────────────────────────
    await expect(page.getByRole('heading', { name: 'Datos del negocio' })).toBeVisible();

    // El slug se autogenera al hacer blur del nombre.
    const businessName = `Studio E2E ${Date.now()}`;
    await page.getByLabel('Nombre del negocio').fill(businessName);
    await page.getByLabel('Nombre del negocio').blur();

    // Esperamos a que el check de disponibilidad termine.
    await expect(page.getByText('Disponible', { exact: false })).toBeVisible({
      timeout: 5_000,
    });

    await page
      .getByLabel('Descripción pública')
      .fill('Centro de pruebas E2E del wizard de onboarding.');

    // PriceRange: 3 botones con label €, €€, €€€. El primero es €.
    await page.getByRole('radio', { name: '€', exact: true }).click();

    await page.getByTestId('onboarding-next').click();

    // ─── Paso 3: ubicación con autocomplete ──────────────────────────
    await expect(page.getByRole('heading', { name: 'Dónde estás' })).toBeVisible();

    const addressInput = page.locator('[data-component="address-autocomplete-input"]');
    await addressInput.fill('Carrer Major');

    const firstOption = page.locator('[data-component="address-autocomplete-option"]').first();
    await expect(firstOption).toBeVisible({ timeout: 5_000 });
    await firstOption.click();

    await page.getByTestId('onboarding-next').click();

    // ─── Paso 4: categoría + primer servicio ─────────────────────────
    await expect(page.getByRole('heading', { name: 'Categoría y primer servicio' })).toBeVisible();

    // Cualquier categoría sirve para el test. Las raíz vienen del seed
    // (`prisma/seed.ts`). Tomamos el primer radio del radiogroup.
    await page.getByRole('radio').first().click();

    await page.getByLabel('Nombre del servicio').fill('Sesión de prueba E2E');
    await page.getByRole('radio', { name: '30 min', exact: true }).click();
    await page.getByLabel('Precio (€)').fill('25');

    await page.getByTestId('onboarding-next').click();

    // ─── Paso 5: confirmar y publicar ────────────────────────────────
    await expect(page.getByRole('heading', { name: 'Revisa y publica' })).toBeVisible();

    // Resumen: el slug visible debe contener el businessName.
    await expect(page.getByText(businessName)).toBeVisible();

    await page.getByRole('checkbox').check();
    await page.getByTestId('onboarding-next').click();

    // ─── Verificación final ──────────────────────────────────────────
    // Tras publicar, `apiSelectPlan(providerId, 'free')` se resuelve y
    // el orquestador llama a `onComplete` que hace `router.push('/panel')`.
    await page.waitForURL(/\/panel/, { timeout: 15_000 });
    expect(page.url()).toContain('/panel');
  });
});
