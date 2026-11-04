-- 9i: francés como quinto idioma.
--
-- Aplicar con `npx prisma migrate deploy` (puerto 5432), ANTES de desplegar el
-- código que puede guardar `users.locale = 'fr'`.
--
-- `ADD VALUE` se admite dentro de una transacción desde PostgreSQL 12 mientras
-- el valor no se use en ella; aquí no se usa.
ALTER TYPE "Locale" ADD VALUE IF NOT EXISTS 'fr';

-- Nombres de categoría en francés, por slug (el slug es estable). Sin esto la
-- web en francés las enseñaría en castellano. Idempotente.
UPDATE "categories" AS c
SET "name" = c."name" || jsonb_build_object('fr', t.fr)
FROM (VALUES
  ('belleza', 'Beauté'),
  ('bienestar', 'Bien-être'),
  ('deporte', 'Sport'),
  ('estetica', 'Esthétique'),
  ('gimnasio', 'Salle de sport'),
  ('padel', 'Padel'),
  ('tenis', 'Tennis'),
  ('yoga', 'Yoga'),
  ('manicura-pedicura', 'Manucure et pédicure'),
  ('maquillaje', 'Maquillage'),
  ('peluqueria', 'Coiffure'),
  ('masaje-deportivo', 'Sportif'),
  ('masaje-relajante', 'Relaxant'),
  ('masaje-tailandes', 'Thaïlandais'),
  ('peluqueria-color', 'Coloration'),
  ('peluqueria-corte', 'Coupe'),
  ('peluqueria-peinado', 'Coiffage'),
  ('masajes', 'Massages'),
  ('spa', 'Spa'),
  ('terapias', 'Thérapies'),
  ('corporal', 'Corps'),
  ('depilacion', 'Épilation'),
  ('facial', 'Visage')
) AS t(slug, fr)
WHERE c."slug" = t.slug;
