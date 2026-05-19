# VISION.md — Beauly

> Documento de visión de producto. Cuando una decisión genere duda,
> volver aquí antes de a `CLAUDE.md`. Si la decisión no encaja con esta visión,
> rechazarla aunque parezca técnicamente atractiva.

---

## 1. El problema que resolvemos

Hoy, encontrar un servicio de belleza, bienestar o deporte **disponible de verdad para las próximas horas** es una experiencia rota:

- Las plataformas existentes (Treatwell, Booksy, Fresha) están diseñadas para **planificar con días o semanas de antelación**, no para "necesito algo ya".
- La búsqueda muestra listados densos, calendarios saturados y filtros poco útiles cuando lo único que el usuario quiere saber es: **¿quién tiene un hueco hoy a 2 km de mí?**
- Los profesionales pierden ingresos cuando un cliente cancela con poca antelación, porque no hay forma de rellenar ese hueco rápido.
- Los dueños de centros gestionan agendas en herramientas que parecen Excel disfrazado: paneles llenos de menús, ajustes y métricas que nadie usa.
- El usuario llega a una plataforma genérica donde un masaje terapéutico de 80€ aparece junto a un corte de pelo de 12€ sin curación de calidad.

**Hay un nicho desatendido entre la planificación corporativa y la espontaneidad real.** Ese nicho es nuestro.

---

## 2. Para quién construimos

### Cliente final
Persona adulta, urbana, con poder adquisitivo medio o alto, que valora:
- Resolver una necesidad **ahora o en las próximas horas**, no en 3 días.
- Curación: que cuando vea un profesional, sea de confianza, no un anuncio cualquiera.
- Simplicidad: reservar en 3 toques sin pelear con interfaces.
- Transparencia: precio claro, condiciones claras, sin sorpresas.

### Proveedor — autónomo
Profesional independiente (masajista, peluquera, esteticista, entrenador) que:
- Tiene huecos sueltos en su agenda que querría rellenar.
- No quiere gestionar marketing, captación ni cobros por su cuenta.
- Busca una plataforma que **trabaje para él**, no donde sea uno más.

### Proveedor — centro (caso de la clienta)
Empresario con uno o varios locales, equipo de varios profesionales, que necesita:
- Gestión multi-centro sin duplicar cuentas.
- Visión consolidada de ingresos, ocupación, valoraciones.
- Que la plataforma traiga clientes nuevos y rellene huecos.
- Paneles simples que cualquier empleado entienda en 5 minutos.

### No construimos para:
- Cadenas grandes con sistemas internos complejos (no es nuestro perfil).
- Profesionales que ya tienen agenda llena y no necesitan más visibilidad.
- Usuarios buscando exclusivamente el precio más barato (somos premium, no Wallapop).

---

## 3. Promesas de marca

Estas son las tres promesas que definen todo lo que hacemos. Si una decisión las refuerza, va. Si las debilita, fuera.

### Promesa 1 — "Disponible para ya"
El usuario abre la app y sabe en 5 segundos qué tiene cerca disponible hoy. No filtros que descartar, no calendarios que abrir: un mapa con pines verdes y una lista de huecos reservables.

### Promesa 2 — "Cada profesional, verificado por una persona"
Todos los proveedores pasan por un proceso de verificación humana antes de aparecer en la plataforma. No es automatizado. Esto es lento pero es la base de la confianza, y es lo que nos diferencia de marketplaces con miles de proveedores sin curar.

### Promesa 3 — "Diseñado por gente que ama el oficio"
El panel del proveedor parece hecho para él, no para un departamento de IT. Los flujos del cliente parecen pensados por alguien que ha reservado un masaje de verdad. Esto se construye en cientos de detalles invisibles.

---

## 4. Posicionamiento frente a competidores

| | Treatwell / Booksy / Fresha | Beauly |
|---|---|---|
| Foco | Planificación con días/semanas | Disponibilidad inmediata (hoy / próximas horas) |
| Catálogo | Volumen masivo, poca curación | Curado, verificado humanamente |
| UX | Funcional, genérica, densa | Sobria, premium, mobile-first |
| Panel proveedor | Completo pero complejo | Simple, accionable, con sugerencias |
| Categorías | Belleza/bienestar | Belleza + bienestar + deporte |
| Modelo | SaaS + comisión | SaaS + comisión |

**No competimos con ellos en su terreno. Jugamos otro deporte:**
ellos sirven a la mayoría con un producto generalista; nosotros servimos a un nicho premium con un producto especializado.

Si nos comparan feature a feature, perdemos. Si nos comparan en experiencia y disponibilidad real para hoy, ganamos.

---

## 5. Modelo de negocio

### Ingresos
1. **Comisión por reserva completada** (porcentaje variable según plan del proveedor).
2. **Suscripciones mensuales** del proveedor en 4 planes:
   - **Gratis:** hasta 3 especialidades publicables. Comisión alta. Visibilidad básica.
   - **Básico:** más especialidades, comisión media, métricas básicas.
   - **Pro:** especialidades ilimitadas, comisión reducida, métricas avanzadas, prioridad en búsqueda.
   - **Premium:** todo lo anterior + multi-centro, comunicación masiva a clientes, soporte prioritario.

### No ingresos (descartado a propósito)
- **Publicidad pagada de proveedores.** Romperíamos la promesa de curación.
- **Venta de datos de usuarios.** Cumplimiento GDPR + ética básica.
- **Productos físicos.** Es otro negocio.

---

## 6. Diferenciadores prioritarios para MVP

Cinco features que definen el MVP. Si una se cae, hablamos. Si se proponen otras nuevas, se evalúan contra estas.

### 1. Búsqueda con mapa "disponible ahora"
La pantalla principal de la app. Mapa con pines de colores: verde (libre ahora), ámbar (libre en menos de 1h), gris (no hoy). Filtros mínimos: categoría, precio máximo, distancia. Reserva en 3 toques desde el mapa.

### 2. Buscador con full-text search en español/catalán
Caja de búsqueda inteligente con autocompletado, tolerancia a errores, ranking por relevancia. Sin IA externa, todo PostgreSQL. Suficiente para encontrar lo que se busca sin pelear con menús anidados.

### 3. Huecos sueltos con descuento automático
Cuando un profesional tiene una cancelación, pulsa un botón "liberar hueco" con un descuento. La app notifica a usuarios cercanos en categorías relevantes. Hueco vendido en minutos en vez de perdido. Win-win para ambos lados.

### 4. Multi-centro para empresarios
Una cuenta empresarial puede gestionar varios locales bajo el mismo perfil. Dashboard consolidado, transferencia de profesionales entre centros, métricas agregadas. Pensado específicamente para perfiles como el de la clienta.

### 5. Panel de gestión simple
El dueño abre el panel y ve tres números grandes (reservas, ingresos, ocupación) más tres acciones recomendadas concretas. Diseño tipo Stripe Dashboard o Linear: claridad antes que completitud. Si quieres todos los datos, hay una sección avanzada. Por defecto, lo esencial.

---

## 7. Principios de diseño

### Mobile-first siempre
La app se usa desde el móvil mientras alguien camina por la calle. Todo se diseña primero para 375px y luego escala. Si algo solo funciona bien en desktop, está mal diseñado.

### Menos es más
Vacío en blanco no es desperdicio. Cada elemento de UI tiene que ganarse su sitio. Si una pantalla tiene 12 opciones, probablemente sobran 8.

### Velocidad percibida > velocidad real
Skeleton loaders, optimistic updates, transiciones suaves. La app debe sentirse rápida incluso cuando la red es lenta. Cero pantallas en blanco esperando datos.

### Tipografía y espacio cuentan la historia
Antes del color, antes del logo: tipografía y jerarquía. Una serif elegante en títulos genera percepción premium instantánea, sin sobreingeniería visual.

### Accesibilidad no es opcional
Contraste AA mínimo, navegación por teclado completa, etiquetas ARIA, soporte de screen readers. Si no es accesible, no se lanza.

### Errores como conversación
Mensajes de error en lenguaje humano, con sugerencia de qué hacer. Nunca "Error 500" o "Algo salió mal". Siempre "No pudimos confirmar tu reserva. Te hemos guardado el hueco 5 minutos, ¿reintentamos?".

---

## 8. Antiprincipios (cosas que rechazamos a propósito)

- **No copiar a Treatwell/Booksy/Fresha visualmente.** Inspiración general en patrones, sí. Mímica literal, no.
- **No meter gamificación.** Esto no es WorkLeveling. Aquí la gente quiere reservar un masaje, no subir de nivel.
- **No notificaciones push agresivas.** Notificar es un privilegio, no un derecho de la app.
- **No dark patterns** (suscripciones difíciles de cancelar, precios engañosos, etc.). Nunca.
- **No popups de cookies invasivos.** Banner minimalista, opt-out fácil, cookies estrictamente necesarias por defecto.
- **No funcionalidades sociales** tipo "tu amigo Marta acaba de reservar un masaje". El sector exige privacidad.
- **No tarjetas regalo, ni programas de puntos propios, ni mercado de productos físicos en MVP.** Son negocios distintos.

---

## 9. Criterios de éxito (cómo sabremos si funciona)

### Métricas a 6 meses post-lanzamiento
- **30+ proveedores verificados activos** (no solo registrados, **activos** con al menos una reserva al mes).
- **500+ reservas completadas y valoradas.**
- **Ratio de "disponibilidad inmediata" > 40%:** porcentaje de reservas hechas para el mismo día o el siguiente.
- **NPS de proveedores > 40.** Sin esto, no escalamos.
- **Tasa de no-show < 8%.** Si supera esto, hay problema de incentivos.

### Métricas a 12 meses
- **Punto de equilibrio operativo** (los ingresos cubren costes recurrentes de infra y herramientas).
- **Expansión a una segunda área geográfica** (Madrid, Valencia o costa catalana).
- **Decisión sobre apps nativas** basada en datos reales de uso.

### Métricas que NO miramos
- **Número total de usuarios registrados.** Vanity metric. Solo cuentan los que reservan.
- **Tiempo medio en la app.** Queremos lo contrario: que reserve rápido y se vaya.
- **Número de proveedores totales.** Mejor 30 buenos que 300 mediocres.

---

## 10. Visión a 3 años

**Año 1:** MVP en Barcelona y alrededores. Validación con los 3 centros de la clienta + 30-50 proveedores externos verificados. Refinamiento del modelo.

**Año 2:** Expansión geográfica a Madrid + Valencia + costa catalana. Apps nativas iOS/Android. Primeras features de Fase 3 si la rentabilidad lo permite.

**Año 3:** Cobertura nacional en España. Evaluación de expansión a Portugal o sur de Francia. Quizás búsqueda semántica con IA si el catálogo lo justifica.

No buscamos vender la empresa rápido. Construimos un negocio sostenible que crezca con sus usuarios. Si en algún momento aparece interés serio de adquisición, se evalúa con la cliente y se decide juntos.

---

## 11. Filosofía del equipo (Jorge + cliente)

Este proyecto nace de una combinación poco común:
- **Una profesional con 28 años de experiencia** en el sector estético y bienestar, con red comercial real y conocimiento profundo del oficio.
- **Un desarrollador con criterio técnico y gusto por el detalle**, que entiende cómo construir productos que se sienten bien, no solo que funcionan.

Esta combinación es nuestra ventaja competitiva no copiable. Los marketplaces grandes los construyen equipos que optimizan métricas pero no aman el oficio. Aquí pasa lo contrario, y se va a notar en cada decisión.

La promesa silenciosa de Beauly es esa: **una herramienta hecha por gente que entiende a ambos lados de la mesa**.

---

*Última actualización: 2026-05-18.*
