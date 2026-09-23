# Auditoría por pantallas — 2026-09-23

> Estado de las **25 pantallas** del producto, con los dos ejes separados: **diseño** y **funcionalidad**.
> Para cada una, los pasos pendientes concretos.
>
> Método: tres auditorías en paralelo (públicas / panel del proveedor / cliente-auth-admin-chrome).
> Los hallazgos marcados **[verificado]** los he comprobado a mano; el resto vienen de la auditoría con cita `archivo:línea`.
> Lo que ya estaba anotado en `TODO.md` no se repite aquí salvo que haya matiz nuevo.

---

## Cómo leer esto

| Marca | Significado |
|---|---|
| **P0** | Rompe algo en producción, corrompe datos o incumple una promesa comercial |
| **P1** | El usuario se topa con ello y le estorba o le engaña |
| **P2** | Pulido, deuda o inconsistencia sin impacto directo |

Una constante que atraviesa todo el informe: **casi ningún fallo es de código mal escrito, sino de código que se quedó atrás.** Fase 0 se construyó con datos falsos y la migración a Postgres se hizo por partes entre junio y septiembre. Lo que falla es casi siempre la pieza que no se revisó cuando su vecina cambió.

---

## Los 7 P0

Por orden de daño.

| # | Pantalla | Qué pasa | Por qué |
|---|---|---|---|
| 1 | `/profesionales` | **Publicamos 12/9/6/4 % de comisión y cobramos 12/10/8/6 %** [verificado] | `ForProvidersPricing.tsx:17-46` nació como mock comercial; desde el 2026-08-31 el valor de BD va directo a `application_fee_amount` |
| 2 | ficha de centro | **El CTA dice "Reservar (próximamente)"** sobre un checkout que cobra de verdad [verificado] | Copy de Fase 0 en los 4 locales que nadie retiró al cerrar el cobro real |
| 3 | `/buscar` + ficha de centro | **La página revienta (500) si un centro no tiene fotos** [verificado] | `ProviderCard.tsx:75` hace `src={provider.photos[0]}` sin guarda. El wizard no tiene paso de fotos, así que `photos = []` es el estado normal de todo centro nuevo |
| 4 | `/panel/servicios/nuevo` | **Un servicio creado con el panel en ca/en/de nace sin nombre público** [verificado] | La action guarda `{ [locale]: texto }` y `pickLocalized` cae a `text.es ?? ''` |
| 5 | `/panel/centro` | **Si un centro se muda y corrige la dirección, sigue en las coordenadas viejas** [verificado] | `provider.repository.ts` no toca `location`; el `ST_MakePoint` solo existe en el repo del onboarding |
| 6 | ficha de centro | **Todos los servicios caen bajo "Otros"** | `ProviderServicesList.logic.ts:15` busca el `categoryId` (UUID) en un índice de ids fake (`cat-beauty`) |
| 7 | todo el embudo en `/en` y `/de` | **Nombres y descripciones de servicio en blanco** | 11 sitios indexan `LocalizedText` a pelo en vez de usar `pickLocalized` |

Los números 4, 6 y 7 son **la misma enfermedad**: residuo de los ids y las claves de Fase 0 tras migrar a Postgres. Es la tercera vez que aparece este patrón en el proyecto (ver la entrada de `TODO.md` sobre las regex de `prov-NN` / `cat-NN`). Merece un barrido dedicado, no tres parches.

---

# Área pública

## `/` — Landing

**Diseño** — Terminada y es la pantalla mejor acabada del repo. Disciplina de tokens ejemplar (cero `stone-*` en todo `features/landing`), dark mode razonado caso a caso.
- **P2** `CategoryGrid.tsx:101` pinta las 6 fotos como `backgroundImage` en vez de `next/image`: 6 JPEG sin AVIF/WebP ni `srcset`, justo debajo del LCP. El Hero sí se migró en su día; el grid se quedó atrás.

**Funcionalidad** — No toca BD, correcto para marketing. Pero **dos de los tres selectores del Hero no hacen lo que prometen**.
- **P1** El selector **"¿Cuándo?" es un control muerto**: `Hero.logic.ts:106` escribe `?when=today|tomorrow|this-week` y **nadie lo lee** — `buscar/page.tsx:74-86` parsea `q`, `cat`, `now`, `near`, `rating`, `price` y nada más. El usuario filtra "mañana" y recibe el listado completo.
- **P1** **`?cat=manicura` devuelve siempre cero resultados**: el slug real en BD es `manicura-pedicura`. Una de las 6 tarjetas de categoría lleva a una página vacía.
- **Tests: cero.** Ni Hero, ni CategoryGrid, ni el resto de secciones.

**Pasos**
1. Leer `sp.when` en `buscar/page.tsx`, o retirar el selector. No dejarlo escribiendo un parámetro fantasma.
2. `manicura` → `manicura-pedicura` en `Hero.tsx:36` y `CategoryGrid.tsx:41`, **más un test que cruce los slugs del Hero contra las categorías reales** para que no se repita.
3. `CategoryGrid` a `next/image` con `fill` + `sizes`.
4. Borrar `handleSelectSuggestion` (`Hero.logic.ts:123`), muerto desde que el dropdown quedó estático.

## `/buscar` — Listado + mapa

**Diseño** — Terminada; el split desktop / pestañas en móvil está bien resuelto.
- **P1 Sin estado de carga al refiltrar.** `useSearchView` calcula `isPending` y lo devuelve (`SearchView.logic.ts:225`), pero `SearchView.tsx:49-71` **no lo desestructura**. Cada cambio de filtro es un viaje al servidor sin ninguna señal: la lista se congela y cambia de golpe.
- **P1 El mapa es un rectángulo blanco en modo oscuro** (`SearchMap.tsx:171`): tiles OSM planos sin capa dark. Todo lo demás de la página invierte bien.
- **P2** "Limpiar filtros" no cierra el sheet (`SearchView.logic.ts:118`), a diferencia de "Aplicar".

**Funcionalidad** — Sobre Postgres real, con disponibilidad real desde julio. Quedan tres restos de Fase 0.
- **P0** El crash por `photos = []` (ver P0 #3) golpea aquí con máxima probabilidad.
- **P1 Los chips de categoría salen de `fake-data`** (`FiltersBar.tsx:6`). Funcionan por coincidencia de slugs; una categoría creada en BD no aparece como chip.
- **P1 `near=me` se pierde de la URL**: `buildSearchParams` no lo reemite, así que cualquier otro filtro lo borra y la URL no se puede compartir ni recargar.
- **P2** `searchProviders` nunca recibe `userLocation`, así que el orden por distancia del servidor es rama muerta y lo rehace el cliente.
- §6.bis: `providers.repository.ts` (316 líneas) y `SearchView.logic.ts` (259) pasan del límite de 250.
- **Tests**: 4 de ~10 componentes. **`lib/services/providers` no tiene ni un test**, pese a alimentar la pantalla principal.

**Pasos**
1. Consumir `isPending` (opacidad + `aria-busy`, o skeletons de card).
2. Reemitir `near` en `buildSearchParams`.
3. Cargar categorías raíz desde BD (`getCategoriesTree` ya existe y se usa en el panel) y pasarlas como prop.
4. Capa de tiles oscura, o `filter: invert(1) hue-rotate(180deg)` cuando el tema resuelto sea dark.
5. Trocear `providers.repository.ts`: el mismo `SELECT` está replicado en `findAll`/`findById`/`findBySlug`.

## `/centro/[slug]-[id]` — Ficha de centro

**Diseño** — La mejor resuelta del repo: galería con dos layouts, nav sticky con IntersectionObserver, estados vacíos honestos.
- **P0** Crash con `photos = []` (`ProviderGallery.tsx:140`).
- **P1** `ProviderDetailNav.tsx:66` tiene el `aria-label` **hardcodeado en castellano**. Es la única cadena de usuario sin i18n de las 8 pantallas públicas.
- **P2** La galería repite el mismo `alt` en las N fotos: un lector de pantalla oye el nombre del centro cinco veces.

**Funcionalidad** — Datos reales y bien paralelizados, con tres defectos gordos.
- **P0** **El CTA dice "Reservar (próximamente)"** y la nota bajo él recomienda *"contacta directamente con el centro"*. Sobre un checkout que cobra desde el 31 de agosto. Le estamos diciendo al cliente que no reserve.
- **P0** **Todos los servicios se agrupan bajo "Otros"** desde la migración de junio.
- **P1 El desglose de estrellas no cuadra con el total**: se calcula sobre las 20 reseñas que trae la query pero se divide entre el total real. Un centro con 40 reseñas de 5★ muestra la barra al 50%.
- **P2** El mapa desactiva el control de atribución y a la vez pasa `attribution` al TileLayer: los tiles de OSM salen **sin crédito**.
- **Tests: cero componentes.**

**Pasos**
1. Reescribir `reserveCta` y borrar `comingSoonNote` en los 4 locales; quitar su render.
2. Resolver la categoría raíz contra BD (pasar el árbol real como prop, o añadir `rootCategorySlug` al `Service` del repo) + test de regresión con un `categoryId` UUID.
3. Guarda de `photos.length === 0` con placeholder.
4. Breakdown en SQL sobre todas las reseñas, o etiquetarlo como "últimas 20".
5. `aria-label` a clave i18n × 4 locales.

## `/centro/[slug]-[id]/servicio/[id]` — Ficha de servicio

**Diseño** — Terminada, limpia, breadcrumb accesible. Sin hallazgos.

**Funcionalidad** — Lee de BD, pero:
- **P1 La pantalla es inalcanzable.** Nada en todo el repo enlaza a esta ruta: el sheet de la ficha va directo a `/reservar`, las sugerencias de tipo `service` navegan al proveedor, y el sitemap solo lista 4 rutas estáticas. Una ficha con `generateMetadata` y OG propia que no ve nadie.
- **P1** Nombres en blanco en `/en` y `/de` (P0 #7).
- **P2** `professional={null}` cableado a fuego con un comentario de Fase 0 que ya no es cierto: el checkout sí resuelve el profesional.

**Pasos**
1. **Decidir**: o se enlaza (botón "Ver ficha completa" en el sheet + enrutar ahí las sugerencias de servicio), o se borra la ruta. Mantenerla huérfana con SEO propio es lo peor de las dos opciones.
2. Resolver el `Professional` real (el lookup ya existe en el motor de disponibilidad).

## `/centro/[slug]-[id]/reservar` — Flujo de reserva

**Diseño** — Terminada: stepper, 6 errores tipados, Stripe Elements con tema y locale heredados.
- **P1 El SlotPicker no distingue "cargando" de "sin huecos".** El hook devuelve `isLoading` e `isError` y el componente **solo desestructura `slots`**. En el primer render el usuario ve *"No hay huecos disponibles"* mientras la petición está en vuelo — y exactamente lo mismo si la API devuelve 500. **La página miente en vez de fallar.**
- **P2** Mañana/Tarde se parten con la hora del navegador (`getHours()`) mientras la hora se pinta en Madrid: un usuario en Berlín ve un slot "13:30" bajo "Tarde".

**Funcionalidad** — Real de punta a punta. Dos agujeros de embudo:
- **P1 Sin barrera de autenticación**: el usuario anónimo descubre que necesita cuenta **en el paso 3**, y el enlace a `/entrar` no lleva retorno. Al volver, el draft está vacío: slot y notas perdidos.
- **P1 "¡Reserva confirmada!" antes de que llegue el webhook** en el camino sin 3DS, que es el mayoritario. La página dedicada `/confirmacion` sí lo maneja bien; el camino en línea se quedó atrás y contradice el criterio de copy honesto que `DO.md` da por cerrado.
- **P2** El "Total" sale del precio que tiene el cliente, no del `amountCents` que devuelve el servidor.

**Pasos**
1. Consumir `isLoading`/`isError` en `SlotPicker`: skeleton al cargar, error con reintento al fallar.
2. Persistir el draft (sessionStorage, como ya hace el wizard de onboarding) y pasar `redirect_url` a `/entrar`. O barrera de auth antes del paso 1.
3. `paymentPending` también en el camino en línea.
4. Partir mañana/tarde con `Intl.DateTimeFormat` en `Europe/Madrid`.

## `/centro/[slug]-[id]/reservar/confirmacion` — Confirmación

**Diseño** — Terminada. **P2**: la fila "Cuándo" sale como *"lunes 5 de octubre, 10:00 · 10:45"* porque la fecha larga ya incluye la hora.

**Funcionalidad** — Correcta y bien pensada: lee de BD y no del `redirect_status`, comprueba titularidad, 404 indistinto, `noindex`.
- **P1 No hay ningún enlace a `/mis-reservas`.** El texto remite literalmente a *«Mis reservas»* y no la enlaza. Desde el 20 de septiembre esa pantalla funciona: el usuario que acaba de pagar no tiene camino hacia ella.
- **P1** *"Hemos enviado los detalles a tu email"* y no sale ningún correo.
- **Tests: cero.** Es el último paso de un flujo que mueve dinero.

**Pasos**
1. "Seguir explorando" → "Ver mis reservas".
2. Quitar la promesa del email hasta que Resend esté cableado.
3. Test con `paymentPending` en ambos estados.

## `/profesionales` — Captación de proveedores

**Diseño** — Terminada y con buen acabado. Sin hallazgos.

**Funcionalidad** — Marketing estático, pero el embudo no conecta.
- **P0 Comisiones publicadas ≠ cobradas** (ver P0 #1).
- **P1 Los 6 CTAs pierden la intención**: todos van a `/registro?as=provider&plan=X` y **ni la página ni el formulario leen los searchParams**. El profesional que pulsa "Empezar con Pro" aterriza en un formulario con la pestaña **cliente** marcada y el plan olvidado. Las 4 tarjetas de precio son, funcionalmente, el mismo botón.

**Pasos**
1. Unificar la fuente de verdad de comisiones: leer `Plan` de BD (es Server Component) o, como mínimo, **un test que compare las tarifas publicadas contra el seed y falle al divergir**.
2. Leer `as` y `plan` en `registro/page.tsx` y pasarlos como `initialRole` / `initialPlan`.

## `/design-system` — Galería interna

Bien para lo que es. **P2**: no cubre `AvailabilityBadge` (el único con color hardcodeado fuera del Hero) ni Card/Badge/Skeleton/Dialog — justo lo que más se usa. Siendo su propósito declarado detectar regresiones cromáticas, el badge verde/ámbar es lo primero que debería vigilar.

---

# Panel del proveedor

## `/onboarding` — Wizard de alta

**Diseño** — El mejor acabado del lote: tokens al 100%, stepper accesible con `aria-live`.
- **P2** El `min-h-[calc(100vh-4rem)]` debería ser `dvh` (el panel ya lo usa): en Safari móvil la barra tapa los CTAs.

**Funcionalidad** — Real de punta a punta (5 endpoints, 51 tests), con **tres callejones sin salida**.
- **P1 El wizard se puede quedar colgado para siempre.** Tras 5 intentos de sincronización (10 s) el polling para **en silencio**: el usuario se queda en "Sincronizando…" sin error, sin reintento y sin enlace a soporte.
- **P1 Dos `return false` mudos**: si falla el guard local, el botón "Siguiente" no hace nada y no explica por qué.
- **P1 El checkbox de términos no enlaza a los términos.** Es texto plano. Aceptación legal no sostenible.
- **P1 No hay salida del wizard**: ni "Salir", ni logout, ni enlace a la home. Y el layout del panel devuelve aquí a quien no tenga `Provider`. Quien entre, queda atrapado.
- El endpoint `/api/provider-onboarding/photos` está implementado y testeado, y **tiene cero consumidores en el wizard**.

**Pasos**
1. Botón "Reintentar" + copy de fallo al agotar los intentos de sincronización.
2. `setStepError` en los dos `return false`.
3. Enlazar términos y privacidad.
4. Salida del wizard.

## `/panel` — Dashboard

**Diseño** — Terminado y tokenizado.
- **P1 No hay estado vacío.** Un proveedor recién dado de alta ve 4 KPIs a 0 €, una gráfica de barras a cero y una card "Top servicios" con título y lista vacía. No existe la clave `dashboard.empty` en ningún locale.
- **P1 El chip de delta es verde con flecha hacia arriba cuando el delta es 0**: el proveedor nuevo ve cuatro "subidas" sobre cero euros.

**Funcionalidad** — Datos reales. Ocupación a 0% y rango semanal en UTC ya anotados.
- **P1** Sin `loading.tsx`: la agregación se espera sin esqueleto.
- **`dashboard-metrics.service.ts` no tiene ningún test**: ni deltas, ni top de servicios, ni ticket medio.

## `/panel/calendario` — Calendario semanal

**Diseño** — Terminado. La mejor pantalla del panel tras el trabajo del 20 de septiembre.
- **P1 Las reservas fuera de 08:00–21:00 se pintan fuera de la cuadrícula**: no hay `clamp` ni `overflow-hidden`, y el editor de horario permite cualquier hora. Una cita a las 07:30 aparece flotando por encima de la rejilla.

**Funcionalidad** — Real y bien cableada: completar y cancelar funcionan, con `REFUND_FAILED` manejado y la ventana de 2 h revalidada en cliente.
- **P1 No existe navegación de semana.** Solo se puede ver la semana actual: el proveedor no puede consultar la que viene ni revisar la pasada. Es la mayor carencia funcional del panel.

**Pasos**
1. `weekOffset` por searchParam + botones ‹ ›.
2. `clamp` de la posición + chip "fuera de horario".

## `/panel/centro` — Configuración del negocio

**Diseño** — Terminado y tokenizado.
- **P1 Los 4 campos deshabilitados no explican por qué lo están**: ni `aria-describedby`, ni texto de ayuda, ni el chip "Próximamente" que sí lleva la card de multi-negocio. El proveedor ve cuatro campos muertos y no sabe si es un bug.
- **P1 Hueco de estados en la card de Stripe**: con cargos habilitados pero payouts retenidos —un estado real— no sale ningún badge y la descripción queda vacía.

**Funcionalidad** — Parcialmente migrada.

**Lo que NO persiste, inventario exacto:** teléfono, email de contacto, ciudad y código postal. Los cuatro `disabled`, ninguno llega al schema. Y **son esos cuatro y ninguno más**: el resto (nombre, NIF, descripción, dirección, horario, fotos) guarda de verdad.
- **P0 La dirección editable desincroniza la geolocalización** (ver P0 #5).
- **P1 Campos sin ninguna superficie de edición**: `slug` (la URL pública, que el wizard enseña y luego congela para siempre), `priceRange` y `businessType`.

**Pasos**
1. Re-geocodificar al guardar la dirección, o bloquear el campo tras un "cambiar dirección" que pase por `AddressAutocomplete`.
2. Explicar los 4 campos deshabilitados.
3. Cuarta rama en la card de Stripe para payouts retenidos.

## `/panel/centro/stripe/return` y `/refresh`

Redirects puros, correctos. **P1**: el fallback a `localhost:3000` cuando falta `NEXT_PUBLIC_APP_URL` mata el onboarding en silencio — merece fallar explícitamente en producción. **P2**: el JSDoc de `return` justifica la ruta con un motivo que ya sabemos falso (los AccountLinks no exigen URL fija en el dashboard).

## `/panel/servicios` — Listado

**Diseño** — Terminado, con estado vacío real.

**Funcionalidad** — Real y completa: pausar, borrar (soft delete) y editar funcionan.
- **P1** Indexa `name[locale]` en vez de `pickLocalized`: un servicio creado en `es` visto con el panel en `de` sale **en blanco**.
- **P2** Dos JSDoc mentirosos: *"las acciones no están cableadas todavía… CTAs mock"*. Falso desde el 12 de junio.

## `/panel/servicios/nuevo` y `/[id]/editar`

**Diseño** — Terminado. **P1**: sin validación de cliente, el submit hace viaje al servidor para devolver un banner genérico. **P2**: el botón "Cancelar" llama a `reset()` y **no navega a ningún sitio**.

**Funcionalidad** — Persiste de verdad, con categorías reales.
- **P0 Un servicio creado en ca/en/de nace sin nombre público** (ver P0 #4). Necesita arreglo **y migración de datos** para los ya creados.
- **P1 Cuatro mensajes de error en castellano hardcodeado**, y el formulario **prioriza ese string sobre la clave i18n**: un proveedor alemán siempre ve español.
- **P2** El JSDoc dice *"El envío todavía no persiste nada (mock visual)"*. Es el comentario más engañoso del panel.

**Pasos**
1. Rellenar `es` al crear (aunque sea duplicando el texto del locale activo) + migración de los existentes.
2. Quitar el `result.message ??` y pasar los 4 mensajes a códigos i18n.
3. Validación de cliente; que "Cancelar" navegue.

## `/panel/valoraciones` — Reseñas recibidas

**Diseño** — Terminado.
- **P1 Un solo mensaje de vacío para dos situaciones distintas**: el proveedor sin ninguna reseña, que no ha tocado un solo filtro, lee *"No hay valoraciones que coincidan con los filtros"*.
- **P1 La puntuación no es audible**: las estrellas van `aria-hidden` y el `aria-label` está en un `div` sin rol.
- **P2** Con 0 reseñas el header pinta "0,0 · 0 valoraciones", que se lee como una nota de cero estrellas.

**Funcionalidad** — Real, y responder está cableado de verdad. Sin tests del filtrado.

---

# Área de cliente

## `/mis-reservas`

**Diseño** — Terminada y coherente tras la migración del 20 de septiembre.
- **P2** Un cliente sin ninguna reserva ve **tres** mensajes de vacío apilados y ningún CTA a `/buscar`.
- **P2** Cada tarjeta lleva `role="status"`: un lector de pantalla anuncia una región viva por reserva al cargar.

**Funcionalidad** — Datos reales, filtro por `clientId` en la query.
- **P1 El botón "Valorar" no hace nada**: sin `onClick`, sin `href`. Se pinta en "Valoraciones pendientes" sobre reservas reales. **Es el reverso exacto del botón de cancelar que retiramos el día 20.**
- **P2** Las reservas `pending` (checkout abandonado) aparecen en "Próximas" como si fueran citas en pie.

**Pasos**
1. Ocultar o deshabilitar "Valorar" hasta que exista el formulario de reseña.
2. Estado vacío global con CTA a `/buscar`.

## `/cuenta`

**Diseño** — La única pantalla del área de cliente que sigue en la paleta de Fase 0 (ya anotado), **más una divergencia que no lo estaba**:
- **P1 El titular se pinta en Times, no en Fraunces.** Usa `font-serif`, y ese token **no existe** en `globals.css` — solo hay `--font-sans`, `--font-mono` y `--font-display`. Tailwind cae a su serif por defecto. Mismo fallo en `panel/error.tsx:32`. Es la divergencia visual más visible de las dos y se arregla con una palabra.
- Inventario completo para cuando se aborde la migración: **22 de las 23 entradas** del objeto de estilos son `stone-*`.

**Funcionalidad** — **Mejor de lo que yo sospechaba**: el logout y el cambio de modo UI persisten de verdad (cookie de un año, `revalidatePath`, degradado silencioso si un no-proveedor fuerza el modo). Los dos items inertes ("Favoritos", "Ajustes") están honestamente etiquetados "Próximamente".
- **P1** El docstring promete un grupo de utilidades para usuarios anónimos que **no existe**. O se implementa o se corrige el comentario.
- Sin tests.

---

# Autenticación

## `/entrar`

**Diseño** — Terminada, tokens correctos, errores bien anclados con ARIA.

**Funcionalidad** — Clerk real y completo, con **dos controles inertes**:
- **P1 "Recordarme" no hace nada**: se guarda en estado, se valida en Zod, y **nunca se pasa a `signIn.create`**.
- **P1 Las pestañas Cliente/Proveedor no hacen nada**: el destino sale del rol real en Clerk. Un proveedor que elija "Cliente" acaba en `/panel` igual. Y el comentario del código afirma lo contrario.
- **P2** Tres docstrings dicen *"mock"* y *"no conectamos con Clerk todavía"*. Falso desde hace meses.

## `/registro`

**Funcionalidad** — El flujo de Clerk está completo: alta → OTP por email → verificación → redirección por rol, con el webhook promocionando el rol a `publicMetadata`.
- **P1 Términos y Privacidad del checkbox obligatorio apuntan a la home.** Con GDPR de por medio, esto no es cosmético.
- **P2 No hay "reenviar código"**: si el OTP no llega o caduca, la única salida es volver atrás, lo que descarta el alta y obliga a reintroducir todo. Es el fallo más probable de un registro real.

## `/recuperar`

**La mejor pieza de auth del repo.** Flujo real en dos fases con **prevención de enumeración de cuentas bien hecha y bien razonada**: un email inexistente avanza igual, con el porqué documentado. Sin hallazgos más allá del "reenviar código".

---

# Admin

## `/admin` y `/admin/verificaciones/[id]`

**Diseño** — Terminado y sobrio, pero:
- **P1 El panel admin arrastra el chrome público.** Su propio docstring afirma que *"deliberadamente NO reutiliza el Header/Footer del marketplace"*. **Es falso**: el layout de `[locale]` los monta para todo el árbol. Resultado: header público encima del topbar del admin —dos cabeceras apiladas— y el footer de marketing debajo.
- **P1 Dos landmarks `<main>` anidados**: HTML inválido y navegación por landmarks rota.
- **P1 Los cuatro chips de KPI salen verdes con flecha hacia arriba y "+0.0%"**, incluida la tasa de cancelación, donde subir sería malo. No existe variante neutra pese a que el comentario del service afirma que sí.

**Funcionalidad** — Opera de verdad sobre Postgres, y las server actions son **el módulo mejor construido del repo**: doble guard (layout + action), transacción, errores tipados.
- **P0 conceptual: el admin aprueba proveedores a ciegas.** El bloque "Documentos" está codificado para estar **siempre vacío** — el onboarding no los sube. La pantalla se llama "ficha de verificación" y `TODO.md` la da por hecha *"con documentos"*. Hoy la decisión se toma sobre nombre, ciudad y email.
- Arrastra ~24 líneas de código muerto que nunca pueden renderizarse, con un comentario sobre un "documento mock" de Fase 0.

---

# Chrome global

**Diseño e i18n** — Excelente. Paridad perfecta de **972 claves en los 4 idiomas**, cero textos hardcodeados salvo un `aria-label="Contacto"` en el footer. Touch targets de 44px, `safe-area-inset`, anti-FOUC de tema bien resuelto, y el selector de idioma conmuta a `<select>` nativo en compacto para no romper 375px con 4 locales.

**Los tres agujeros:**

- **P1 El SEO multi-idioma está roto.** El `hreflang` y la URL canónica se quedaron congelados en la estrategia de rutas anterior: se declaran `es` y `ca`, y **faltan `en` y `de` por completo** — justo los dos mercados por los que se hizo el refactor de 4 idiomas. Además se declara como canónica una URL que redirige, y el sitemap publica 4 entradas inválidas.
- **P1 No existe `[locale]/error.tsx`.** Solo hay boundary global y el del panel. Si Postgres tose en cualquier pantalla, el usuario recibe una **pantalla en blanco sin marca, sin idioma, sin header y sin botón de volver**. El propio archivo global reconoce que el CTA "Ir al inicio" llegaría "en Fase 1". Ya estamos en Fase 1.
- **P1 El footer es decorativo: 12 enlaces, 12 destinos falsos.** Todos `href="#"`, incluidos **Términos, Privacidad y Cookies**, traducidos y con aspecto de enlace real en los 4 idiomas. Y un `href="#"` hace scroll al inicio, así que el usuario cree que el click ha fallado. Al menos dos de esos destinos **ya existen** (cómo funciona → sección de la landing; precios → `/profesionales`).

**Además**
- **P1** Las previsualizaciones al compartir están rotas: el layout apunta a `/og-default.png` y en `public/` solo existe `og-default.svg` [verificado]. Las plataformas no renderizan SVG en Open Graph, así que hoy da 404.
- **P2** Cero `loading.tsx` en todo el repo: ninguna pantalla tiene esqueleto pese a hacer entre 1 y 4 consultas a Postgres.
- **P2** El enlace "saltar al contenido" mueve el scroll pero **no el foco**: falta `tabIndex={-1}` en el `<main>`.

---

# Comentarios que mienten

Un apartado propio porque es un riesgo real: quien audite el código por encima sacará conclusiones falsas.

| Archivo | Dice | Realidad |
|---|---|---|
| `SignInForm.tsx:14,21` | "formulario mock", "no conectamos con Clerk todavía" | Clerk real desde hace meses |
| `SignInForm.tsx:83` | "las pestañas cambian el destino post-login" | No lo cambian |
| `AddServiceForm.tsx:26` | "el envío todavía no persiste nada (mock visual)" | Persiste desde el 12 de junio |
| `ServicesList.tsx:19` | "editar, pausar y reactivar no están cableadas" | Cableadas desde el 12 de junio |
| `AdminShell.tsx:10` | "NO reutiliza el Header/Footer del marketplace" | Los reutiliza |
| `admin-metrics.service.ts:22` | "la UI pinta el chip neutro cuando es 0" | No existe variante neutra |
| `cuenta/page.tsx:118` | "grupo de utilidades públicas para anónimos" | No existe |
| `layout.tsx:84`, `sitemap.ts:29` | "con `localePrefix: 'as-needed'`" | Es `'always'` desde el refactor de 4 locales |
| `global-error.tsx:10` | "solo si escapa del error.tsx por locale" | Ese archivo no existe: salta siempre |
| `SkipToContent.tsx:9` | "mueve el foco al wrapper" | Solo mueve el scroll |
| `return/page.tsx:20` | "Stripe exige una URL fija en su dashboard" | Falso con AccountLinks |

---

# Cobertura de tests

| Área | Estado |
|---|---|
| Servicios de dominio | Bien cubiertos (booking, checkout, availability, verification, search) |
| **`lib/services/providers`** | **Cero tests** — y alimenta `/buscar`, la pantalla principal |
| **Server actions del panel** | **Cero tests en los 7 ficheros** — y es donde vive la autorización |
| `dashboard-metrics.service.ts` | Sin tests |
| Landing, ficha de centro, confirmación | Cero componentes testeados |
| E2E | Solo onboarding y flujo de proveedor. Ningún flujo de cliente ni de admin |

---

# Orden de ataque sugerido

**Tanda 1 — engaños y caídas** (nada aquí lleva más de una sentada)
1. Comisiones: alinear lo publicado con lo cobrado + test que falle al divergir.
2. Retirar el "(próximamente)" del CTA de reservar en los 4 locales.
3. Guarda de `photos = []` en tarjeta y galería.
4. `es` siempre presente al crear servicio + migración de los existentes.
5. Re-geocodificar al cambiar la dirección.

**Tanda 2 — el barrido de residuos de Fase 0**
Es una sola tarea, no seis: `pickLocalized` en los 11 sitios, categoría raíz contra BD, slug `manicura-pedicura`, y los tres ficheros de `fake-data` que ya no usa nadie. Todo sale de la misma causa.

**Tanda 3 — lo que el usuario nota cada día**
`error.tsx` por locale, `hreflang`/canonical/sitemap, navegación de semana en el calendario, estado de carga en buscador y SlotPicker, botón "Valorar" muerto, footer legal.

**Tanda 4 — barrido de comentarios mentirosos**
Media hora, y evita que el próximo que lea el código (o el próximo agente) saque conclusiones falsas.

---

*Generado el 2026-09-23. Las tareas accionables se van moviendo a `TODO.md` conforme se prioricen.*
