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
