import { expect, test, type Page } from '@playwright/test';

import es from '../../src/messages/es.json';

/**
 * E2E ligero del botón «Continuar con Google».
 *
 * Límites: nunca se interactúa con Google ni con páginas alojadas de Clerk.
 * Las navegaciones (documento) fuera de localhost se abortan en la red y
 * solo se inspecciona su URL. No se crean usuarios.
 */

const GOOGLE = '[data-component="sign-in-social-google"]';
const SIGNUP_GOOGLE = '[data-component="sign-up-social-google"]';
const APPLE = '[data-component="sign-in-social-apple"]';
const ERROR = '[data-component="google-auth-error"]';

/** Aborta navegaciones a otros orígenes y las devuelve para inspeccionarlas. */
async function captureExternalNavigations(page: Page): Promise<string[]> {
  const external: string[] = [];
  await page.route('**/*', async (route) => {
    const req = route.request();
    const isExternalDoc =
      req.isNavigationRequest() && !new URL(req.url()).hostname.match(/^(localhost|127\.0\.0\.1)$/);
    if (isExternalDoc) {
      external.push(req.url());
      await route.abort();
      return;
    }
    await route.continue();
  });
  return external;
}

test.describe('Continuar con Google', () => {
  test('1. /entrar: botón habilitado con su texto y nota; Apple deshabilitado', async ({
    page,
  }) => {
    await page.goto('/es/entrar', { waitUntil: 'domcontentloaded' });
    const google = page.locator(GOOGLE);
    await expect(google).toBeVisible();
    await expect(google).toHaveText(es.googleAuth.continue);
    await expect(google).toBeEnabled({ timeout: 30_000 });
    await expect(page.getByText(es.googleAuth.signInNote)).toBeVisible();
    await expect(page.locator(APPLE)).toBeDisabled();
  });

  test('2a. /registro: sin condiciones no sale de la página y marca el error', async ({ page }) => {
    const external = await captureExternalNavigations(page);
    await page.goto('/es/registro', { waitUntil: 'domcontentloaded' });
    const google = page.locator(SIGNUP_GOOGLE);
    await expect(google).toBeEnabled({ timeout: 30_000 });
    await google.click();
    await expect(page.getByText(es.signUp.errors.termsRequired)).toBeVisible();
    await expect(page).toHaveURL(/\/es\/registro/);
    expect(external).toEqual([]);
    await expect(google).toBeEnabled();
  });

  test('2b. /registro profesional: sin nombre de negocio marca ese error', async ({ page }) => {
    const external = await captureExternalNavigations(page);
    await page.goto('/es/registro', { waitUntil: 'domcontentloaded' });
    const google = page.locator(SIGNUP_GOOGLE);
    // Esperar a Clerk (y con él a la hidratación) antes de cambiar de pestaña.
    await expect(google).toBeEnabled({ timeout: 30_000 });
    const tab = page.getByRole('tab', { name: es.signUp.tabs.provider });
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    await google.click();
    await expect(page.getByText(es.signUp.errors.businessNameMin)).toBeVisible();
    await expect(page).toHaveURL(/\/es\/registro/);
    expect(external).toEqual([]);
  });

  test('3. /entrar?redirect_url: lanza OAuth con callback /es/sso-callback o muestra el aviso', async ({
    page,
  }) => {
    const external = await captureExternalNavigations(page);
    // La URL de vuelta no viaja en la URL de Google sino en la petición de
    // Clerk (FAPI) que inicia el OAuth: la capturamos de ahí.
    const fapiBodies: string[] = [];
    page.on('request', (req) => {
      const body = req.postData() ?? '';
      if (req.method() === 'POST' && /strategy=oauth_google/.test(decodeURIComponent(body))) {
        fapiBodies.push(`${req.url()}
${decodeURIComponent(body)}`);
      }
    });
    await page.goto('/es/entrar?redirect_url=/es/buscar', { waitUntil: 'domcontentloaded' });
    const google = page.locator(GOOGLE);
    await expect(google).toBeEnabled({ timeout: 30_000 });
    await google.click();

    // Resultado: o sale a un origen externo (abortado) o aparece el aviso.
    await expect
      .poll(async () => external.length > 0 || (await page.locator(ERROR).count()) > 0, {
        timeout: 20_000,
      })
      .toBe(true);

    if (external.length > 0) {
      const dest = new URL(external[0]);
      expect(dest.hostname).toBe('accounts.google.com');
      expect(fapiBodies.length).toBeGreaterThan(0);
      // La página normaliza `/es/buscar` a `/buscar` (sin prefijo de idioma).
      expect(fapiBodies[0]).toContain('redirect_url=http://localhost');
      expect(fapiBodies[0]).toMatch(/\/es\/sso-callback\?redirect_url=%2Fbuscar/);
      expect(fapiBodies[0]).toMatch(
        /action_complete_redirect_url=\/es\/entrar\?redirect_url=%2Fbuscar/,
      );
    } else {
      await expect(page.locator(ERROR)).toHaveText(es.googleAuth.errors.unknown);
      await expect(google).toBeEnabled();
    }
  });

  test('4. /es/sso-callback sin flujo OAuth no da 500', async ({ page }) => {
    const res = await page.goto('/es/sso-callback', { waitUntil: 'domcontentloaded' });
    expect(res?.status()).toBeLessThan(500);
    await page.waitForTimeout(3_000);
    expect(page.url()).toMatch(/localhost/);
    await expect(page.locator('body')).not.toContainText(
      /Internal Server Error|Application error/i,
    );
  });

  test('5. 375 px: el botón no se desborda', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/es/entrar', { waitUntil: 'domcontentloaded' });
    const google = page.locator(GOOGLE);
    await expect(google).toBeVisible();
    const box = await google.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(375);
    const scroll = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(scroll).toBeLessThanOrEqual(0);
  });
});
