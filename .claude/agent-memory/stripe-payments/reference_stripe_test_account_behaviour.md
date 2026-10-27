---
name: reference-stripe-test-account-behaviour
description: Comportamiento real verificado de la cuenta de plataforma Stripe (test) de Yaiwell con cuentas Express ES — business_type, login links, requisitos, claves en .env.local
metadata:
  type: reference
---

Verificado contra la API en modo test el 2026-10-27 (SDK 22.2.0, apiVersion 2026-05-27.dahlia):

- `accounts.create({type:'express', country:'ES'})` devuelve `type:'express'` y `controller` con `fees.payer:'application_express'`, `losses.payments:'application'`, `requirement_collection:'stripe'`, `stripe_dashboard.type:'express'`.
- `business_type` de una Express se puede cambiar por API ANTES del primer AccountLink; DESPUÉS Stripe responde "This application does not have the required permissions for the parameter 'business_type'". Como el flujo crea el enlace justo tras la cuenta, en la práctica queda fijado → cambio de tipo = soporte (borrar cuenta sin actividad y crear otra).
- `accounts.createLoginLink` antes de completar el alta: "Cannot create a login link for an account that has not completed onboarding".
- Recién creada, una cuenta ES ya trae todo el KYC en `past_due` además de `currently_due` (hasPastDueRequirements=true sin haber hecho nada). No usar past_due como señal de "urgente" en alta sin enviar.
- El SDK emite el warning "We recommend building your integration using Accounts v2" en cada `accounts.create`.
- `.env.local` tiene DOS líneas `STRIPE_SECRET_KEY` de test (l.42 y l.94) y una live comentada (l.89). Comprobar el prefijo antes de cualquier prueba real.
- `@next/env` ignora `.env.local` con NODE_ENV=test: en scripts bajo Vitest hay que forzar NODE_ENV=development al cargar.

Ver también [[feedback-never-bulk-delete-stripe-accounts]].
