import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

import es from '../../src/messages/es.json';

/**
 * Coherencia UI <-> servidor del selector de huecos y del resumen de
 * reserva (antelación mínima de 30 min, grupo de última hora < 2 h y
 * política de cancelación dinámica).
 *
 * Solo lectura: no inicia sesión, no crea reservas y no paga. El flujo
 * permite llegar al resumen sin autenticarse (la creación de la reserva
 * `pending` y el login ocurren al pasar de "Ir al pago"), así que nos
 * paramos justo antes de ese botón.
 *
 * Es no determinista por naturaleza (depende de la hora de ejecución):
 * si hoy no quedan huecos de un tipo, el test correspondiente se salta
 * con motivo en lugar de fallar.
 */

const TZ = 'Europe/Madrid';
const MIN_LEAD_MIN = 30;
const LAST_MINUTE_MIN = 120;
const BOOKING_PICKER = es.booking.slotPicker;

test.use({ locale: 'es-ES', timezoneId: TZ, navigationTimeout: 120_000 });
test.setTimeout(90_000);

interface Target {
  slugWithId: string;
  serviceId: string;
  /** Mapa "HH:MM" (Madrid) -> ISO del inicio, según la API. */
  isoByLabel: Map<string, string>;
}

const hmFormatter = new Intl.DateTimeFormat('es-ES', {
  timeZone: TZ,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});
const ymdFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: TZ });

/** Minutos desde medianoche (Madrid) de un instante. */
function madridMinutes(ms: number): number {
  const [h, m] = hmFormatter.format(new Date(ms)).split(':').map(Number);
  return h * 60 + m;
}

function labelToMinutes(label: string): number {
  const [h, m] = label.split(':').map(Number);
  return h * 60 + m;
}

async function fetchSlots(
  request: APIRequestContext,
  serviceId: string,
): Promise<Map<string, string>> {
  const res = await request.get(
    `/api/availability/services/${serviceId}?date=${ymdFormatter.format(new Date())}`,
  );
  const map = new Map<string, string>();
  if (!res.ok()) return map;
  const body = (await res.json()) as { slots: Array<{ startAtIso: string }> };
  for (const slot of body.slots)
    map.set(hmFormatter.format(new Date(slot.startAtIso)), slot.startAtIso);
  return map;
}

/**
 * Recorre las fichas del listado hasta dar con un servicio con huecos
 * hoy. Prefiere el que tenga huecos de ambos tipos (última hora y con
 * margen) para poder cubrir todo con un solo centro.
 */
async function findTarget(page: Page, request: APIRequestContext): Promise<Target | null> {
  await page.goto('/es/buscar');
  const hrefs = await page
    .locator('a[href*="/es/centro/"]')
    .evaluateAll((links) =>
      Array.from(new Set(links.map((a) => (a as HTMLAnchorElement).getAttribute('href') ?? ''))),
    );
  let fallback: Target | null = null;
  for (const href of hrefs.slice(0, 12)) {
    const slugWithId = href.split('/es/centro/')[1]?.split(/[/?#]/)[0];
    if (!slugWithId) continue;
    await page.goto(`/es/centro/${slugWithId}`);
    const ids = await page
      .locator('[data-component^="provider-services-list-item-"]')
      .evaluateAll((els) =>
        els.map((e) =>
          (e.getAttribute('data-component') ?? '').replace('provider-services-list-item-', ''),
        ),
      );
    for (const serviceId of ids.slice(0, 3)) {
      const isoByLabel = await fetchSlots(request, serviceId);
      if (isoByLabel.size === 0) continue;
      const target = { slugWithId, serviceId, isoByLabel };
      const leads = [...isoByLabel.values()].map(
        (iso) => (new Date(iso).getTime() - Date.now()) / 60_000,
      );
      const hasLast = leads.some((l) => l < LAST_MINUTE_MIN - 5);
      const hasMargin = leads.some((l) => l > LAST_MINUTE_MIN + 5);
      if (hasLast && hasMargin) return target;
      fallback ??= target;
    }
  }
  return fallback;
}

let target: Target | null = null;

// Serie: el descubrimiento del centro se hace una sola vez, y el primer
// acceso compila rutas del dev server (lento en frío).
test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ browser }) => {
  test.setTimeout(240_000);
  const context = await browser.newContext({ baseURL: 'http://localhost:3000' });
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(120_000);
  target = await findTarget(page, context.request);
  await context.close();
});

async function openPicker(page: Page) {
  const before = Date.now();
  await page.goto(`/es/centro/${target!.slugWithId}/reservar?serviceId=${target!.serviceId}`);
  const anySlot = page.locator('[data-component^="booking-slot-picker-slot-"]').first();
  // Si no aparece ningún botón es que a esa hora ya no quedan huecos hoy.
  await anySlot.waitFor({ state: 'visible', timeout: 20_000 }).catch(() => undefined);
  const after = Date.now();
  return { before, after };
}

/** Etiquetas HH:MM de los botones dentro y fuera del grupo de última hora. */
async function readSlotLabels(page: Page) {
  const lastMinuteGroup = page.getByRole('group', { name: BOOKING_PICKER.lastMinuteGroup });
  const all = await page
    .locator('[data-component^="booking-slot-picker-slot-"]')
    .evaluateAll((els) => els.map((e) => (e.textContent ?? '').trim()));
  const inGroup =
    (await lastMinuteGroup.count()) > 0
      ? await lastMinuteGroup
          .getByRole('button')
          .evaluateAll((els) => els.map((e) => (e.textContent ?? '').trim()))
      : [];
  return { all, inGroup };
}

test.describe('Selector de huecos y resumen: coherencia con la regla de 30 min / 2 h', () => {
  test.beforeEach(() => {
    test.skip(!target, 'Ningún centro sembrado tiene huecos hoy a esta hora.');
  });

  test('ningún hueco mostrado empieza a menos de 30 min y los de < 2 h están en el grupo de última hora', async ({
    page,
  }) => {
    const { before, after } = await openPicker(page);
    const { all, inGroup } = await readSlotLabels(page);
    test.skip(all.length === 0, 'Hoy ya no quedan huecos reservables (hora de ejecución tardía).');

    const beforeMin = madridMinutes(before);
    const afterMin = madridMinutes(after);

    // 2. Antelación mínima: el hueco se filtró con un "ahora" posterior a
    //    `before`, así que cualquier etiqueta debe cumplir contra `before`.
    for (const label of all) {
      expect(
        labelToMinutes(label),
        `hueco ${label} a menos de ${MIN_LEAD_MIN} min de ${hmFormatter.format(before)}`,
      ).toBeGreaterThanOrEqual(beforeMin + MIN_LEAD_MIN);
    }

    // 3. Agrupación. Los huecos al filo de las 2 h (±1 min de skew entre
    //    nuestro reloj y el de la página) se ignoran por ambiguos.
    const groupSet = new Set(inGroup);
    for (const label of all) {
      const min = labelToMinutes(label);
      if (min < beforeMin + LAST_MINUTE_MIN) {
        expect(
          groupSet.has(label),
          `${label} (< 2 h) debería estar en el grupo de última hora`,
        ).toBe(true);
      } else if (min >= afterMin + LAST_MINUTE_MIN + 1) {
        expect(
          groupSet.has(label),
          `${label} (>= 2 h) no debería estar en el grupo de última hora`,
        ).toBe(false);
      }
    }
    // Y nada dentro del grupo puede ser de >= 2 h.
    for (const label of inGroup) {
      expect(labelToMinutes(label)).toBeLessThan(afterMin + LAST_MINUTE_MIN + 1);
    }
  });

  test('hueco con margen: el resumen dice «Cancela gratis hasta» con inicio - 2 h', async ({
    page,
  }) => {
    const { after } = await openPicker(page);
    const { all, inGroup } = await readSlotLabels(page);
    const afterMin = madridMinutes(after);
    const label = all.find(
      (l) => !inGroup.includes(l) && labelToMinutes(l) >= afterMin + LAST_MINUTE_MIN + 5,
    );
    test.skip(!label, 'Hoy no quedan huecos con margen (> 2 h) en el centro elegido.');

    await page.getByRole('button', { name: label!, exact: true }).click();
    await page.locator('[data-component="booking-flow-next"]').click();

    const iso = target!.isoByLabel.get(label!);
    expect(iso, 'la API y el selector deben coincidir en el hueco').toBeTruthy();
    const deadlineMs = new Date(iso!).getTime() - LAST_MINUTE_MIN * 60_000;
    // Mismo formato que `formatSlotDateLong` (es-ES, hora local del navegador = Madrid).
    const expectedDeadline = new Intl.DateTimeFormat('es-ES', {
      timeZone: TZ,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(deadlineMs));

    const cancelLine = page.locator('[data-component="booking-summary-cancel-until"]');
    await expect(cancelLine).toBeVisible();
    await expect(cancelLine).toHaveText(
      es.booking.policy.cancelUntil.replace('{deadline}', expectedDeadline),
    );
    // Con margen no debe salir el aviso de última hora.
    await expect(page.locator('[data-component="booking-last-minute-policy"]')).toHaveCount(0);
  });

  test('hueco de última hora: el resumen avisa de que no es reembolsable', async ({ page }) => {
    const { before } = await openPicker(page);
    const { inGroup } = await readSlotLabels(page);
    const label = inGroup.find(
      (l) => labelToMinutes(l) < madridMinutes(before) + LAST_MINUTE_MIN - 3,
    );
    test.skip(!label, 'Hoy no hay huecos de última hora (< 2 h) a esta hora.');

    await page.getByRole('button', { name: label!, exact: true }).click();
    await page.locator('[data-component="booking-flow-next"]').click();

    await expect(
      page.getByRole('status').filter({ hasText: es.booking.lastMinute.policy }),
    ).toBeVisible();
    await expect(page.locator('[data-component="booking-summary-cancel-until"]')).toHaveCount(0);
  });

  // Regresión: el selector pinta la hora en Europe/Madrid y el límite de
  // cancelación también debe hacerlo, aunque el navegador esté en otra
  // zona (turista británico). Corregido el 2026-10-27 fijando `timeZone`
  // en `BookingSummary.logic.ts`.
  test.describe('navegador fuera de Madrid', () => {
    test.use({ timezoneId: 'Europe/London' });

    test('la hora límite de cancelación se muestra en la zona del centro', async ({ page }) => {
      const { after } = await openPicker(page);
      const { all, inGroup } = await readSlotLabels(page);
      const label = all.find(
        (l) =>
          !inGroup.includes(l) && labelToMinutes(l) >= madridMinutes(after) + LAST_MINUTE_MIN + 5,
      );
      test.skip(!label, 'Hoy no quedan huecos con margen (> 2 h).');

      await page.getByRole('button', { name: label!, exact: true }).click();
      await page.locator('[data-component="booking-flow-next"]').click();

      const deadlineMadrid = hmFormatter.format(
        new Date(new Date(target!.isoByLabel.get(label!)!).getTime() - LAST_MINUTE_MIN * 60_000),
      );
      await expect(page.locator('[data-component="booking-summary-cancel-until"]')).toContainText(
        deadlineMadrid,
      );
    });
  });
});
