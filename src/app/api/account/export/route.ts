import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { buildAccountExport } from '@/lib/services/account';

/**
 * Descarga la copia de datos del usuario autenticado (RGPD, acceso y
 * portabilidad). No admite parámetros: solo se pueden pedir los propios datos.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  try {
    const data = await buildAccountExport(userId);
    const date = data.exportedAt.toISOString().slice(0, 10);
    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="yaiwell-datos-${date}.json"`,
        // Datos personales: ni el navegador ni un proxy deben guardarlos.
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[api/account/export] export failed:', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
