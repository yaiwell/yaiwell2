---
name: stripe-docs-cli-gitbash
description: En Git Bash de Windows, `stripe docs /ruta` da 404 salvo con MSYS_NO_PATHCONV=1 (convierte /billing/... en C:/Program Files/Git/...)
metadata:
  type: reference
---

Para consultar la doc de Stripe con la CLI desde la Bash de este equipo (Git Bash, Windows):
`export MSYS_NO_PATHCONV=1; stripe docs /billing/invoices/subscription`. Sin la variable, MSYS reescribe la ruta y la CLI pide `https://docs.stripe.com/C:/Program%20Files/Git/...` → 404. `stripe docs search "..."` funciona sin ella.

**Why:** perdí varias llamadas pensando que la página no existía (2026-10-30).
**How to apply:** siempre que use `stripe docs <ruta>` en este repo.
