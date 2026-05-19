import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';

/**
 * Configuración ESLint del proyecto Beauly.
 *
 * Orden de aplicación:
 * 1. Reglas base de Next.js (Core Web Vitals + TypeScript).
 * 2. Reglas propias del proyecto (más estrictas que las de Next).
 * 3. eslint-config-prettier/flat: apaga reglas de formato que pisarían a Prettier.
 *    Debe ir SIEMPRE al final para que sus desactivaciones ganen.
 */
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // Reglas estrictas propias del proyecto. Ver CLAUDE.md sección 6.bis.
  {
    rules: {
      // Prohibido `any` salvo justificación explícita con eslint-disable.
      '@typescript-eslint/no-explicit-any': 'error',

      // Variables no usadas: error, pero permitir prefijo "_" para descartes intencionales.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // Forzar `import type` para imports de tipos puros (mejora tree-shaking y claridad).
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],

      // No dejar console.log en código de producción. console.warn/error sí se permiten.
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // Prefiere `const` cuando la variable no se reasigna.
      'prefer-const': 'error',

      // No permitir `var`.
      'no-var': 'error',
    },
  },

  // Desactiva reglas de formato de ESLint que entrarían en conflicto con Prettier.
  prettier,

  // Sobrescribe los ignores por defecto de eslint-config-next.
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'dist/**',
    'coverage/**',
    'next-env.d.ts',
    'node_modules/**',
  ]),
]);

export default eslintConfig;
