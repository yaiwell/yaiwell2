import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  getSlotsForService,
  InvalidScheduleError,
  ProfessionalNotFoundError,
  ServiceForAvailabilityNotFoundError,
} from '@/lib/services/availability';
import type { Slot } from '@/lib/services/availability';

/**
 * Endpoint público de slots disponibles para un servicio en un día.
 *
 * `GET /api/availability/services/{serviceId}?date=YYYY-MM-DD`
 *
 * Diseño:
 *  - Público (lo consume el `SlotPicker` desde la ficha del servicio sin
 *    auth). No expone datos sensibles: solo las horas libres de un
 *    profesional cuyo proveedor ya es público.
 *  - Validamos el `date` query con Zod a `YYYY-MM-DD` para no aceptar
 *    formatos ambiguos que cambien de día según la zona horaria del
 *    cliente. Construimos el `Date` como medianoche UTC del día pedido
 *    — el motor `computeAvailableSlots` trabaja en UTC.
 *  - Devolvemos siempre los slots como `Array<{startAtIso, endAtIso,
 *    available: true}>` para que el cliente reuse el tipo `BookingSlot`
 *    ya conocido. `available` es constante porque el motor sólo
 *    devuelve libres (los ocupados quedan fuera de la lista).
 */

/**
 * Forma del slot que devuelve el endpoint, alineada con `BookingSlot`
 * del cliente. Mantener `available: true` literal facilita que un día
 * podamos extender el endpoint para devolver también ocupados (slots
 * con `available: false`) sin romper consumidores actuales.
 */
interface SlotDto {
  startAtIso: string;
  endAtIso: string;
  available: true;
}

interface SlotsSuccess {
  slots: SlotDto[];
  took: number;
}

interface SlotsError {
  error: { code: string; message: string };
}

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u, {
  message: 'El parámetro `date` debe tener formato YYYY-MM-DD.',
});

const querySchema = z.object({
  date: dateSchema,
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ serviceId: string }> },
): Promise<NextResponse<SlotsSuccess | SlotsError>> {
  const started = performance.now();
  const { serviceId } = await context.params;

  // 1. Validamos `serviceId` mínimamente (longitud razonable) para
  //    cortar peticiones obviamente inválidas antes de tocar BD.
  if (!serviceId || serviceId.length > 64) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'serviceId inválido.' } },
      { status: 400 },
    );
  }

  // 2. Validamos `date` con Zod. Construimos `Date` como medianoche UTC.
  const raw = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = querySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'BAD_REQUEST',
          message: parsed.error.issues[0]?.message ?? 'Parámetros inválidos.',
        },
      },
      { status: 400 },
    );
  }
  // `new Date('YYYY-MM-DD')` interpreta como medianoche UTC — lo que el
  // motor `computeAvailableSlots` espera.
  const date = new Date(`${parsed.data.date}T00:00:00.000Z`);

  // 3. Delegamos al servicio.
  try {
    const slots = await getSlotsForService(serviceId, date);
    const dto: SlotDto[] = slots.map((slot: Slot) => ({
      startAtIso: slot.startAt.toISOString(),
      endAtIso: slot.endAt.toISOString(),
      available: true,
    }));
    const took = Math.round(performance.now() - started);
    return NextResponse.json({ slots: dto, took });
  } catch (err) {
    if (err instanceof ServiceForAvailabilityNotFoundError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: 404 },
      );
    }
    if (err instanceof ProfessionalNotFoundError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: 404 },
      );
    }
    if (err instanceof InvalidScheduleError) {
      // El horario del profesional está corrupto en BD: log para Sentry
      // y devolvemos lista vacía con 200 para no romper la UI del picker.
      console.error('[api/availability] schedule inválido:', err.issues);
      return NextResponse.json({ slots: [], took: Math.round(performance.now() - started) });
    }
    console.error('[api/availability] error inesperado:', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Error inesperado al calcular slots.' } },
      { status: 500 },
    );
  }
}
