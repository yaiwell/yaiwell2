# Yaiwell

Marketplace de servicios de **belleza, bienestar y deporte** con foco en disponibilidad inmediata y curación premium.

> Para el contexto técnico completo, leer [`CLAUDE.md`](./CLAUDE.md).
> Para la visión de producto, leer [`VISION.md`](./VISION.md).
> Para el estado actual del trabajo, ver [`TODO.md`](./TODO.md) y [`DO.md`](./DO.md).

---

## Requisitos

- **Node.js** 20 LTS o superior.
- **npm** 10 o superior (o `pnpm` si se prefiere; ajustar comandos).
- **Docker** (para Supabase local).
- **Git**.
- **Cuenta de Stripe** (modo test al inicio).
- **Cuenta de Clerk**.
- **Cuenta de Supabase** (para producción; local es gratis).
- **Cuenta de Vercel** (para deploy).
- **CLI de Supabase** instalada globalmente: `npm install -g supabase`.
- **CLI de Stripe** instalada localmente para webhooks: ver [docs](https://stripe.com/docs/stripe-cli).

---

## Primer arranque

```bash
# 1. Clonar el repo
git clone <repo-url> yaiwell
cd yaiwell

# 2. Instalar dependencias
npm install

# 3. Copiar variables de entorno
cp .env.example .env.local
# Editar .env.local con las claves reales (ver CLAUDE.md sección 9)

# 4. Arrancar Supabase local
npx supabase start
# Esto levanta PostgreSQL + Studio + Auth + Storage en Docker.
# La primera vez tarda un par de minutos descargando imágenes.

# 5. Aplicar migraciones
npx prisma migrate dev

# 6. Generar cliente de Prisma
npx prisma generate

# 7. Sembrar datos fake (esqueleto inicial)
npm run seed

# 8. Arrancar la app
npm run dev
# Abre http://localhost:3000
```

En otra terminal, si vas a trabajar con pagos:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

---

## Comandos disponibles

### Desarrollo
```bash
npm run dev              # arranca Next.js en localhost:3000
npm run build            # build de producción
npm run start            # arranca el build de producción
```

### Calidad de código
```bash
npm run typecheck        # tsc --noEmit (chequea tipos)
npm run lint             # eslint
npm run lint:fix         # eslint --fix
npm run format           # prettier
npm run format:check     # prettier --check
```

### Base de datos
```bash
npx prisma migrate dev               # crear nueva migración
npx prisma migrate deploy            # aplicar migraciones a producción
npx prisma generate                  # regenerar cliente tipado
npx prisma studio                    # abrir GUI de la BD
npx supabase start                   # arrancar stack local
npx supabase stop                    # parar stack local
npx supabase db reset                # resetear BD local con migraciones
npx supabase db push                 # aplicar cambios a remoto
npm run seed                         # poblar BD con datos fake
```

### Testing
```bash
npm run test             # unit tests con Vitest
npm run test:watch       # modo watch
npm run test:e2e         # tests end-to-end con Playwright
npm run test:e2e:ui      # Playwright con UI
```

### Internacionalización
```bash
npm run i18n:extract     # extraer claves de traducción del código
npm run i18n:check       # verificar claves faltantes en cada locale
```

---

## Estructura del proyecto

```
yaiwell/
├── CLAUDE.md              ← contexto técnico (leído por Claude Code)
├── VISION.md              ← visión de producto
├── TODO.md                ← tareas pendientes
├── DO.md                  ← tareas completadas
├── README.md              ← este archivo
├── prisma/
│   ├── schema.prisma      ← modelo de datos
│   └── migrations/        ← migraciones versionadas
├── src/
│   ├── app/               ← rutas Next.js (App Router)
│   │   ├── (public)/      ← landing, búsqueda, fichas
│   │   ├── (client)/      ← área del cliente autenticado
│   │   ├── (provider)/    ← panel del proveedor
│   │   ├── (admin)/       ← panel de moderación interna
│   │   └── api/           ← Route Handlers y webhooks
│   ├── components/
│   │   ├── ui/            ← shadcn/ui base
│   │   ├── shared/        ← reutilizables entre vistas
│   │   └── features/      ← específicos de una feature
│   ├── lib/
│   │   ├── services/      ← lógica de negocio pura
│   │   ├── db/            ← Prisma client + queries
│   │   ├── integrations/  ← Stripe, Clerk, Mapbox, Resend
│   │   ├── validation/    ← schemas de Zod
│   │   └── utils/         ← helpers
│   ├── types/             ← tipos de dominio compartidos
│   ├── messages/          ← traducciones (es.json, ca.json)
│   └── styles/            ← globals.css, tokens
├── tests/
│   ├── unit/
│   └── e2e/
└── docs/                  ← ADRs y documentación adicional
```

Para más detalle ver `CLAUDE.md` sección 5.

---

## Stack técnico

- **Frontend:** Next.js 15 + React 19 + TypeScript + Tailwind v4 + shadcn/ui.
- **Backend:** Next.js Route Handlers + Server Actions.
- **Base de datos:** Supabase (PostgreSQL + PostGIS + pg_trgm).
- **ORM:** Prisma.
- **Auth:** Clerk.
- **Pagos:** Stripe Connect + Stripe Billing.
- **Email:** Resend.
- **Mapas:** Mapbox.
- **Hosting:** Vercel.
- **Errores:** Sentry.
- **Analytics:** PostHog.

Cero APIs de IA con coste recurrente. Búsqueda con PostgreSQL full-text search nativo.

Detalle completo en `CLAUDE.md` sección 2.

---

## Flujo de trabajo con Git

- Rama principal: `main`. Bloqueada, solo se mergea via PR.
- Ramas de feature: `feat/nombre-corto` (ejemplo: `feat/booking-flow`).
- Ramas de fix: `fix/descripcion` (ejemplo: `fix/calendar-timezone`).
- Ramas de refactor: `refactor/area` (ejemplo: `refactor/search-service`).
- Commits en formato **Conventional Commits**:
  - `feat: añadir flujo de reserva con Stripe Connect`
  - `fix: corregir zona horaria del calendario`
  - `refactor: separar lógica de búsqueda en service propio`
  - `docs: actualizar README con comandos de testing`
  - `chore: actualizar dependencias`

Cada PR debe describir **qué cambia** y **por qué**. Aunque sea para uno mismo.

---

## Variables de entorno

Ver plantilla completa en `.env.example`. Nunca commitear `.env.local`.

Las variables están documentadas en `CLAUDE.md` sección 9.

---

## Despliegue

### Preview (automático)
Cada push a una rama distinta de `main` genera un preview deploy en Vercel automáticamente. La URL se postea en el PR.

### Producción
Merge a `main` → deploy automático a producción. Antes de cada merge:
- ✅ Build pasa.
- ✅ Typecheck pasa.
- ✅ Lint pasa.
- ✅ Tests pasan.
- ✅ Migraciones de BD aplicadas si las hay.

---

## Política de seguridad y privacidad

- Cumplimiento GDPR estricto desde día 1.
- Datos personales cifrados en reposo y en tránsito.
- Cookies estrictamente necesarias activas por defecto; resto opt-in explícito.
- Logs sin datos personales identificables.
- Acceso a datos de producción restringido y auditado.
- Sin venta ni cesión de datos a terceros bajo ninguna circunstancia.

Política completa publicada en `/privacidad` y `/cookies` (rutas públicas).

---

## Soporte y contacto

Proyecto privado. Para asuntos relacionados con el desarrollo, contactar con el equipo del proyecto.

---

*Documento operativo. Última actualización: 2026-05-18.*
