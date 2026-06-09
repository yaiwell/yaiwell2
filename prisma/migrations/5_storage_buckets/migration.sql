-- =========================================================================
-- Yaiwell — Supabase Storage: buckets + RLS
-- =========================================================================
--
-- Crea los 3 buckets que necesita el marketplace para alojar imágenes
-- y declara una RLS deny-all sobre `storage.objects` para los roles
-- `anon` y `authenticated`. Las lecturas siguen funcionando porque los
-- 3 buckets son públicos (flag `public = true`), pero TODA escritura
-- debe pasar por nuestro backend con `SUPABASE_SERVICE_ROLE_KEY`.
--
-- -------------------------------------------------------------------------
-- Decisión arquitectónica: deny-all RLS + service role en backend.
-- -------------------------------------------------------------------------
-- Yaiwell **no usa Supabase Auth** (delegamos en Clerk). Por tanto el
-- JWT que Supabase recibe por defecto no contiene el `clerkId` del usuario
-- autenticado y no podemos construir policies de ownership realistas
-- sobre `auth.jwt()` sin antes configurar un JWT template custom en
-- Clerk y pasarlo a `createClient()`. Esa integración existe pero añade
-- complejidad y fricción para el MVP.
--
-- En lugar de eso seguimos la guía oficial de Supabase para integraciones
-- externas: centralizamos la autorización en nuestro backend Next.js,
-- que llama a Storage con la `service_role` key (bypass total de RLS) y
-- aplica todas las reglas de negocio (sesión Clerk válida, dueño correcto,
-- tamaño, MIME, etc.) en `/app/api/storage/upload`. La RLS deny-all
-- queda como **defensa en profundidad** — si alguien filtrase la anon
-- key, no podría escribir nada en storage.
--
-- Las lecturas no necesitan policy porque los buckets están marcados
-- como `public = true`: Supabase Storage sirve URLs públicas firmadas
-- desde su CDN sin pasar por la API REST.
--
-- -------------------------------------------------------------------------
-- Estructura del path por bucket
-- -------------------------------------------------------------------------
--   provider-photos/<providerId>/<uuid>.<ext>
--   service-photos/<providerId>/<uuid>.<ext>
--   avatars/<clerkId>/<uuid>.<ext>
--
-- El backend valida en cada upload que el primer segmento del path
-- pertenece al usuario autenticado (clerkId o providerId del owner).

-- -------------------------------------------------------------------------
-- 1. Buckets
-- -------------------------------------------------------------------------
-- Límite: 5 MB por archivo (5 * 1024 * 1024 = 5242880 bytes).
-- MIME: solo formatos web modernos. Bloqueamos PDFs, SVG (XSS risk) y
-- vectores en general.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'provider-photos',
  'provider-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'service-photos',
  'service-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO NOTHING;

-- -------------------------------------------------------------------------
-- 2. RLS deny-all en storage.objects para anon + authenticated.
-- -------------------------------------------------------------------------
-- Supabase activa RLS en `storage.objects` por defecto. Sus templates
-- incluyen policies permisivas para buckets públicos: las eliminamos
-- y dejamos solo las nuestras.
--
-- Nota: las policies de SELECT NO son necesarias para que las URLs
-- públicas funcionen — los buckets con `public = true` se sirven vía
-- el endpoint `/storage/v1/object/public/...` que no consulta RLS.
-- Aún así dejamos un SELECT abierto para anon/authenticated por si
-- algún consumidor usa el SDK con la anon key para listar (no afecta
-- a privacidad porque los buckets son públicos por diseño).

-- Limpieza defensiva: borramos cualquier policy preexistente con los
-- mismos nombres para que la migración sea idempotente.
DROP POLICY IF EXISTS "yaiwell_storage_public_read" ON storage.objects;
DROP POLICY IF EXISTS "yaiwell_storage_deny_insert" ON storage.objects;
DROP POLICY IF EXISTS "yaiwell_storage_deny_update" ON storage.objects;
DROP POLICY IF EXISTS "yaiwell_storage_deny_delete" ON storage.objects;

-- Lectura abierta a cualquiera (los 3 buckets son públicos por diseño).
CREATE POLICY "yaiwell_storage_public_read"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id IN ('provider-photos', 'service-photos', 'avatars')
  );

-- INSERT denegado para anon/authenticated. Solo service_role escribe.
CREATE POLICY "yaiwell_storage_deny_insert"
  ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

-- UPDATE denegado.
CREATE POLICY "yaiwell_storage_deny_update"
  ON storage.objects
  FOR UPDATE
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- DELETE denegado.
CREATE POLICY "yaiwell_storage_deny_delete"
  ON storage.objects
  FOR DELETE
  TO anon, authenticated
  USING (false);

-- =========================================================================
-- TODOs para fases futuras:
--   - Si integramos JWT template de Clerk con Supabase Storage,
--     podremos pasar policies de ownership por path al cliente
--     (`(storage.foldername(name))[1] = requesting_clerk_user_id()`)
--     y permitir uploads directos desde el navegador con presigned URLs
--     firmadas por el cliente. Mientras tanto, el backend hace de proxy
--     y reescribe nombres con UUID para evitar enumeración.
--   - Considerar mover `avatars` a un bucket privado con URLs firmadas
--     de corta duración si se introduce contenido sensible (DNI, etc.).
-- =========================================================================
