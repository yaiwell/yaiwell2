-- Migración 3_locales_en_de
--
-- Amplía el enum `"Locale"` con `en` (inglés) y `de` (alemán) para
-- soportar el turismo internacional en Mallorca. ES y CA siguen siendo
-- los locales primarios; EN/DE se añaden como segundo cinturón con
-- prioridad por tráfico esperado.
--
-- Postgres permite ALTER TYPE ... ADD VALUE en una sentencia simple,
-- pero **requiere que NO se ejecute dentro de un bloque transaccional
-- implícito** con otras sentencias que dependan del nuevo valor. Cada
-- ADD VALUE va aislado en su propio statement por seguridad.
--
-- IF NOT EXISTS protege la idempotencia si la migración se aplica
-- parcialmente (raro pero posible en pipelines de deploy multi-fase).

ALTER TYPE "Locale" ADD VALUE IF NOT EXISTS 'en';
ALTER TYPE "Locale" ADD VALUE IF NOT EXISTS 'de';
