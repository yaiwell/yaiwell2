/**
 * Guarda contra un fallo que los tests unitarios no ven: en un fichero
 * `'use server'`, `export type { X };` se compila como una exportación real.
 * Al cargarse el módulo salta `ReferenceError: X is not defined` y fallan todas
 * las server actions de las páginas que lo cargan, aunque no usen esa acción.
 * `export type { X } from '...'` sí es seguro.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const ROOT = path.join(process.cwd(), 'src');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [full] : [];
  });
}

/** Exportaciones de tipos sin `from` (`export type { X };`, `export { type X };`). */
function findLocalTypeReexports(source: string): string[] {
  const pattern = /^export\s+(?:type\s+\{[^}]*\}|\{[^}]*\btype\s[^}]*\})\s*(from\b)?[^;\n]*;?/gm;
  return [...source.matchAll(pattern)].filter((m) => !m[1]).map((m) => m[0]);
}

describe('ficheros use server', () => {
  it('detecta la forma peligrosa y acepta la segura', () => {
    expect(findLocalTypeReexports('export type { A };')).toHaveLength(1);
    expect(findLocalTypeReexports('export { type A };')).toHaveLength(1);
    expect(findLocalTypeReexports("export type { A } from './a';")).toEqual([]);
    expect(findLocalTypeReexports('export type A = string;')).toEqual([]);
  });

  it('ninguno reexporta tipos locales', () => {
    const offenders = sourceFiles(ROOT).flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      if (!/^['"]use server['"];?/m.test(source)) return [];
      return findLocalTypeReexports(source).map((line) => `${path.relative(ROOT, file)}: ${line}`);
    });

    expect(offenders).toEqual([]);
  });
});
