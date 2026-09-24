import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';

/**
 * Configuración ESLint del proyecto Yaiwell.
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

      // Prohibido indexar un objeto por una variable de locale.
      //
      // El patrón `service.name[locale]` es la causa raíz del P0 nº 7 de
      // `docs/pantallas-2026-09-23.md`: los `LocalizedText` del dominio
      // solo garantizan la clave `es`, así que indexar por el locale
      // activo devuelve `undefined` en `/ca`, `/en` y `/de` y la UI pinta
      // un hueco en blanco — sin excepción, sin log, sin nada que
      // delate el fallo. `pickLocalized()` aplica la cadena de fallback
      // y es el único sitio donde ese acceso está permitido.
      //
      // El selector cubre cualquier identificador acabado en `locale`
      // (`locale`, `typedLocale`, `panelLocale`…) porque el bug apareció
      // con las tres variantes.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'MemberExpression[computed=true][property.name=/[Ll]ocale$/]',
          message:
            'No indexes por el locale activo: los LocalizedText del dominio solo garantizan la clave `es`, así que `texto[locale]` sale vacío en ca/en/de y la UI pinta un hueco en blanco. Usa pickLocalized(texto, locale) de @/lib/i18n, que aplica el fallback locale → es → ca → en → de. Si el objeto SÍ tiene los cuatro idiomas garantizados (un diccionario de constantes, p. ej.), desactiva esta regla con eslint-disable-next-line y un comentario que explique por qué ahí es seguro.',
        },
      ],
    },
  },

  // Desactiva reglas de formato de ESLint que entrarían en conflicto con Prettier.
  prettier,

  // Sobrescribe los ignores por defecto de eslint-config-next.
  globalIgnores([
    '.next/**',
    '.claude/**',
    'out/**',
    'build/**',
    'dist/**',
    'coverage/**',
    'next-env.d.ts',
    'node_modules/**',
    'playwright-report/**',
    'test-results/**',
  ]),
]);

export default eslintConfig;
