/**
 * Proxy de forward geocoding (texto → coordenadas).
 *
 * Aunque `geocodeAddress` se puede llamar desde cliente (el token es
 * `NEXT_PUBLIC_MAPBOX_TOKEN`, intencionadamente público con
 * restricción por dominio en el dashboard de Mapbox), ruteamos a
 * través del backend por dos motivos:
 *  - **Anti-abuso**: requerimos sesión Clerk para que un anónimo no
 *    pueda quemar la cuota gratuita haciendo scrape.
 *  - **Observabilidad**: el día que metamos cache (Redis) o
 *    fallback a otro proveedor, solo cambia el handler.
 */
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z, ZodError } from 'zod';

import { geocodeAddress, MapboxConfigError, MapboxRequestError } from '@/lib/integrations/mapbox';

// Validación de los query params. Aceptamos los 4 locales soportados
// + un país opcional para overridear el default (algún usuario podría
// vivir en frontera y querer FR/PT).
const querySchema = z.object({
  q: z.string().trim().min(2).max(120),
  language: z.enum(['es', 'ca', 'en', 'de']).optional(),
  country: z.string().length(2).optional(),
  limit: z.coerce.number().int().min(1).max(10).optional(),
  proximityLat: z.coerce.number().min(-90).max(90).optional(),
  proximityLng: z.coerce.number().min(-180).max(180).optional(),
});

export async function GET(request: Request) {
  // Auth obligatorio. El endpoint no es público.
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Sesión requerida.' } },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const raw = {
    q: url.searchParams.get('q') ?? '',
    language: url.searchParams.get('language') ?? undefined,
    country: url.searchParams.get('country') ?? undefined,
    limit: url.searchParams.get('limit') ?? undefined,
    proximityLat: url.searchParams.get('proximityLat') ?? undefined,
    proximityLng: url.searchParams.get('proximityLng') ?? undefined,
  };

  let params: z.infer<typeof querySchema>;
  try {
    params = querySchema.parse(raw);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: { code: 'INVALID_QUERY', issues: err.issues } },
        { status: 400 },
      );
    }
    throw err;
  }

  // Reensamblamos las coordenadas de `proximity` si ambas vienen.
  const proximity =
    params.proximityLat !== undefined && params.proximityLng !== undefined
      ? { lat: params.proximityLat, lng: params.proximityLng }
      : undefined;

  try {
    const results = await geocodeAddress(params.q, {
      language: params.language,
      country: params.country ?? 'es',
      limit: params.limit ?? 5,
      proximity,
    });
    return NextResponse.json({ results });
  } catch (err) {
    if (err instanceof MapboxConfigError) {
      // 503 porque es un fallo operativo (falta env), no del cliente.
      return NextResponse.json(
        { error: { code: err.code, message: 'Geocoding no configurado.' } },
        { status: 503 },
      );
    }
    if (err instanceof MapboxRequestError) {
      // Si Mapbox responde 429 (rate limit) propagamos para que el
      // cliente pueda hacer backoff. El resto se ven como 502.
      const status = err.status === 429 ? 429 : 502;
      return NextResponse.json({ error: { code: err.code, status: err.status } }, { status });
    }
    // Cualquier otro error es bug; Sentry recogerá el stack.
    return NextResponse.json({ error: { code: 'INTERNAL' } }, { status: 500 });
  }
}
