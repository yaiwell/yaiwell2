# DO.md — Beauly

> Registro de tareas completadas. Cada entrada incluye fecha (YYYY-MM-DD) y descripción breve.
> Las tareas se mueven aquí desde `TODO.md` cuando se terminan.
> Las entradas más recientes van arriba.

---

## 2026-05

### 2026-05-19

- **shadcn/ui instalado y configurado con paleta `stone` + Radix.**
  - Inicializado shadcn v4 (`npx shadcn@latest init`) con preset **Nova** (Lucide + Geist) y base **Radix UI** (frente a Base UI, que es más nueva y con menos recursos en internet).
  - `components.json` configurado: `style: radix-nova`, `baseColor: stone`, `iconLibrary: lucide`, alias `@/components`, `@/components/ui`, `@/lib`, `@/lib/utils`, `@/hooks`, `rsc: true`, `tsx: true`, `cssVariables: true`.
  - **Paleta `stone` aplicada manualmente en `src/app/globals.css`.** Decisión de marca: stone (gris cálido con tinte amber, evoca papel natural / madera / piedra de spa) frente a neutral/slate/gray/zinc por encajar con la estética "premium, unisex, bienestar" definida en `VISION.md` y guardada en memoria. Cubre tema claro y oscuro con valores OKLCH oficiales de shadcn v4 stone.
  - Generado primer componente: `src/components/ui/button.tsx` (con primitiva `Slot` de Radix UI y variantes via `cva`, todas las variantes default/outline/secondary/ghost/destructive/link + sizes default/xs/sm/lg/icon/icon-xs/icon-sm/icon-lg).
  - Generado helper `src/lib/utils.ts` con `cn()` (clsx + tailwind-merge), tal como prevé el patrón de `CLAUDE.md` sección 6.bis.
  - Dependencias de producción añadidas: `radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css`, `lucide-react` (ver siguiente tarea — esto cierra también "Configurar Lucide React").
  - Limpieza: removidos `@base-ui/react` (sin uso tras switch a Radix) y `shadcn` CLI movido a `devDependencies`.
  - Verificado: `typecheck`, `lint`, `format:check` y `npm run build` pasan limpios. Build de producción: compila en ~1.5s con Turbopack.
- **Lucide React configurado.** Instalado como dependencia (`lucide-react ^1.16.0`) y registrado en `components.json` como `iconLibrary: "lucide"`, para que cada componente añadido vía `npx shadcn@latest add` use Lucide automáticamente.
- **Bootstrapping del proyecto Next.js (Bloque A — parcial).**
  - Inicializado el proyecto con `create-next-app`: **Next.js 16.2.6** (no v15 como decía el `TODO.md` original), React 19.2.4, Tailwind CSS v4, TypeScript 5 con `strict: true`, App Router. Alias `@/*` → `./src/*` configurado en `tsconfig.json`. Dev server verificado en `localhost:3000` con Turbopack.
  - Reorganizada documentación: movidos `CLAUDE.md`, `VISION.md`, `TODO.md`, `DO.md`, `README.md` de `C:\JORGE\` a la raíz del proyecto. Borrado el `CLAUDE.md` que generó Next.js (solo contenía `@AGENTS.md`) y añadida la directiva `@AGENTS.md` al inicio de nuestro `CLAUDE.md`. Actualizada la sección 2 del `CLAUDE.md` con `Next.js 16`.
- **Tooling de calidad de código: ESLint + Prettier + lint-staged + Husky + commitlint.**
  - `eslint.config.mjs` endurecido sobre la base de `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`: prohibido `@typescript-eslint/no-explicit-any`, `no-unused-vars` con escape `_`, `consistent-type-imports` con estilo inline, `no-console` (permite `warn`/`error`), `prefer-const`, `no-var`. Integración con Prettier vía `eslint-config-prettier/flat` al final del array.
  - `.prettierrc.json` con `singleQuote`, `trailingComma: all`, `printWidth: 100`, `endOfLine: lf`, plugin `prettier-plugin-tailwindcss` para ordenar clases. `.prettierignore` excluye `node_modules`, build outputs, env y **los `.md` de documentación** (los mantenemos formateados a mano para no romper tablas/saltos cuidados en castellano).
  - `commitlint.config.mjs` con `@commitlint/config-conventional` y `type-enum` cerrado a `feat/fix/refactor/chore/docs/test/style/perf/build/ci/revert`. Asunto libre en castellano, header máximo 100.
  - Husky inicializado (`npx husky init`), `core.hooksPath = .husky/_` verificado. Hooks: `pre-commit` → `npx lint-staged`; `commit-msg` → `commitlint --edit "$1"`. `lint-staged` configurado en `package.json` con globs para `.ts/.tsx/.js/.jsx/.mjs/.cjs` (eslint --fix + prettier --write) y `.json/.md/.css/.yaml/.yml` (prettier --write).
  - Scripts npm añadidos: `format`, `format:check`, `lint:fix`, `typecheck`. Verificación final: `typecheck`, `lint` y `format:check` pasan limpios sin warnings.

### 2026-05-18

- **Convenciones de código codificadas en `CLAUDE.md` sección 6.bis.** Reglas no negociables establecidas:
  - **Idioma:** código en inglés, comentarios y commits en castellano, textos al usuario via i18n (es/ca).
  - **Comentarios JSDoc obligatorios** en funciones públicas, explicando el *por qué* no el *qué*.
  - **Separación estricta UI / lógica / estilos / tipos** en archivos separados (`Componente.tsx`, `Componente.logic.ts`, `Componente.styles.ts`, `Componente.types.ts`, `index.ts`).
  - **Separación estricta backend** (`servicio.service.ts`, `servicio.repository.ts`, `servicio.validation.ts`, `servicio.types.ts`, `servicio.errors.ts`, `index.ts`).
  - **Estilos con Tailwind agrupados en `*.styles.ts`** (opción 1: objetos de clases agrupadas por elemento + `cva` para variantes). Nada de Tailwind largo inline en JSX.
  - **Máximo 250 líneas por archivo.** Imports ordenados en 3 grupos. Re-exports limpios desde `index.ts`.
  - **Validación con Zod en cada borde del sistema** + errores tipados como clases específicas.
- **Documentación de visión y operativa.** Creados dos archivos complementarios:
  - `VISION.md` con visión de producto, posicionamiento frente a competidores, modelo de negocio, diferenciadores prioritarios, principios y antiprincipios de diseño, criterios de éxito y filosofía del proyecto. Documento maestro para cualquier decisión de producto.
  - `README.md` operativo con requisitos, primer arranque, comandos disponibles, estructura del proyecto, flujo Git y política de seguridad. Puerta de entrada al repo.
- **Decisión arquitectónica: cero APIs de IA con coste en MVP.** Se elimina del stack: Anthropic API, OpenAI embeddings, pgvector. El buscador se implementa con PostgreSQL full-text search nativo (`tsvector`, `tsquery`, `pg_trgm`) — gratis, suficiente para los primeros 12-18 meses y sin dependencias externas. El buscador semántico y el onboarding asistido por IA pasan a Fase 3, condicionados a tener ingresos que justifiquen costes recurrentes de inferencia.
- **Documentación base del proyecto.** Creados los tres archivos pilares del repositorio:
  - `CLAUDE.md` con contexto técnico, stack, decisiones arquitectónicas, reglas del proyecto y flujo de trabajo con Claude Code.
  - `TODO.md` con desglose de tareas para Fase 0 (esqueleto + infra) y referencia genérica de Fase 1, 2 y 3.
  - `DO.md` con plantilla de registro de progreso.

---

*Nuevas entradas se añaden encima, agrupadas por mes.*
