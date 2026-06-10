# E2E del wizard de onboarding (#57 — Capa 3)

Este test recorre los 5 pasos del wizard de onboarding contra Clerk dev
y Supabase dev reales. Para correrlo necesitas crear **una vez** un
usuario provider de pruebas en Clerk y pegar sus credenciales en
`.env.local`.

## Prerrequisitos

1. **`.env.local` ya completo** con las variables de Clerk
   (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`) y la
   `DATABASE_URL` apuntando a Supabase dev.
2. **Chrome instalado** (Playwright usa el Chrome del sistema por
   defecto, ver `playwright.config.ts`). Si prefieres el Chromium
   oficial: `npx playwright install` y exporta `PW_USE_CHROMIUM=1`.

## Setup del usuario de pruebas (una sola vez)

1. Entra al [dashboard de Clerk dev](https://dashboard.clerk.com) →
   tu aplicación de desarrollo → **Users** → **Create user**.
2. Rellena:
   - **Email address**: usa el patrón mágico
     `<tu_email>+clerk_test@yourdomain.com`. Clerk reconoce el sufijo
     `+clerk_test` y **bypasea la verificación por código** (no hace
     falta abrir el buzón). Si no usas este patrón el login E2E queda
     bloqueado por el OTP obligatorio.
   - **Password**: cualquiera fuerte. Apúntala.
3. Pega las credenciales en tu `.env.local`:

   ```env
   CLERK_TEST_PROVIDER_EMAIL=jorge+clerk_test@yaiwell.com
   CLERK_TEST_PROVIDER_PASSWORD=tu_password_fuerte
   ```

4. **`publicMetadata.role`** se promociona automáticamente al ejecutar
   el test (`ensureTestProviderRole()` en `clerk-test-user.ts`). No
   hace falta editarlo a mano en el dashboard.

## Ejecutar el test

```bash
# Todos los E2E (incluye el wizard)
npm run test:e2e

# Solo el wizard
npm run test:e2e -- onboarding-wizard.spec.ts

# Modo UI para depurar paso a paso
npm run test:e2e:ui
```

El test:

1. Asegura el rol `provider` del usuario de pruebas vía Clerk Backend
   API.
2. Borra cualquier `Provider` (y servicios en cascada) del usuario en
   Supabase dev para que el wizard arranque en paso 1.
3. Login programático con `clerk.signIn` (sin UI).
4. Recorre los 5 pasos del wizard (interceptando `/api/geocoding/forward`
   con `page.route()` para no quemar requests contra Mapbox).
5. Publica y verifica el redirect a `/panel`.

## Si algo falla

| Síntoma                                      | Causa probable                                                 | Solución                                                            |
| -------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------- |
| `CLERK_SECRET_KEY no está definida`          | `globalSetup` no encontró `.env.local`                         | Comprueba que `.env.local` está en la raíz del repo.                |
| `No se encontró el usuario "..." en Clerk`   | El user no se ha creado en el dashboard                        | Pasos 1-3 de Setup.                                                 |
| `clerk.signIn` cuelga en captcha             | El email no usa `+clerk_test`                                  | Reemplaza el user por uno con el patrón mágico.                     |
| Test cuelga en step 2 esperando "Disponible" | El endpoint `/api/onboarding/slug-availability` tarda o falla  | Mira los logs del `npm run dev` en otra terminal.                   |
| Test cuelga en step 3 sin sugerencias        | El intercept de Mapbox no aplica                               | Verifica que el `page.route()` se registra antes del primer `goto`. |
| Test pasa pero deja basura en BD             | El `cleanupTestProviderBD` lo limpia al inicio del próximo run | OK, no action.                                                      |

## Limpieza manual de Supabase dev

Si necesitas borrar el Provider del user de pruebas a mano:

```sql
DELETE FROM providers WHERE "userId" IN (
  SELECT id FROM users WHERE "clerkId" = '<clerkId del user de pruebas>'
);
```

El `clerkId` lo encuentras en el dashboard de Clerk → Users → tu user
→ panel derecho.
