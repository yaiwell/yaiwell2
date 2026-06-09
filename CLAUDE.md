@AGENTS.md

# CLAUDE.md — Yaiwell

> Este archivo es leído automáticamente por Claude Code al iniciar sesión en este repo.
> Mantenlo denso pero práctico. Si una sección crece mucho, muévela a un archivo dedicado.

---

## 1. Qué es Yaiwell

Marketplace web (y futuro móvil) de servicios de **belleza, bienestar y deporte** con foco en **disponibilidad inmediata** y **curación premium**.

El usuario abre la app, ve qué profesionales tiene cerca **disponibles para ya o en las próximas horas**, reserva y paga. La plataforma se queda una comisión por reserva.

Categorías cubiertas:
- Belleza: peluquería, manicura/pedicura, maquillaje.
- Estética: tratamientos faciales, corporales, depilación.
- Bienestar: masajes, terapias, spas.
- Deporte: gimnasios, clases, pistas (pádel, tenis, etc.).

**No competimos con Treatwell en planificación**. Competimos en **espontaneidad + premium + simplicidad operativa para el dueño**.

Visión de producto completa en `VISION.md`.

---

## 2. Stack técnico (definitivo, no negociable sin discusión)

### Frontend
- **Next.js 16** con App Router.
- **React 19** (Server Components por defecto, Client Components solo cuando hace falta).
- **TypeScript strict** — nada de `any` salvo razón muy justificada.
- **Tailwind CSS v4** + **shadcn/ui** como sistema de componentes base.
- **Lucide React** para iconografía.
- **next-intl** para i18n (**ES + CA + EN + DE** obligatorios desde Fase 1 — España recibe fuerte turismo alemán y británico que necesita estos idiomas para descubrir y reservar; el mercado no es Mallorca-only pero sí justifica el soporte multi-idioma desde el inicio).

### Backend / Datos
- **Supabase** (PostgreSQL gestionado) — auth NO se usa (delegamos en Clerk), pero sí storage, RLS, edge functions, realtime.
- **Prisma** como ORM con el cliente generado tipado.
- **PostGIS** activado en Supabase para búsquedas geoespaciales.
- **PostgreSQL full-text search** (`tsvector` + `pg_trgm`) para el buscador. Sin embeddings, sin APIs externas, sin coste recurrente.

### Auth
- **Clerk** — gestiona usuarios, sesiones, JWT. Roles: `client`, `provider`, `admin`.
- Sincronización Clerk → Supabase vía webhook (perfil mínimo en BD).

### Pagos
- **Stripe Connect** (Express accounts) — la plataforma cobra, retiene comisión, paga al profesional.
- **Stripe Billing** para los 4 planes de suscripción de proveedores.
- Webhooks centralizados en `/app/api/webhooks/stripe`.

### IA / Búsqueda
- **Sin APIs de IA externas en MVP.** Cero coste recurrente por inferencia.
- **Buscador inteligente: PostgreSQL full-text search** con `tsvector`, `tsquery`, `ts_rank` y `pg_trgm` para tolerancia a errores tipográficos.
- Diccionario en español/catalán para stemming y stop words.
- Migración a búsqueda semántica (pgvector + embeddings) queda como **mejora de Fase 2 o 3**, cuando haya tracción real e ingresos que la justifiquen.

### Infraestructura
- **Vercel** para hosting de Next.js (preview deployments por PR).
- **Supabase Cloud** para BD y storage.
- **Resend** para email transaccional.
- **Sentry** para error tracking.
- **PostHog** para producto analytics (opt-in cookies).

### Geolocalización y mapas
- **Mapbox** o **MapLibre + tiles propios** — decisión por coste pendiente.
- **Geolocation API** del navegador en web.
- **PostGIS** para queries tipo "ST_DWithin a 2km del punto X".

---

## 3. Decisiones arquitectónicas tomadas

### Mobile-first siempre
Toda UI se diseña primero para móvil (375-414px) y luego escala a desktop. Esto es crítico porque la app nativa de fase 2 reutilizará patrones.

### API-first
La web consume su propia API (Next.js Route Handlers o Server Actions tipados). Nada de lógica de negocio embebida en componentes. Mañana la app móvil consumirá la misma API.

### Separación lógica/UI estricta
- `/lib/services/*` → lógica de negocio (booking, payments, search, providers).
- `/lib/db/*` → acceso a datos vía Prisma.
- `/lib/integrations/*` → wrappers de Stripe, Clerk, Resend, Mapbox.
- `/components/*` → UI pura, recibe props, no toca BD ni APIs externas.
- `/app/*` → routing y composición (Server Components que llaman a /lib).

Si Claude Code propone meter lógica de Stripe dentro de un componente React, **rechazar**.

### Tipos compartidos
Todos los tipos de dominio viven en `/types/domain.ts` (User, Provider, Service, Booking, Review, etc.). Estos tipos son los que la app móvil consumirá vía paquete compartido.

### Server Components por defecto
Solo marcar `"use client"` cuando hay estado, eventos, o hooks que lo requieran. Si Claude Code añade `"use client"` sin razón, cuestionarlo.

### Internacionalización desde día 1
Ningún texto hardcodeado en JSX. Todo pasa por `t('clave')` de next-intl. Sí, incluso en el esqueleto inicial.

### Slug + ID en URLs públicas
URLs tipo `/centro/[slug]-[id]` para SEO + estabilidad. Slug puede cambiar, ID no.

---

## 4. Modelo de datos (resumen)

Entidades principales (detalle completo en `prisma/schema.prisma`):

- **User** (sincronizado con Clerk): id, clerkId, email, role, locale, createdAt.
- **Provider** (autónomo o centro): id, userId, type, businessName, slug, vatNumber, verified, planId, location (PostGIS Point), address, photos[], description.
- **Professional** (trabaja en un Provider o es el Provider mismo): id, providerId, name, photo, bio, schedule.
- **Category / Subcategory** (jerarquía anidada): hasta 3 niveles de profundidad.
- **Service**: id, providerId, professionalId, categoryId, name, description, durationMinutes, priceCents, searchVector (tsvector generado).
- **Availability**: slots calculados desde Professional.schedule + Bookings existentes.
- **Booking**: id, clientId, serviceId, professionalId, providerId, startAt, endAt, status (pending, confirmed, completed, cancelled, refunded), priceCents, commissionCents, stripePaymentIntentId.
- **Review**: id, bookingId, rating (1-5), text, photos[], providerResponse, createdAt.
- **VerificationRequest**: id, providerId, status, documents[], reviewedBy, notes.
- **Plan**: id, name (Gratis, Básico, Pro, Premium), maxServices, monthlyPriceCents, commissionRate.

Todas las tablas tienen `createdAt`, `updatedAt`. Soft deletes con `deletedAt` donde aplique.

RLS policies obligatorias en Supabase para cada tabla. Sin RLS no se commitea una tabla nueva.

---

## 4.bis Reglas de negocio (no negociables)

Reglas de producto que afectan al modelo, a las APIs y a la UI. Toda implementación de Fase 1 debe respetarlas.

### Valoraciones
- **Solo puede valorar un proveedor quien ha contratado y consumido el servicio.** Requisito doble:
  1. Existe un `Booking` del cliente para ese `providerId`.
  2. Ese booking está en estado `completed`, lo que solo ocurre cuando el **profesional** (autónomo o trabajador del centro) ha marcado el servicio como finalizado desde su panel.
- La acción "marcar como finalizado" vive en el panel del proveedor y es lo que desbloquea el CTA "Valorar" al cliente.
- No se permite valorar bookings en estado `pending`, `confirmed`, `cancelled` ni `refunded`.
- Una `Review` tiene FK obligatoria a un `Booking`. No hay reseñas huérfanas.
- Ventana de valoración: 30 días desde `completed` (configurable en futuras versiones).

### Cancelaciones por el proveedor
- El proveedor puede cancelar una reserva desde su panel **siempre que falten al menos 2h** para `startAt`.
- A menos de 2h, la cancelación queda bloqueada en UI y rechazada en API. La excepción (fuerza mayor) se gestiona por soporte, no por self-service.
- El umbral de 2h busca dar al cliente margen real para buscar otra opción antes de la franja reservada.
- Al cancelar el proveedor: refund íntegro automático al cliente vía Stripe Connect, sin penalización para el cliente.
- La cancelación por el cliente sigue una política distinta (TBD, probable full-refund hasta -2h, no-show sin refund).

### Implementación esperada
- Validar ambas reglas en el `service` (`booking.service.ts` / `review.service.ts`) y en los endpoints, **no solo en UI**.
- Errores tipados: `BookingTooLateToCancelError`, `BookingNotCompletedError`, `ReviewWindowExpiredError`.
- Tests E2E cubren ambos casos límite (cancelar a 1h59min, valorar booking no completado).

---

## 5. Estructura de carpetas

```
/
├── CLAUDE.md              ← este archivo
├── VISION.md              ← visión de producto y diferenciación
├── TODO.md                ← lista de tareas pendientes (siempre actualizada)
├── DO.md                  ← lo que ya está hecho (con fecha)
├── README.md              ← cómo arrancar el proyecto
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── app/               ← rutas Next.js
│   │   ├── (public)/      ← landing, búsqueda, fichas
│   │   ├── (client)/      ← área de cliente autenticado
│   │   ├── (provider)/    ← panel del proveedor
│   │   ├── (admin)/       ← panel de moderación interna
│   │   └── api/           ← Route Handlers
│   ├── components/
│   │   ├── ui/            ← shadcn/ui base
│   │   ├── shared/        ← reutilizables entre vistas
│   │   └── features/      ← específicos de una feature (booking-flow, search-map...)
│   ├── lib/
│   │   ├── services/      ← lógica de negocio pura
│   │   ├── db/            ← Prisma client + queries
│   │   ├── integrations/  ← Stripe, Clerk, Mapbox, Resend, Anthropic
│   │   └── utils/         ← helpers genéricos
│   ├── types/             ← tipos de dominio compartidos
│   ├── messages/          ← i18n (es.json, ca.json)
│   └── styles/            ← globals.css, tokens
├── tests/                 ← E2E con Playwright, unit con Vitest
└── docs/                  ← documentación adicional, ADRs
```

---

## 6. Reglas del proyecto (importantes para Claude Code)

### Siempre
- Antes de empezar una tarea nueva, **leer `TODO.md`** para confirmar qué toca.
- Al terminar una tarea, **moverla de `TODO.md` a `DO.md`** con fecha y descripción breve de qué se hizo.
- Si una tarea se descubre durante el trabajo, **añadirla a `TODO.md`** antes de seguir.
- Usar TypeScript estricto. Si algo es `unknown`, validarlo con Zod.
- Validar inputs de API con Zod schemas en `/lib/validation/`.
- Componentes nuevos en shadcn/ui style (variantes con `cva`, accesibilidad).
- Commits en formato Conventional Commits: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`.
- Cada PR (aunque sea para uno mismo) debe describir qué cambia y por qué.

### Nunca
- **No usar `localStorage` ni `sessionStorage`** en el código de producción del marketplace (sí en algún caso puntual del cliente con justificación).
- **No hardcodear secretos.** Todo en `.env.local`, nunca commiteado.
- **No mezclar lógica de Stripe/Clerk dentro de componentes React.** Va en `/lib/integrations`.
- **No usar `any` en TypeScript** sin comentario justificando por qué.
- **No tocar la BD de producción** desde local. Solo via migrations versionadas.
- **No instalar dependencias pesadas** sin justificar (revisar bundle size).
- **No crear endpoints sin auth check** salvo que sean explícitamente públicos (búsqueda, ficha de centro).
- **No reproducir contenido con copyright** (imágenes de stock solo de fuentes libres: Unsplash, Pexels).
- **No copiar UX/branding de Treatwell/Booksy/Fresha**. Inspiración general sí, copia literal no.

### Estilo de código (resumen — detalle completo en sección 6.bis)
- Funciones pequeñas, una responsabilidad.
- Nombres descriptivos en inglés (variables, funciones, archivos, tipos).
- **Comentarios siempre en castellano**, explicando el *por qué* no el *qué*.
- Textos visibles al usuario en español/catalán via i18n.
- Imports ordenados: externos → internos absolutos → relativos.
- Ningún archivo supera ~250 líneas. Si crece, trocear.

---

## 6.bis Convenciones de código y estructura (REGLAS NO NEGOCIABLES)

> Estas reglas son obligatorias en todo el proyecto. Claude Code debe aplicarlas siempre sin que se le recuerde. Si una propuesta de cambio las viola, rechazarla o reformularla antes de implementar.

### Idioma

| Elemento | Idioma |
|---|---|
| Variables, funciones, archivos, tipos, props | Inglés |
| Comentarios y JSDoc | **Castellano** |
| Mensajes de commit | Castellano (con prefijo Conventional Commits en inglés: `feat:`, `fix:`...) |
| Mensajes de error técnicos (logs) | Inglés |
| Textos visibles al usuario | Español/catalán via `next-intl` |
| Documentación (`*.md`) | Castellano |

Ejemplo de commit válido:
```
feat: añadir flujo de reserva con Stripe Connect
fix: corregir cálculo de slots cuando el centro cierra al mediodía
refactor: separar lógica de búsqueda en service propio
```

### Comentarios — cómo y cuándo

**Comentar siempre:**
- Funciones públicas exportadas → JSDoc en castellano.
- Decisiones no obvias (por qué se elige una opción frente a otra).
- Workarounds o hacks (con TODO si hay que revisarlo).
- Lógica de negocio compleja (cálculo de slots, política de cancelación, comisiones).

**No comentar:**
- Lo que el código ya dice por sí solo (`// Suma a y b → return a + b`).
- Cosas obvias por el nombre de la función.

Formato JSDoc:

```ts
/**
 * Calcula los slots disponibles de un profesional para un día concreto.
 *
 * Tiene en cuenta el horario laboral, las reservas existentes,
 * el tiempo de preparación entre clientes y los días bloqueados.
 *
 * @param professionalId — identificador del profesional.
 * @param date — día a consultar (en zona horaria local del centro).
 * @returns lista de slots con hora de inicio y fin.
 */
export async function getAvailableSlots(
  professionalId: string,
  date: Date,
): Promise<Slot[]> {
  // ...
}
```

Comentarios inline cuando hace falta explicar el *por qué*:

```ts
// Sumamos 15 minutos de buffer entre clientes para limpieza y preparación.
// Este valor es configurable por proveedor en futuras versiones (ver TODO.md).
const BUFFER_MINUTES = 15;
```

### Estructura de componentes React

**Regla:** todo componente con lógica o estado se divide en archivos. Componentes triviales (solo presentacionales y cortos) pueden quedarse en un único archivo.

Estructura estándar para un componente con lógica:

```
components/features/booking-flow/
├── BookingFlow.tsx           ← JSX + composición. Sin lógica, sin estilos inline.
├── BookingFlow.styles.ts     ← objeto de estilos con clases Tailwind agrupadas.
├── BookingFlow.logic.ts      ← hooks, estado, handlers, efectos.
├── BookingFlow.types.ts      ← tipos específicos del componente.
└── index.ts                  ← re-export: export { BookingFlow } from './BookingFlow';
```

#### Ejemplo de cada archivo

**`BookingFlow.styles.ts`** — objeto de estilos. Tailwind agrupado por elemento visual:

```ts
/**
 * Estilos del componente BookingFlow.
 * Mantener aquí todas las clases Tailwind del componente.
 */
export const bookingFlowStyles = {
  container: 'flex flex-col gap-6 p-6 bg-white rounded-3xl shadow-soft',
  header: 'text-2xl font-serif text-neutral-900',
  subtitle: 'text-sm text-neutral-600',
  stepIndicator: 'flex items-center gap-2 mt-4',
  cta: 'bg-accent text-white px-6 py-3 rounded-full font-medium hover:bg-accent/90 transition-colors',
  ctaDisabled: 'bg-neutral-200 text-neutral-500 cursor-not-allowed',
} as const;
```

Para variantes con `cva` (component variants):

```ts
import { cva } from 'class-variance-authority';

export const bookingFlowButton = cva(
  'inline-flex items-center justify-center rounded-full font-medium transition-colors',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-white hover:bg-accent/90',
        secondary: 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200',
      },
      size: {
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-3 text-base',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);
```

**`BookingFlow.types.ts`** — tipos específicos:

```ts
/**
 * Tipos específicos del componente BookingFlow.
 * Los tipos compartidos del dominio viven en /types/domain.ts.
 */
export type BookingStep = 'service' | 'slot' | 'details' | 'payment' | 'confirmation';

export interface BookingFlowProps {
  serviceId: string;
  onComplete: (bookingId: string) => void;
}

export interface BookingDraft {
  serviceId: string;
  professionalId: string | null;
  slotStart: Date | null;
  notes: string;
}
```

**`BookingFlow.logic.ts`** — toda la lógica:

```ts
'use client';

import { useState, useCallback } from 'react';
import type { BookingDraft, BookingStep } from './BookingFlow.types';

/**
 * Hook que gestiona el estado y la navegación del flujo de reserva.
 * Centraliza el draft, los pasos y los handlers para que el componente
 * de UI sea puramente presentacional.
 */
export function useBookingFlow(serviceId: string) {
  const [step, setStep] = useState<BookingStep>('service');
  const [draft, setDraft] = useState<BookingDraft>({
    serviceId,
    professionalId: null,
    slotStart: null,
    notes: '',
  });

  const goToStep = useCallback((next: BookingStep) => {
    setStep(next);
  }, []);

  const updateDraft = useCallback((patch: Partial<BookingDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  return { step, draft, goToStep, updateDraft };
}
```

**`BookingFlow.tsx`** — solo JSX, sin lógica ni estilos inline:

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { bookingFlowStyles as s } from './BookingFlow.styles';
import { useBookingFlow } from './BookingFlow.logic';
import type { BookingFlowProps } from './BookingFlow.types';

/**
 * Flujo completo de reserva: selección de servicio, slot, datos y pago.
 * La lógica vive en useBookingFlow; este componente solo compone UI.
 */
export function BookingFlow({ serviceId, onComplete }: BookingFlowProps) {
  const t = useTranslations('booking');
  const { step, draft, goToStep, updateDraft } = useBookingFlow(serviceId);

  return (
    <section className={s.container}>
      <header>
        <h1 className={s.header}>{t('title')}</h1>
        <p className={s.subtitle}>{t('subtitle')}</p>
      </header>
      {/* Cada paso es un sub-componente. La orquestación vive aquí. */}
    </section>
  );
}
```

**`index.ts`** — fachada del módulo:

```ts
export { BookingFlow } from './BookingFlow';
export type { BookingFlowProps } from './BookingFlow.types';
```

### Estructura de servicios (backend / lib)

**Regla:** la lógica de negocio vive en `/lib/services/<dominio>/` con archivos separados por responsabilidad.

Estructura estándar para un servicio:

```
lib/services/booking/
├── booking.service.ts        ← lógica de negocio (orquesta repository + reglas).
├── booking.repository.ts     ← acceso a datos vía Prisma.
├── booking.validation.ts     ← schemas Zod de entrada/salida.
├── booking.types.ts          ← tipos del dominio booking.
├── booking.errors.ts         ← errores tipados.
└── index.ts                  ← API pública del módulo.
```

#### Ejemplo de cada archivo

**`booking.types.ts`**:

```ts
/**
 * Tipos del dominio de reservas.
 */
export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'refunded';

export interface CreateBookingInput {
  clientId: string;
  serviceId: string;
  professionalId: string;
  slotStart: Date;
  notes?: string;
}

export interface BookingSummary {
  id: string;
  status: BookingStatus;
  startAt: Date;
  endAt: Date;
  priceCents: number;
}
```

**`booking.validation.ts`**:

```ts
import { z } from 'zod';

/**
 * Validación de entrada para crear una reserva.
 * Se aplica tanto en API como en server actions.
 */
export const createBookingSchema = z.object({
  serviceId: z.string().uuid(),
  professionalId: z.string().uuid(),
  slotStart: z.coerce.date().refine(
    (d) => d.getTime() > Date.now() + 2 * 60 * 60 * 1000,
    { message: 'La reserva debe ser con al menos 2 horas de antelación.' },
  ),
  notes: z.string().max(500).optional(),
});

export type CreateBookingParsed = z.infer<typeof createBookingSchema>;
```

**`booking.errors.ts`**:

```ts
/**
 * Errores tipados del dominio booking.
 * Permiten manejarse explícitamente en el caller en lugar de strings.
 */
export class SlotUnavailableError extends Error {
  readonly code = 'SLOT_UNAVAILABLE';
  constructor(message = 'El slot ya no está disponible.') {
    super(message);
  }
}

export class BookingNotFoundError extends Error {
  readonly code = 'BOOKING_NOT_FOUND';
  constructor(message = 'Reserva no encontrada.') {
    super(message);
  }
}
```

**`booking.repository.ts`** — solo acceso a datos, sin lógica de negocio:

```ts
import { prisma } from '@/lib/db/prisma';
import type { BookingStatus } from './booking.types';

/**
 * Repositorio de reservas: encapsula todas las queries Prisma del dominio.
 * No contiene reglas de negocio, solo lectura/escritura.
 */
export const bookingRepository = {
  async findById(id: string) {
    return prisma.booking.findUnique({ where: { id } });
  },

  async findOverlapping(professionalId: string, start: Date, end: Date) {
    return prisma.booking.findMany({
      where: {
        professionalId,
        status: { in: ['pending', 'confirmed'] },
        startAt: { lt: end },
        endAt: { gt: start },
      },
    });
  },

  async create(data: {
    clientId: string;
    serviceId: string;
    professionalId: string;
    startAt: Date;
    endAt: Date;
    priceCents: number;
  }) {
    return prisma.booking.create({ data: { ...data, status: 'pending' } });
  },

  async updateStatus(id: string, status: BookingStatus) {
    return prisma.booking.update({ where: { id }, data: { status } });
  },
};
```

**`booking.service.ts`** — lógica de negocio, orquesta repositorio y reglas:

```ts
import { bookingRepository } from './booking.repository';
import { createBookingSchema } from './booking.validation';
import { SlotUnavailableError } from './booking.errors';

/**
 * Crea una reserva validando solapamientos y respetando la política
 * de antelación mínima de 2 horas.
 *
 * @param input — datos de la reserva propuesta.
 * @returns la reserva creada en estado 'pending'.
 * @throws SlotUnavailableError si el slot ya está ocupado.
 */
export async function createBooking(input: unknown, clientId: string) {
  // Validación de entrada con Zod.
  const data = createBookingSchema.parse(input);

  // Calculamos el fin del slot a partir de la duración del servicio.
  const service = await prisma.service.findUniqueOrThrow({
    where: { id: data.serviceId },
  });
  const endAt = new Date(data.slotStart.getTime() + service.durationMinutes * 60_000);

  // Verificamos que no haya solapamiento con otras reservas activas.
  const overlapping = await bookingRepository.findOverlapping(
    data.professionalId,
    data.slotStart,
    endAt,
  );
  if (overlapping.length > 0) {
    throw new SlotUnavailableError();
  }

  // Creamos la reserva en estado pendiente; el pago la pasará a confirmed.
  return bookingRepository.create({
    clientId,
    serviceId: data.serviceId,
    professionalId: data.professionalId,
    startAt: data.slotStart,
    endAt,
    priceCents: service.priceCents,
  });
}
```

**`index.ts`** — API pública del módulo:

```ts
export { createBooking } from './booking.service';
export { bookingRepository } from './booking.repository';
export { SlotUnavailableError, BookingNotFoundError } from './booking.errors';
export type { BookingStatus, CreateBookingInput, BookingSummary } from './booking.types';
```

### Reglas adicionales de estructura

1. **Ningún archivo supera ~250 líneas.** Si crece, dividir por responsabilidades.
2. **Una función pública por archivo cuando sea posible.** Funciones helper privadas pueden convivir en el mismo archivo.
3. **Imports ordenados con línea en blanco entre grupos:**
   ```ts
   // 1. Externos
   import { useState } from 'react';
   import { z } from 'zod';

   // 2. Alias internos (@/...)
   import { Button } from '@/components/ui/button';
   import { useTranslations } from '@/lib/i18n';

   // 3. Relativos
   import { useBookingFlow } from './BookingFlow.logic';
   import type { BookingFlowProps } from './BookingFlow.types';
   ```
4. **Nombres de archivos:**
   - Rutas Next.js (`page.tsx`, `layout.tsx`, etc.): siguen convención Next.js.
   - Componentes React: `PascalCase.tsx` (ejemplo: `BookingFlow.tsx`).
   - Servicios, utils, hooks: `kebab-case.ts` o `camelCase.ts` (ejemplo: `booking.service.ts`).
   - Tipos: archivo dedicado `*.types.ts` si hay más de 2-3 tipos.
   - Estilos: `*.styles.ts` para Tailwind objects.
5. **Re-exports limpios desde `index.ts`** en cada carpeta de feature o servicio. El consumidor importa desde la fachada, nunca desde archivos internos.
6. **Server Components por defecto, Client Components solo cuando hace falta** (estado, eventos, hooks de navegador). Marcar `'use client'` lo más abajo posible en el árbol.
7. **Validación con Zod en cada borde del sistema** (API routes, server actions, webhooks). Nunca confiar en datos externos.
8. **Errores tipados.** Lanzar clases de error específicas (`SlotUnavailableError`) en vez de `throw new Error('string')` genérico.

### Cómo aplicar estas reglas

Antes de cada commit Claude Code debe verificar mentalmente:
- ¿Está todo lo visible al usuario en i18n? Si no, mover a `messages/*.json`.
- ¿Los comentarios están en castellano? Si no, traducirlos.
- ¿Hay lógica dentro del componente JSX? Si sí, extraer a `.logic.ts`.
- ¿Hay clases Tailwind largas inline? Si sí, mover a `.styles.ts`.
- ¿El archivo pasa de 250 líneas? Si sí, dividir.
- ¿La carpeta tiene `index.ts`? Si no, crearlo.

Cualquier desviación de estas reglas debe justificarse explícitamente en el comentario del PR.

---

## 7. Flujo de trabajo con Claude Code

### Al iniciar una sesión
1. Leer `CLAUDE.md` (este archivo) y `AGENTS.md` (catálogo de playbooks de orquestación de subagentes, importado al inicio con `@AGENTS.md`).
2. Revisar `TODO.md` para saber qué toca.
3. Revisar últimas 5 líneas de `DO.md` para entender el estado.
4. Confirmar con el dev qué tarea atacar.

### Antes de empezar una tarea: decidir orquestación
- **Buscar encaje con un playbook de `AGENTS.md`** (P1–P11). Si encaja, ejecutar ese playbook **sin preguntar** al usuario cuántos subagentes lanzar ni de qué tipo.
- Solo preguntar si la tarea no encaja en ningún playbook **o** si hay una decisión de producto pendiente.
- Si durante el trabajo aparece un patrón de orquestación nuevo, añadirlo a `AGENTS.md` como `Pxx` al cerrar la tarea.

### Durante el trabajo
- Si la tarea es grande, dividirla en subtareas y añadirlas a `TODO.md`.
- Implementar en pequeños incrementos verificables.
- Mostrar diffs antes de aceptar cambios grandes.
- Si surge una decisión arquitectónica, **preguntar antes de decidir**.

### Al terminar una tarea
1. Verificar que el build pasa (`npm run build`).
2. Verificar que los tipos pasan (`npm run typecheck`).
3. Verificar que el lint pasa (`npm run lint`).
4. Mover la tarea de `TODO.md` a `DO.md` con fecha (YYYY-MM-DD) y descripción.
5. Commit con mensaje claro.

---

## 8. Comandos clave

```bash
# Desarrollo
npm run dev                 # arranca Next.js en localhost:3000
npm run build               # build de producción
npm run typecheck           # tsc --noEmit
npm run lint                # eslint
npm run format              # prettier

# Base de datos
npx prisma migrate dev      # nueva migración en desarrollo
npx prisma generate         # regenerar cliente tipado
npx prisma studio           # GUI para inspeccionar BD

# Supabase local
npx supabase start          # arranca stack local con Docker
npx supabase db reset       # resetea BD local con migraciones
npx supabase db push        # aplica migraciones a remoto

# Stripe local (webhooks)
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Testing
npm run test                # unit tests con Vitest
npm run test:e2e            # e2e con Playwright
```

---

## 9. Variables de entorno

Plantilla completa en `.env.example`. Variables críticas:

```
# Supabase
DATABASE_URL=
DIRECT_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_CONNECT_CLIENT_ID=

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=

# Resend
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 10. Roadmap por fases

**Fase 0 (actual, ~2 semanas):** Esqueleto visual navegable con datos fake + infraestructura real montada (Supabase, Clerk, Stripe en test mode, Prisma schema base, deploy en Vercel). Sin lógica de negocio real, pero con cimientos definitivos.

**Fase 1 (MVP, ~6 meses):** Marketplace funcional con las features prioritarias:
1. Búsqueda + mapa con disponibilidad inmediata ("disponible ahora").
2. Buscador con full-text search en español/catalán + filtros densos.
3. Huecos sueltos con descuento automático (recuperar cancelaciones).
4. Multi-centro para empresarios (gestión de varios locales bajo una cuenta).
5. Panel de gestión para proveedores que se entiende en 5 minutos.

Plus el resto del MVP base: reservas, Stripe Connect, valoraciones, panel admin con cola de verificación, 4 planes de suscripción.

**Fase 2 (~3 meses tras lanzamiento):** Apps nativas iOS/Android con React Native + Expo.

**Fase 3 (a definir, requiere ingresos para justificar costes recurrentes):** Sincronización Google/Outlook Calendar, reservas recurrentes, mensajería interna, programas de fidelización, políticas de cancelación personalizables, **buscador semántico con embeddings**, **onboarding de proveedor asistido por IA** (foto del menú → extracción automática).

Detalle por feature en `TODO.md`.

---

## 11. Contactos y responsabilidades

- **Dev principal:** Jorge.
- **Cliente:** [pendiente de rellenar].
- **Diseño:** Jorge + Claude.
- **Revisión técnica externa:** [pendiente, posible informático presente en reunión inicial].

---

*Última actualización: 2026-05-18.*
