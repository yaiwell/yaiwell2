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
    // Forzamos a Vite a transformar `next-intl` (en lugar de cargarlo
    // como módulo externo en SSR) para que el alias `next/navigation`
    // se aplique en su árbol de importaciones internas.
    server: {
      deps: {
        inline: ['next-intl'],
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Vitest + ESM no aplican las resoluciones implícitas de extensión
      // que Next.js asume al importar `next/navigation` desde next-intl.
      // Mapeamos al archivo CJS real para que los tests de componentes
      // que usan el `Link` de next-intl puedan renderizar.
      'next/navigation': path.resolve(__dirname, './node_modules/next/navigation.js'),
      // `server-only` lanza en cualquier entorno tipo browser (happy-dom)
      // porque está pensado para que Webpack lo detecte en build. En
      // tests no hay Webpack, así que lo neutralizamos con un stub vacío.
      // Es el patrón recomendado por Next.js y Vitest para tests de
      // server actions / route handlers.
      'server-only': path.resolve(__dirname, './tests/stubs/server-only.ts'),
    },
  },
});
