/**
 * Configuración de commitlint para Yeiwell.
 *
 * Se basa en Conventional Commits. Los prefijos válidos están en la lista
 * `type-enum`. El asunto va en castellano (ver CLAUDE.md sección 6.bis).
 *
 * Ejemplos válidos:
 *   feat: añadir flujo de reserva con Stripe Connect
 *   fix: corregir cálculo de slots cuando el centro cierra al mediodía
 *   refactor: separar lógica de búsqueda en service propio
 */
/** @type {import('@commitlint/types').UserConfig} */
const config = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', // nueva funcionalidad
        'fix', // corrección de bug
        'refactor', // cambio de código sin cambio de comportamiento
        'chore', // tareas de mantenimiento (deps, configs, etc.)
        'docs', // documentación
        'test', // tests
        'style', // formato (sin cambios de lógica)
        'perf', // mejora de rendimiento
        'build', // build system / dependencias
        'ci', // configuración de CI/CD
        'revert', // revertir un commit anterior
      ],
    ],
    'subject-case': [0], // permitimos castellano natural (no fuerza lower-case)
    'header-max-length': [2, 'always', 100],
  },
};

export default config;
