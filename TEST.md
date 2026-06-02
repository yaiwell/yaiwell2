# TEST.md — Yeiwell

> Estrategia de testing del proyecto. Todo desarrollo nuevo debe ir acompañado de tests siguiendo lo descrito aquí. Reglas no negociables salvo justificación explícita en el PR.

---

## 1. Stack

- **Vitest** — runner de tests unitarios y de integración (rápido, ESM-first, compatible con la config de Vite/Tailwind v4).
- **@testing-library/react** + **@testing-library/jest-dom** + **@testing-library/user-event** — render y aserciones accesibles para componentes React.
- **happy-dom** — entorno DOM ligero (más rápido que jsdom). Si descubrimos incompatibilidades con alguna lib (poco probable), se puede cambiar a jsdom sin tocar los tests.
- **Playwright** — tests E2E sobre el dev server de Next.js. Configurado solo con Chromium (Desktop Chrome) para Fase 1; en Fase 2 se añadirá Firefox/WebKit si lo justifica el alcance del producto.

**Decisión sobre el binario de Chromium:** por defecto Playwright usa el **Chrome del sistema** (`channel: 'chrome'`) para evitar tener que descargar el bundle de Chromium en cada entorno. Si se quiere el Chromium oficial de Playwright (build determinista, recomendado para CI), exportar `PW_USE_CHROMIUM=1` antes de `npm run test:e2e` y haber ejecutado `npx playwright install chromium`.

---

## 2. Comandos

```bash
# Unit + integration (Vitest)
npm run test            # corre todos los tests una vez (modo CI).
npm run test:watch      # modo watch interactivo durante desarrollo.
npm run test:ui         # abre la UI web de Vitest.

# E2E (Playwright)
npm run test:e2e        # arranca dev server y corre los specs.
npm run test:e2e:ui     # UI interactiva de Playwright (debug visual).
```

Para tests aislados:

```bash
npx vitest run src/lib/utils/provider-slug.test.ts
npx playwright test tests/e2e/provider-flow.spec.ts
```

---

## 3. Qué se testea SIEMPRE (no negociable)

- **Servicios** (`src/lib/services/**`) — lógica de negocio (booking, payments, search, providers, reviews). Cobertura completa de happy path + casos límite + errores tipados.
- **Repositories** (`src/lib/db/**`) — queries Prisma y mappers a tipos de dominio. Verificar que las queries piden los campos correctos y que los mappers no pierden información.
- **Utils** (`src/lib/utils/**`) — funciones puras. 100% de cobertura porque son baratas de testear y suelen alimentar a varios sitios.
- **Validation schemas** (`src/lib/validation/**`) — uno o varios tests por schema cubriendo casos válidos e inválidos relevantes (no hace falta el producto cartesiano, sí los límites).
- **Hooks custom no triviales** — testar con `@testing-library/react` (`renderHook`) cuando el hook tenga estado, efectos o lógica de cálculo.
- **Componentes con lógica condicional** — variantes (`cva`), estados visibles diferenciados, branches por props. No testar componentes presentacionales puros.

---

## 4. Qué se testea con E2E

- **Happy paths críticos**: búsqueda, ficha de proveedor, reserva (cuando exista, con Stripe/Clerk en mock), login mock.
- **Cambio de idioma**: `/buscar` vs `/ca/buscar` muestran textos del locale correcto.
- **404**: rutas inexistentes y proveedores con slug mal formado responden con la página `not-found` adecuada.
- **Áreas privadas**: rutas protegidas redirigen a Clerk cuando no hay sesión (verificación de comportamiento, no del flujo completo de auth).

---

## 5. Qué NO se testea

- **Componentes puramente presentacionales** sin lógica condicional.
- **Strings i18n** (la presencia se verifica con `next-intl` y typecheck del namespace).
- **Integraciones externas en unit**: Stripe, Clerk, Resend, Mapbox van en E2E con mocks/test mode.
- **Third-party libs** (Leaflet, Radix, shadcn) — confiamos en su propia suite.
- **Tipos**: ya los cubre `npm run typecheck`.

---

## 6. Convenciones

- **Tests co-ubicados con módulos puros**: `foo.test.ts` junto a `foo.ts` (caso de servicios, utils, repositorios). Reduce fricción para encontrarlos y mantenerlos en sync.
- **Tests de componentes co-ubicados**: `Component.test.tsx` dentro de la carpeta del componente.
- **E2E siempre en `tests/e2e/`**, agrupados por flujo de usuario (no por entidad técnica).
- **Nombrado**: `describe` en inglés con el nombre exacto de la función/componente (`describe('createBooking', ...)`). Las descripciones de los casos van en **castellano** y describen comportamiento observable (`it('lanza SlotUnavailableError cuando hay solapamiento', ...)`).
- **Un `describe` por función o componente, un `it` por caso**.
- **AAA pattern explícito** (Arrange / Act / Assert) — con líneas en blanco entre bloques cuando el test crece. Para tests muy cortos se puede omitir, pero la estructura mental debe mantenerse.
- **Comentarios en castellano** explicando el _por qué_ del test cuando no sea evidente (regresiones, casos límite con contexto de negocio).
- **Sin tests "smoke" inútiles**: `it('renders without crashing')` está prohibido — siempre se testa comportamiento observable.
- **No mockear lo que se puede usar real**: helpers puros, factories de datos fake (ya disponibles en `src/lib/fake-data/*`).

---

## 7. Tests por capa con ejemplo mínimo

### 7.1 Unit (función pura)

`src/lib/utils/provider-slug.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { buildProviderSlugWithId, parseProviderIdFromSlugWithId } from './provider-slug';

describe('buildProviderSlugWithId', () => {
  it('compone el segmento concatenando slug y id con guión', () => {
    const provider = { slug: 'atelier-norte', id: 'prov-01' };

    const segment = buildProviderSlugWithId(provider);

    expect(segment).toBe('atelier-norte-prov-01');
  });
});
```

### 7.2 Componente (React Testing Library)

`src/components/features/search/AvailabilityBadge/AvailabilityBadge.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';

import { AvailabilityBadge } from './AvailabilityBadge';

const messages = {
  search: {
    availability: { now: 'Disponible ahora', soon: 'En {minutes} min', busy: 'Sin hueco hoy' },
  },
};

describe('AvailabilityBadge', () => {
  it('muestra "Disponible ahora" para status available_now', () => {
    render(
      <NextIntlClientProvider locale="es" messages={messages}>
        <AvailabilityBadge status="available_now" />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Disponible ahora');
  });
});
```

### 7.3 E2E (Playwright)

`tests/e2e/provider-flow.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('navega de la home a un servicio dentro de una ficha de proveedor', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-component="hero"]')).toBeVisible();

  await page.goto('/buscar?q=masajes');
  const firstCard = page.locator('[data-component^="provider-card-"]').first();
  await firstCard.click();

  const firstService = page.locator('[data-component^="provider-services-list-item-"]').first();
  await firstService.click();

  await expect(page.getByRole('dialog')).toBeVisible();
});
```

---

## 8. Cobertura

- **No exigimos % global de cobertura**. La métrica por sí sola se gamifica y produce tests inútiles.
- **Exigimos cobertura completa en**:
  - Servicios (`src/lib/services/**`): todos los caminos, incluidos los errores tipados.
  - Validations (`src/lib/validation/**`): casos válidos e inválidos relevantes.
- **Componentes**: cubrir todas las **variantes visibles** y los **estados condicionales** (props que cambian render). Los puramente presentacionales no requieren test.
- Para activar el reporte HTML local: `npx vitest run --coverage` (requiere instalar `@vitest/coverage-v8` cuando haga falta).

---

## 9. Cuándo se ejecutan

- **Antes de cada commit (manual)**: `npm run typecheck && npm run lint && npm run test`. En Fase 1 se añadirá un hook de **husky pre-push** que lo ejecute automáticamente.
- **Antes de cada deploy a producción**: además de lo anterior, `npm run test:e2e`.
- **En CI** (cuando esté montado): los tres bloques en el mismo workflow, con `npm ci` previo. Los E2E se ejecutan con `PW_USE_CHROMIUM=1` y `npx playwright install --with-deps chromium` para tener un binario determinista.

---

## 10. Reglas para Claude Code / agentes

- **Cualquier feature nueva incluye sus tests en el mismo PR/commit.** Sin excepciones para "lo testeo después".
- Si una validación, servicio o util se modifica, hay que **añadir o actualizar el test correspondiente**.
- **Bug fixes incluyen un test de regresión** que:
  1. Falla en `main` sin el fix.
  2. Pasa con el fix aplicado.
- Si un test queda intencionalmente desactivado (`it.skip`), debe ir acompañado de un comentario en castellano que explique el porqué y un enlace al issue/TODO de seguimiento.
- Si un agente propone introducir mocks pesados o helpers de test complejos, **cuestionar antes**: probablemente el código está mal diseñado y conviene refactor.
