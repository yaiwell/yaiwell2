/**
 * Script de backfill: rellena la clave `es` de los textos localizados
 * que se guardaron sin castellano.
 *
 * Contexto: hasta el guardián de escritura de `@/lib/i18n/localizedText`,
 * el panel guardaba `{ [locale]: texto }`. Un proveedor con la interfaz
 * en catalán, inglés o alemán creaba servicios sin clave `es`, y la
 * lectura caía a `''`: nombre en blanco en la ficha pública, en el
 * buscador y en el flujo de reserva. Este script cura las filas que ya
 * están en BD; el código impide que vuelvan a crearse.
 *
 * **No necesita DDL**: solo hace UPDATE sobre columnas `jsonb` que ya
 * existen. No hay migración Prisma asociada (en este proyecto el DDL se
 * aplica a mano en el SQL Editor de Supabase porque el pooler no lo
 * soporta).
 *
 * Idempotente: solo escribe las filas cuyo `es` falta o está vacío.
 * Ejecutarlo dos veces seguidas deja el segundo run en 0 filas tocadas.
 *
 * Ejecución:
 *   npx tsx prisma/backfill-localized-es.ts            # aplica cambios
 *   npx tsx prisma/backfill-localized-es.ts --dry-run  # solo informa
 *
 * Requiere `DATABASE_URL` en `.env.local` (misma convención que
 * `seed-dev.ts`).
 */

/* eslint-disable no-console -- script de CLI: logs en stdout son la salida esperada. */

import path from 'node:path';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { config as loadEnv } from 'dotenv';

import { backfillLocalizedSpanish, type BackfillTableReport } from './backfill-localized-es.lib';

loadEnv({ path: path.resolve(process.cwd(), '.env.local'), override: true });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no está definida. Revisa .env.local.');
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/** Imprime el recuento de una tabla en una línea legible. */
function printTable(label: string, report: BackfillTableReport): void {
  console.log(`  ${label}: ${report.fixed} arreglada(s) de ${report.scanned} escaneada(s)`);
  if (report.unfixable.length > 0) {
    console.warn(
      `  ⚠ ${report.unfixable.length} fila(s) de ${label} sin texto en ningún idioma (requieren edición manual):`,
    );
    for (const id of report.unfixable) console.warn(`    - ${id}`);
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  console.log('=== backfill-localized-es ===');
  const report = await backfillLocalizedSpanish(prisma, {
    dryRun,
    log: (message) => console.log(message),
  });

  console.log('--- Resumen ---');
  printTable('services', report.services);
  printTable('providers', report.providers);
  printTable('categories', report.categories);

  if (dryRun) {
    console.log('(dry-run: no se ha escrito nada en BD)');
  }
  console.log('=== backfill-localized-es done ===');
}

main()
  .catch((err) => {
    console.error('backfill-localized-es fallo:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
