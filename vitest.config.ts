import path from 'node:path';

import { defineConfig } from 'vitest/config';

/**
 * Configuración de Vitest para tests unitarios y de componentes.
 *
 * Decisiones:
 *  - `happy-dom` como entorno: más rápido que jsdom y suficiente para los
 *    componentes React del proyecto (DOM básico + APIs estándar).
 *  - Alias `@/*` replicando el de `tsconfig.json` para que los imports
 *    funcionen igual en tests y en código de aplicación.
 *  - `setupFiles` carga los matchers de jest-dom una sola vez por suite.
 *  - Excluimos `tests/e2e/**` porque esos los corre Playwright, no Vitest.
 */
export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'tests/unit/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'tests/e2e/**'],
    css: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
