/**
 * Lógica del backfill de castellano en los textos localizados.
 *
 * Vive separada del CLI (`backfill-localized-es.ts`) por dos razones:
 *  - el CLI instancia `PrismaClient` al importarse, y eso hace el
 *    módulo intestable;
 *  - así la lógica se prueba con un Prisma mockeado
 *    (`tests/unit/backfill-localized-es.test.ts`).
 *
 * Qué arregla: las filas guardadas **antes** del guardián de escritura
 * (`buildLocalizedText` / `storableLocalizedTextSchema`), cuando el
 * panel guardaba `{ [locale]: texto }` y un proveedor con la interfaz
 * en catalán, inglés o alemán creaba servicios sin clave `es`. Esos
 * servicios salen con el nombre en blanco en la ficha pública, en el
 * buscador y en el flujo de reserva.
 *
 * Criterio de relleno: el primer idioma disponible en el orden
 * `ca → en → de` (el mismo de `ensureSpanish`). Un nombre en catalán
 * es infinitamente mejor que un hueco en blanco.
 */

import { ensureSpanishIfAny, hasSpanish } from '../src/lib/i18n/localizedText';
import type { LocalizedText } from '../src/types/domain';

/**
 * Subconjunto de `PrismaClient` que el backfill necesita.
 *
 * Tipar el mínimo (en vez de aceptar `PrismaClient` entero) permite
 * inyectar un doble de test sin reproducir toda la superficie de Prisma.
 */
export interface BackfillPrisma {
  service: {
    findMany(args: unknown): Promise<Array<{ id: string; name: unknown; description: unknown }>>;
    update(args: unknown): Promise<unknown>;
  };
  provider: {
    findMany(args: unknown): Promise<Array<{ id: string; description: unknown }>>;
    update(args: unknown): Promise<unknown>;
  };
  category: {
    findMany(args: unknown): Promise<Array<{ id: string; name: unknown }>>;
    update(args: unknown): Promise<unknown>;
  };
}

/** Recuento por tabla. `unfixable` son filas sin texto en ningún idioma. */
export interface BackfillTableReport {
  scanned: number;
  fixed: number;
  unfixable: string[];
}

export interface BackfillReport {
  services: BackfillTableReport;
  providers: BackfillTableReport;
  categories: BackfillTableReport;
}

export interface BackfillOptions {
  /** `true` → solo informa, no escribe. Útil para ver el alcance antes. */
  dryRun?: boolean;
  /** Callback de progreso; por defecto no imprime nada (los tests no quieren ruido). */
  log?: (message: string) => void;
}

/**
 * Normaliza un valor JSONB de BD a `Partial<LocalizedText>`.
 *
 * Un JSON degenerado (null, array, string suelto) se trata como objeto
 * vacío: no intentamos adivinar, se reporta como `unfixable` y lo mira
 * una persona.
 */
function asLocalized(value: unknown): Partial<LocalizedText> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Partial<LocalizedText>;
}

/**
 * Devuelve el texto curado si la fila necesita arreglo, o `null` si ya
 * está bien (idempotencia: una segunda pasada no escribe nada).
 */
function repair(value: unknown): Partial<LocalizedText> | null {
  const current = asLocalized(value);
  if (hasSpanish(current)) return null;
  const repaired = ensureSpanishIfAny(current);
  return hasSpanish(repaired) ? repaired : null;
}

/** Report vacío, para acumular. */
function emptyReport(): BackfillTableReport {
  return { scanned: 0, fixed: 0, unfixable: [] };
}

/**
 * Rellena la clave `es` allí donde falte, en las tres tablas con
 * textos localizados (`Service.name`, `Service.description`,
 * `Provider.description`, `Category.name`).
 *
 * **Idempotente**: solo escribe filas cuyo `es` está ausente o vacío,
 * así que ejecutarlo dos veces no cambia nada la segunda vez.
 *
 * No filtra por `deletedAt`: curar una fila con soft-delete es
 * inofensivo y evita que reaparezca rota si el proveedor la restaura.
 *
 * @param prisma — cliente Prisma (o doble de test).
 * @param options — `dryRun` para no escribir, `log` para el progreso.
 * @returns recuento por tabla de filas escaneadas, arregladas e irreparables.
 */
export async function backfillLocalizedSpanish(
  prisma: BackfillPrisma,
  options: BackfillOptions = {},
): Promise<BackfillReport> {
  const { dryRun = false, log = () => {} } = options;
  const report: BackfillReport = {
    services: emptyReport(),
    providers: emptyReport(),
    categories: emptyReport(),
  };

  log(`→ Backfill de castellano${dryRun ? ' (dry-run)' : ''}...`);

  // --- Services: name + description en la misma pasada ---------------
  const services = await prisma.service.findMany({
    select: { id: true, name: true, description: true },
  });
  report.services.scanned = services.length;
  for (const service of services) {
    const nameNeedsFix = !hasSpanish(asLocalized(service.name));
    const descriptionNeedsFix = !hasSpanish(asLocalized(service.description));
    if (!nameNeedsFix && !descriptionNeedsFix) continue;

    const name = nameNeedsFix ? repair(service.name) : null;
    const description = descriptionNeedsFix ? repair(service.description) : null;

    // Un `name` sin texto en ningún idioma no se puede curar: no hay de
    // dónde sacarlo, lo tiene que reescribir el proveedor. Lo reportamos
    // para que alguien lo mire, pero seguimos por si la descripción sí
    // se puede arreglar. Una descripción vacía, en cambio, es legítima
    // (el campo es opcional en el alta) y no cuenta como incidencia.
    if (nameNeedsFix && !name) {
      report.services.unfixable.push(service.id);
    }
    if (!name && !description) continue;

    report.services.fixed += 1;
    const fields = [name ? 'name' : null, description ? 'description' : null].filter(Boolean);
    log(`  · service ${service.id}: ${fields.join(' + ')}`);
    if (dryRun) continue;
    await prisma.service.update({
      where: { id: service.id },
      data: {
        ...(name ? { name } : {}),
        ...(description ? { description } : {}),
      },
    });
  }

  // --- Providers: description ----------------------------------------
  const providers = await prisma.provider.findMany({ select: { id: true, description: true } });
  report.providers.scanned = providers.length;
  for (const provider of providers) {
    if (hasSpanish(asLocalized(provider.description))) continue;
    const description = repair(provider.description);
    if (!description) {
      report.providers.unfixable.push(provider.id);
      continue;
    }
    report.providers.fixed += 1;
    log(`  · provider ${provider.id}: description`);
    if (dryRun) continue;
    await prisma.provider.update({ where: { id: provider.id }, data: { description } });
  }

  // --- Categories: name ----------------------------------------------
  const categories = await prisma.category.findMany({ select: { id: true, name: true } });
  report.categories.scanned = categories.length;
  for (const category of categories) {
    if (hasSpanish(asLocalized(category.name))) continue;
    const name = repair(category.name);
    if (!name) {
      report.categories.unfixable.push(category.id);
      continue;
    }
    report.categories.fixed += 1;
    log(`  · category ${category.id}: name`);
    if (dryRun) continue;
    await prisma.category.update({ where: { id: category.id }, data: { name } });
  }

  return report;
}
