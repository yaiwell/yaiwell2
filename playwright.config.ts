import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración de Playwright para tests E2E.
 *
 * Decisiones:
 *  - Solo Chromium por ahora: el coste de mantener cross-browser no se
 *    justifica en MVP. Se añadirá Firefox/WebKit cuando salgamos de Fase 1.
 *  - `webServer` arranca `npm run dev` antes de los tests y lo apaga al
 *    terminar; reutiliza el dev server si ya está corriendo en local.
 *  - `testDir` apunta a `tests/e2e` para mantener los E2E aislados del
 *    resto de tests unitarios/integración que viven co-ubicados con el
 *    código en `src/**`.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      // Usamos por defecto el Chrome del sistema (channel 'chrome') para
      // evitar tener que descargar el bundle de Chromium con
      // `npx playwright install`. Si se prefiere el Chromium oficial de
      // Playwright (build determinista), exportar PW_USE_CHROMIUM=1.
      use: process.env.PW_USE_CHROMIUM
        ? { ...devices['Desktop Chrome'] }
        : { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    // El primer build de Next puede ser lento en frío; damos margen.
    timeout: 180_000,
  },
});
