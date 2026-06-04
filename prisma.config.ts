/**
 * Configuración de Prisma 7 para Yaiwell.
 *
 * En Prisma 7 la conexión a la base de datos ya no se declara en
 * `schema.prisma` sino aquí. Cargamos `.env.local` (donde viven los
 * secretos de Supabase) antes de leer `process.env` para que el CLI
 * (`prisma migrate`, `prisma studio`, etc.) tenga acceso a la URL.
 *
 * Estrategia con Supabase:
 * - **Migraciones y CLI** (este fichero): usan la conexión directa
 *   (`DATABASE_URL` apuntando a `db.<ref>.supabase.co:5432`). pgBouncer
 *   en transaction mode no soporta DDL, por eso no se usa el pooler.
 * - **Runtime de la app** (`src/lib/db/prisma.ts`): en local también
 *   usa `DATABASE_URL` directo; cuando deploye a Vercel sustituiremos
 *   por la URL del pooler vía `new PrismaClient({ datasourceUrl })`.
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
  },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
});
