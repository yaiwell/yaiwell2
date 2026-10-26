/**
 * Configuración de Prisma 7 para Yaiwell.
 *
 * En Prisma 7 la conexión a la base de datos ya no se declara en
 * `schema.prisma` sino aquí. Cargamos `.env.local` (donde viven los
 * secretos de Supabase) antes de leer `process.env` para que el CLI
 * (`prisma migrate`, `prisma studio`, etc.) tenga acceso a la URL.
 *
 * Estrategia con Supabase:
 * - **Runtime de la app** (`src/lib/db/prisma.ts`): `DATABASE_URL` apunta
 *   al transaction pooler (6543), el único que aguanta serverless.
 * - **Migraciones y CLI** (este fichero): usan `DIRECT_URL` (session
 *   pooler 5432 o conexión directa). El transaction pooler no admite DDL
 *   ni los advisory locks de `migrate deploy`, y desde algunas redes ni
 *   siquiera responde (verificado el 2026-10-26). Si `DIRECT_URL` no está
 *   definida se cae a `DATABASE_URL` para no romper entornos antiguos.
 *
 * En CI / Vercel no existe `.env.local` y `dotenv` no falla: las
 * variables vienen ya del entorno de la plataforma.
 */

import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Carga `.env.local` si está; en CI/Vercel se ignora silenciosamente.
loadEnv({ path: path.resolve(process.cwd(), '.env.local'), override: true });

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
    // Comando que ejecuta `prisma migrate reset` tras aplicar las
    // migraciones. Usamos `tsx` porque el seed importa código del proyecto
    // (alias `@/`, tipos de dominio) y necesita resolver TS sin compilar.
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '',
  },
});
