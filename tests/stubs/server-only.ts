/**
 * Stub vacío de `server-only` para Vitest.
 *
 * El paquete real (`node_modules/server-only`) lanza una excepción
 * en cuanto se importa fuera de un Server Component, lo que rompe
 * los tests de route handlers y server actions cuando se ejecutan
 * en `happy-dom`. Como en tests no hay bundler que vigile el
 * server/client boundary, reemplazamos el módulo por un no-op.
 */
export {};
