import { expect, test } from '@playwright/test';

/**
 * Flujo E2E principal: landing → búsqueda → ficha de proveedor → sheet de servicio.
 *
 * Cubrimos la ruta crítica del cliente:
 *  1. Aterriza en la home.
 *  2. Navega a `/buscar` con la query "masajes".
 *  3. Selecciona el primer proveedor de la lista.
 *  4. En la ficha del proveedor, hace clic en un servicio y verifica
 *     que el sheet de detalle del servicio se abre.
 *
 * Si esta navegación se rompe, el MVP no funciona. Cualquier refactor
 * en search/provider debe mantener este test verde.
 */
test('navega de la home a un servicio dentro de una ficha de proveedor', async ({ page }) => {
  // 1. Home.
  await page.goto('/');
  await expect(page.locator('[data-component="hero"]')).toBeVisible();

  // 2. Página de búsqueda con la query "masajes".
  await page.goto('/buscar?q=masajes');

  // Esperamos a que aparezca al menos una card de proveedor.
  const firstCard = page.locator('[data-component^="provider-card-"]').first();
  await expect(firstCard).toBeVisible();

  // 3. Entramos a la ficha del primer proveedor.
  await firstCard.click();

  // La lista de servicios del proveedor debe estar presente.
  const servicesList = page.locator('[data-component="provider-services-list"]');
  await expect(servicesList).toBeVisible();

  // 4. Click en el primer servicio → debe abrir el sheet (diálogo).
  const firstService = page.locator('[data-component^="provider-services-list-item-"]').first();
  await expect(firstService).toBeVisible();
  await firstService.click();

  // El sheet de detalle de servicio se materializa como dialog accesible.
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
});
