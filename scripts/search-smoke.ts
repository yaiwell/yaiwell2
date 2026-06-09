/**
 * Smoke test del motor FTS: ejecuta queries representativas contra
 * la BD dev (seedeada con `npm run db:seed:dev`) e imprime los
 * rankings para inspección manual.
 *
 * No es un test automatizado (no asserta resultados específicos
 * porque dependen del corpus y los pesos pueden ajustarse). Su
 * objetivo es validar a ojo que:
 *  - Las queries básicas devuelven resultados ordenados por relevancia.
 *  - Las queries con typo (similarity trigram) recuperan resultados.
 *  - Los idiomas es/ca devuelven resultados coherentes.
 *  - El filtro `verificationStatus = 'approved'` se aplica a providers.
 *
 * Ejecución:
 *   npm run search:smoke
 */

/* eslint-disable no-console -- script de CLI: logs en stdout son la salida esperada. */

import path from 'node:path';

import { config as loadEnv } from 'dotenv';

loadEnv({ path: path.resolve(process.cwd(), '.env.local'), override: true });

// Imports después de cargar env porque el módulo `prisma` lee
// `DATABASE_URL` en el primer acceso (lazy proxy).
import { searchProviders, searchServices } from '../src/lib/services/search';
import type { SearchLanguage } from '../src/lib/services/search';

interface SmokeCase {
  label: string;
  query: string;
  language?: SearchLanguage;
  expectations: string;
}

const SERVICE_CASES: SmokeCase[] = [
  {
    label: 'Match directo (es)',
    query: 'corte de pelo',
    expectations: 'Servicios de peluquería en primeras posiciones',
  },
  {
    label: 'Typo tolerancia (es) - "masage" → masaje',
    query: 'masage',
    expectations: 'Recupera servicios de masaje via similarity trigram',
  },
  {
    label: 'Match en catalán',
    query: 'manicura',
    language: 'ca',
    expectations: 'Servicios de manicura (presentes en es y ca)',
  },
  {
    label: 'Query genérica (description hit)',
    query: 'relajante',
    expectations: 'Servicios cuya description menciona relajante (peso B)',
  },
  {
    label: 'Stemming español - "depilaciones" → depilación',
    query: 'depilaciones',
    expectations: 'Recupera "depilación" via stemming spanish dict',
  },
  {
    label: 'Match en inglés (en)',
    query: 'haircut',
    language: 'en',
    expectations:
      'Valida que la query ejecuta sin error con regconfig english. ' +
      'Probablemente 0 resultados hasta que los services tengan name/description en EN.',
  },
  {
    label: 'Match en alemán (de)',
    query: 'Friseur',
    language: 'de',
    expectations:
      'Valida que la query ejecuta sin error con regconfig german. ' +
      'Probablemente 0 resultados hasta que los services tengan name/description en DE.',
  },
];

const PROVIDER_CASES: SmokeCase[] = [
  {
    label: 'Provider por nombre',
    query: 'Atelier Norte',
    expectations: 'Atelier Norte primero (match en businessName, peso A)',
  },
  {
    label: 'Provider por dirección',
    query: 'Gràcia',
    expectations: 'Providers con address en Gràcia (peso C)',
  },
  {
    label: 'Typo en businessName',
    query: 'Atelir',
    expectations: 'Atelier Norte recuperado via similarity trigram',
  },
];

function formatScore(score: number) {
  return score.toFixed(4);
}

function printService(idx: number, row: Awaited<ReturnType<typeof searchServices>>[number]) {
  const name = row.name?.es ?? row.name?.ca ?? '?';
  console.log(`    ${idx + 1}. [${formatScore(row.score)}] ${name}  (${row.priceCents / 100}€)`);
}

function printProvider(idx: number, row: Awaited<ReturnType<typeof searchProviders>>[number]) {
  console.log(`    ${idx + 1}. [${formatScore(row.score)}] ${row.businessName} — ${row.address}`);
}

async function runServiceCases() {
  console.log('\n========================================');
  console.log('  SERVICIOS');
  console.log('========================================');
  for (const c of SERVICE_CASES) {
    console.log(`\n▸ ${c.label}`);
    console.log(`  query="${c.query}" lang=${c.language ?? 'es'}`);
    console.log(`  esperado: ${c.expectations}`);
    const rows = await searchServices({
      query: c.query,
      language: c.language,
      limit: 5,
    });
    if (rows.length === 0) {
      console.log('    ⚠ sin resultados');
      continue;
    }
    rows.forEach((r, i) => printService(i, r));
  }
}

async function runProviderCases() {
  console.log('\n========================================');
  console.log('  PROVEEDORES');
  console.log('========================================');
  for (const c of PROVIDER_CASES) {
    console.log(`\n▸ ${c.label}`);
    console.log(`  query="${c.query}" lang=${c.language ?? 'es'}`);
    console.log(`  esperado: ${c.expectations}`);
    const rows = await searchProviders({
      query: c.query,
      language: c.language,
      limit: 5,
    });
    if (rows.length === 0) {
      console.log('    ⚠ sin resultados');
      continue;
    }
    rows.forEach((r, i) => printProvider(i, r));
  }
}

async function main() {
  console.log('=== FTS smoke test ===');
  console.log('BD: ' + (process.env.DATABASE_URL?.split('@')[1]?.split('?')[0] ?? '(desconocida)'));
  await runServiceCases();
  await runProviderCases();
  console.log('\n=== done ===');
}

main()
  .catch((err) => {
    console.error('smoke fallo:', err);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import('../src/lib/db/prisma');
    await prisma.$disconnect();
  });
