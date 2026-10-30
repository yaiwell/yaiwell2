---
name: e2e-env-quirks
description: Particularidades del entorno E2E de Yaiwell en esta máquina (puerto, Clerk, red, tsconfig)
metadata:
  type: reference
---

- Si el 3000 está ocupado por un dev server viejo, usar `E2E_PORT=3001` (distDir `.next-e2e-3001`). Al acabar: borrar esa carpeta y `git checkout tsconfig.json` (Next lo reescribe).
- `clerk.signIn` necesita una página con Clerk JS cargado: ir a `/es/entrar` con `waitUntil: 'domcontentloaded'` (en `/es` nunca carga; con 'load' puede dar ERR_TIMED_OUT).
- La red a api.clerk.com desde Node falla a ratos (`fetch failed` / UND_ERR_CONNECT_TIMEOUT) aunque curl funcione: reintentar y hacer `deleteUser` con reintentos en afterAll; tras un fallo, listar usuarios `e2e-review-` en Clerk por si queda huérfano.
- Cliente de test: usuario Clerk `e2e-review-<ts>+clerk_test@example.com` con `publicMetadata.role='client'` + fila `users` (id text vía gen_random_uuid()::text); no existe cliente seed utilizable en Clerk.
- Studio Aura (provider 70a8dc5a-…) debe partir y acabar en ratingAvg/Count 0/0.
- Con 6 workers en frío el dev server devuelve 500 intermitentes ("Internal Server Error") sobre todo si alguien edita `src/` mientras corre; repetir antes de dar un 500 por bug. Esperar siempre a que el botón de Clerk esté habilitado (hidratación) antes de clicar pestañas.
- Para probar salidas a Google/Clerk: `page.route` abortando documentos fuera de localhost y leer `postData` de `POST .../v1/client/sign_ins` (ahí viaja `redirect_url`, no en la URL de Google). Spec: `tests/e2e/google-auth-button.spec.ts`.
- Fechas con `pg` directo: las columnas `timestamp(3)` de Prisma son SIN zona (UTC). `pg` serializa/parsea `Date` en hora local (Madrid), así que el viaje de ida y vuelta parece correcto pero la app ve la fecha desplazada 1-2 h. Usar `connectDb()` de `tests/e2e/utils/slot-offers-seed.ts` (parser UTC para OID 1114) y pasar `date.toISOString()` en los INSERT. `provider-calendar.spec.ts` NO lo hace (sus horas están corridas respecto a lo que ve la app).
- Checkout real sin pagar: hace falta un centro con `stripeAccountId` chargeable. `seedCenter` crea una cuenta Custom ES de test (datos `address_full_match`, id_number 000000000, IBAN ES0700120345030000067890); tarda 10-60 s en activar cargos; se borra con `accounts.del` en teardown. Studio Aura es la única cuenta real del seed.
- Etiqueta de oferta del listado (`provider-card-slot-offer`) es HERMANA de la card, no hija: localizarla por `a[...][href*="<slugWithId>"]`.
- Tras publicar en el diálogo de liberar hueco el título cambia: localizar por `data-component="release-slot-dialog"`, no por nombre.
- Specs del pago en el local (customer-cancel, onsite-payment, onsite-no-show, become-provider) usan `utils/onsite-seed.ts` (negocio sin Stripe, `stripeCustomerId` falso, usuarios Clerk DEV propios) y `utils/sign-in.ts` (`signInAs` con reintentos: `clerk.signIn` se cuelga sin límite con varios workers). Limpieza verificada con `leftovers()` por id (el conteo global solo es comparable con --workers=1).
- La consulta de métodos de pago (server action) se lanza al ELEGIR el hueco, no al entrar en el resumen: registrar `waitForResponse` antes del `goto`. Toast de cancelar del cliente: `customer-review-success` (el diálogo se cierra). `Intl` es-ES da «10/1»; el aviso de bloqueo pinta «10/01».
- Dos reservas del mismo cliente no pueden ocupar la misma franja: en specs seriados usar `pickSlot` con offsets distintos (4 h, 8 h...).
- Slots: rejilla = duración + buffer desde `open`; con servicio 30 min, buffer 0 y horario 00:00-23:59 hay hueco a cualquier hora (excepto el de 23:30).
