/**
 * Código SQLSTATE de Postgres para `exclusion_violation`: lo lanza una
 * restricción `EXCLUDE` (p. ej. `bookings_no_overlap_confirmed`).
 */
const EXCLUSION_VIOLATION = '23P01';

/** Profundidad máxima al recorrer `cause`: evita bucles en errores cíclicos. */
const MAX_CAUSE_DEPTH = 5;

interface ErrorLike {
  code?: unknown;
  originalCode?: unknown;
  message?: unknown;
  originalMessage?: unknown;
  cause?: unknown;
  meta?: { code?: unknown; driverAdapterError?: unknown };
}

/**
 * Indica si un error de Prisma viene de una restricción de exclusión.
 *
 * Con Prisma 7 + `@prisma/adapter-pg` llega como `PrismaClientKnownRequestError`
 * con el SQLSTATE en `meta.driverAdapterError.cause.originalCode` (comprobado
 * contra Supabase el 2026-10-29, dentro y fuera de `$transaction`). Miramos
 * también `code`, `cause` y el mensaje por si otra versión lo coloca en otro
 * sitio.
 *
 * @param err — error capturado de una escritura Prisma.
 * @param constraint — si se pasa, solo cuenta la violación de esa restricción.
 */
export function isExclusionViolation(err: unknown, constraint?: string): boolean {
  const pending: unknown[] = [err];
  for (let visited = 0; pending.length > 0 && visited < MAX_CAUSE_DEPTH * 2; visited++) {
    const current = pending.shift();
    if (!current || typeof current !== 'object') continue;
    const candidate = current as ErrorLike;
    if (matches(candidate, constraint)) return true;
    pending.push(candidate.cause, candidate.meta?.driverAdapterError);
  }
  return false;
}

function matches(candidate: ErrorLike, constraint?: string): boolean {
  const codes = [candidate.code, candidate.originalCode, candidate.meta?.code];
  const text = [candidate.message, candidate.originalMessage]
    .filter((value): value is string => typeof value === 'string')
    .join(' ');
  const isExclusion =
    codes.includes(EXCLUSION_VIOLATION) ||
    text.includes(EXCLUSION_VIOLATION) ||
    text.includes('exclusion constraint');
  if (!isExclusion) return false;
  // Sin nombre de restricción en el texto no podemos afinar: lo damos por
  // bueno, porque el código ya garantiza que es una exclusión.
  if (!constraint || !text.includes('"')) return true;
  return text.includes(constraint);
}
