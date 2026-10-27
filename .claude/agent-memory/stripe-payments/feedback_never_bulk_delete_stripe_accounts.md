---
name: feedback-never-bulk-delete-stripe-accounts
description: Al limpiar cuentas Connect de prueba, borrar solo ids creados en la misma ejecución; nunca barrer por metadata (borré la cuenta de Studio Aura así)
metadata:
  type: feedback
---

Nunca hacer `accounts.list` + `accounts.del` filtrando por metadata (`purpose: 'e2e-test'` u otro). Borrar únicamente los ids que el propio script acaba de crear y tiene guardados en memoria; si quedan restos, listarlos y devolverlos como paso manual.

**Why:** el 2026-10-27 un barrido "de restos" filtrando por `metadata.purpose === 'e2e-test'` borró `acct_1UV5ErGTznGuMsBl`, la cuenta Custom de test enlazada a Studio Aura en la BD, que también llevaba esa etiqueta. `accounts.del` es irreversible.

**How to apply:** antes de cualquier `del`, comprobar que el id no aparece en `Provider.stripeAccountId` (preguntar al orquestador / db-migration-guard) y que lo creó el script en curso. Ver [[reference-stripe-test-account-behaviour]].
