import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { StorageConfigError } from './storage.errors';

/**
 * Clientes Supabase singleton para uso en server-side.
 *
 * Hay dos sabores:
 *
 *  - `getSupabaseServiceClient()` usa la `SUPABASE_SERVICE_ROLE_KEY` y
 *    bypassa todas las RLS policies. **Solo se importa desde server**
 *    (el marker `server-only` rompe el build si algún Client Component
 *    lo intenta). Es el cliente que usamos para subir/borrar de Storage
 *    desde el backend tras validar la autorización en `/api/storage/*`.
 *
 *  - `getSupabaseAnonClient()` usa la `NEXT_PUBLIC_SUPABASE_ANON_KEY`
 *    y respeta RLS. Hoy no se usa en producción (toda la lógica pega
 *    a la BD vía Prisma + service role); lo dejamos disponible para
 *    futuros casos como realtime channels o reads desde la edge.
 *
 * Inicialización perezosa: instanciamos el cliente solo la primera vez
 * que alguien lo pide. Esto permite que `next build` recolecte page-data
 * de rutas que importan este módulo sin tener las envs disponibles —
 * solo son obligatorias en runtime, cuando una request real golpea Storage.
 *
 * Por qué no inicializar `auth.persistSession`: en server no hay
 * navegador donde persistir la sesión, y además no usamos Supabase Auth
 * (la auth vive en Clerk). Desactivarlo evita warnings y leaks de memoria
 * en serverless.
 */

let cachedService: SupabaseClient | null = null;
let cachedAnon: SupabaseClient | null = null;

export function getSupabaseServiceClient(): SupabaseClient {
  if (cachedService) return cachedService;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new StorageConfigError(
      'NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no están configurados.',
    );
  }

  cachedService = createClient(url, serviceKey, {
    auth: {
      // No hay navegador en server; cualquier persistencia es ruido.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    // Identificador útil para distinguir nuestras requests en los logs
    // de Supabase. No filtra PII.
    global: {
      headers: {
        'x-yaiwell-client': 'service-role',
      },
    },
  });

  return cachedService;
}

export function getSupabaseAnonClient(): SupabaseClient {
  if (cachedAnon) return cachedAnon;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new StorageConfigError(
      'NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY no están configurados.',
    );
  }

  cachedAnon = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        'x-yaiwell-client': 'anon',
      },
    },
  });

  return cachedAnon;
}

/**
 * Helper interno para tests: limpia ambos singletons para que cada test
 * pueda forzar una re-inicialización con env distinto.
 */
export function __resetSupabaseClientsForTests() {
  cachedService = null;
  cachedAnon = null;
}
