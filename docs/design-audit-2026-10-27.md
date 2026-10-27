# Auditoría de diseño — Yaiwell frente a criterios 2026 → 2027

> Fecha: 2026-10-27 · Agente: `design-auditor` (solo lectura) · Playbook P7.
> Alcance: `/es`, `/es/buscar`, ficha de Atelier Norte, flujo de reserva hasta el paso 2/4 (sin pagar ni rellenar datos personales), `/es/profesionales`, `/es/entrar` — a 375 px y 1440 px, claro y oscuro, en `https://yaiwell2.vercel.app` — más `globals.css`, `components.json`, `src/components/ui/` y `src/components/features/`.
>
> **Método:** el navegador integrado mide 800 px de ancho, así que 1440 px es una emulación reducida y el sheet de la ficha no se pudo inspeccionar en desktop (sí en móvil). Los contrastes se **calcularon en el navegador** con los tokens OKLCH reales. No se pasó Lighthouse: el rendimiento se valora por observación.

---

## 1. Resumen ejecutivo

1. La base es de 2026: tokens OKLCH, modo oscuro como pieza propia, serif editorial (Fraunces) + sans (Inter), i18n en 4 idiomas, `next/image`, `loading.tsx`/`error.tsx` por locale. Varios pendientes de auditorías anteriores ya están cerrados.
2. El punto débil es la **accesibilidad del color justo en el diferenciador**: el badge de disponibilidad («En 46 min», «Disponible ahora») tiene **1,55:1 y 2,04:1** en claro, y el texto de todos los CTA primarios en oscuro **3,58:1**.
3. La **confianza** va por detrás de la promesa premium: sin sello «verificado» en la ficha, «4.8 · 312 valoraciones» encima de «Aún no hay reseñas», sin páginas legales y con «cancela gratis hasta 2 h antes» en reservas que empiezan en 1 h.
4. La política nueva (30 min de antelación mínima, prepago no reembolsable en < 2 h, pago en el local futuro en > 2 h) **contradice 5 textos ya publicados** y vacía de sentido «Ahora» en el hero y en los filtros.
5. Para 2027 envejecerán mal un sistema de componentes demasiado fino (4 primitivas en `ui/`, diálogos copiados en cada feature) y medidas de botón de escritorio (h-8 = 32 px) en un producto mobile-first.

**Nota global: 3/5** — buen oficio visual, con deuda de accesibilidad y de confianza que hay que pagar antes de captar tráfico real.

---

## 2. Notas por criterio

| Criterio | Nota | Evidencia | Tendencia que aplica |
|---|---|---|---|
| Sistema de diseño y tokens | 3 | Tokens OKLCH con contrastes documentados en `globals.css`. Pero `src/components/ui/` solo tiene `button`, `select`, `skeleton`, `tabs`; el mismo overlay/dialog está copiado en `ServiceDetailSheet.styles.ts`, `BookingActionsList.styles.ts`, `ServiceDeleteButton.styles.ts`, `FiltersSheet.styles.ts`, `VerificationDetail.styles.ts`. 6 variantes de foco distintas. Sin tokens semánticos de estado (success/warning/info): la disponibilidad reutiliza pasteles de marca. Siguen `lg:top-[124px]` y `font-serif` en `cuenta/page.tsx:65`. | **Duradero:** tokens semánticos y sistema como fuente de verdad (también para generar UI con IA). |
| Jerarquía y tipografía | 4 | Fraunces h1–h3 + Inter, buen ritmo. A 1440 px la lista de `/buscar` muestra una card por pantalla (~550 px): desktop desaprovecha el ancho. «Pulsa para ver detalles» también en desktop. | **Duradero:** tipografía con carácter. **Moda:** titulares gigantes sin justificar. |
| Color y modo oscuro | 3 | Modo oscuro editorial y mapa invertido (resuelto desde 2026-09-23). Fallos: texto del primario en oscuro 3,58:1 («Buscar», «Ir al pago», «Registrarse»); el velo de los sheets `bg-foreground/40` **aclara** la página en oscuro; las cards de categoría en oscuro (rojo, morado, verde, oliva saturados) se alejan de los tonos tierra. | **Duradero:** modo oscuro como diseño propio. **Moda:** degradados pastel arcoíris. |
| Móvil y pulgar | 3 | Bottom nav correcta, slots de 44 px, selector de idioma como `<select>`. Fallos: lo fijo arriba en `/buscar` suma ~260 px (81 + 179), el 43 % de un móvil de 600 px (pendiente desde §A.2 de mayo); «Continuar» e «Ir al pago» no son fijos; el aviso de ubicación tapa el hero en la primera visita; el selector de tema de 3 estados ocupa la cabecera en móvil; la fila de chips aparece desplazada sin pista de scroll. | **Duradero:** CTA principal fijo y al alcance del pulgar. |
| Accesibilidad (WCAG 2.2 AA) | 2 | Medido: badge «pronto» **1,55:1**, «ahora» **2,04:1**, CTA en oscuro **3,58:1**, primario sobre card en oscuro **4,46:1**, anillo de foco en claro **2,0:1** al 100 % (el botón usa `/50`, menos aún), borde de input sobre card **1,2:1**. Pines del mapa solo por color (1.4.1). Cerrar popup del mapa: 22 px (2.5.8 pide 24). `prefers-reduced-motion` solo en el halo del pin. El tooltip del asterisco de distancia no se ve en táctil. A favor: skip link, combobox ARIA, aria-labels traducidos. | **Duradero:** el EAA aplica desde 2025-06-28 a reservas online. |
| Microinteracciones y feedback | 3 | Sheets y dialogs animados, spinners en pago y login. Sin feedback al cambiar de slot más allá del estado seleccionado. Sin verificar en navegador el `isPending` de `/buscar` y el `isLoading` del SlotPicker. | **Duradero:** movimiento que comunica estado, < 300 ms y respetando reduce-motion. |
| Estados vacíos, carga y error | 3 | `loading.tsx` en buscar, centro, mis-reservas y panel, y `[locale]/error.tsx` (resuelto). Pendiente: galería de la ficha con **huecos vacíos** si hay 2 fotos; `/reservar` sin `serviceId` dice «Centro no encontrado»; «Studio Aura **0.0 · 0 valoraciones**» en la card pública; «CrossFit Lliçà de Vall **desde 0 €**». | **Duradero:** errores conversacionales (VISION §7). |
| Confianza | 2 | Sin sello «Verificado por Yaiwell» en ficha ni cards (promesa nº 2). Contradicción «4.8 · 312 valoraciones» frente a «Aún no hay reseñas». Footer sin Términos, Privacidad, Cookies ni Aviso legal. Política de cancelación que no depende del slot. «Lo más reservado por la comunidad esta semana» es texto fijo. Google/Apple «Próximamente» en `/entrar`. Formato de precio mixto («€ 0 /mes» frente a «45 €»). | **Duradero:** precio total visible desde el inicio y condiciones antes de pagar. |
| Rendimiento percibido | 3 | `next/image` lazy en cards (resuelto), esqueletos, sin saltos visibles en la emulación. Hero con foto grande y velo. LCP sin medir. | **Duradero:** Core Web Vitals, INP. |
| Preparación para 2027 | 3 | Aguantan los cimientos (OKLCH, RSC, i18n, separación de lógica). Envejecerán: medidas de botón de escritorio, dialogs sin primitiva, sin tokens de movimiento ni de capas (z-index), y semántica de color atada a pasteles. | Ver §4. |

---

## 3. Hallazgos priorizados

### P0 — rompen confianza o accesibilidad en el diferenciador

| # | Hallazgo | Evidencia | Propuesta | Esfuerzo |
|---|---|---|---|---|
| 1 | **El badge de disponibilidad no se lee en modo claro** | `AvailabilityBadge.styles.ts`: `text-brand-butter` sobre `bg-brand-butter-soft` = 1,55:1; `text-brand-sage` sobre `sage-soft` = 2,04:1 | Tokens semánticos `--status-now`, `--status-soon`, `--status-busy` con par fondo/texto ≥ 4,5:1 en ambos modos (texto en L ≈ 0.40–0.45 en claro). Generalizar el criterio de la variante `solid`, que sí cumple. | S |
| 2 | **Política de cancelación falsa para reservas a menos de 2 h** | Paso 2 con el slot de las 10:15 elegido a las 09:14: «Puedes cancelar gratis hasta 2h antes…» dos veces (`es.json:679-681`) | Política dinámica según el slot (§3.bis), mencionada una sola vez | M |
| 3 | **Valoraciones contradictorias en la ficha** | Atelier Norte: cabecera «4.8 · 312 valoraciones» y sección «Aún no hay reseñas» | Una sola fuente de verdad: nota calculada con `Review` reales; si no hay, «Nuevo en Yaiwell» en vez de un número (resuelve también «0.0 · 0») | M |
| 4 | **Texto de los CTA primarios por debajo de AA en oscuro** | `--primary-foreground` 0.97 sobre `--primary` 0.62 en `.dark` = 3,58:1 | Oscurecer el primario en oscuro a L ≈ 0.52 manteniendo el croma, o texto oscuro sobre rosa claro. Recalcular el primario sobre card (4,46:1) | S |
| 5 | **Sin páginas legales con pago real activo** | Footer solo con «Producto» y «Contacto»; `TODO.md` | Bloqueante antes de tráfico: Aviso legal (LSSI), Términos con la política de cancelación, Privacidad, Cookies. Diseño mínimo: página de texto largo con índice fijo | M (+ textos legales) |

### P1 — el usuario lo nota y le frena

| # | Hallazgo | Evidencia | Propuesta | Esfuerzo |
|---|---|---|---|---|
| 6 | «Ahora» pierde sentido con 30 min de antelación | Hero «¿Cuándo? Ahora», filtro «Solo disponibles ahora», pin verde «libre ahora» (VISION §6.1) | Renombrar a «En la próxima hora» u «Hoy»; el verde significa «reservable en 30–60 min» y lo explica la leyenda del mapa | S |
| 7 | La promesa de verificación no se ve | Ningún «verific…» en la ficha | Sello «Verificado por Yaiwell» junto al nombre con un tooltip o sheet que explique qué se comprueba; solo el icono en las cards | S |
| 8 | La landing promete «Sin compromiso: cancela hasta 2 horas antes» | `es.json:148` y `/entrar` (`es.json:1065`) | Reescribir (§3.bis) | S |
| 9 | Anillo de foco e inputs por debajo de 3:1 (1.4.11 / 2.4.7) | Anillo 2,0:1 (con `/50`, menos); borde de input 1,2:1 | Token de foco único: `outline` de 2 px en `--ring` con L ≈ 0.50 en claro, ≥ 3:1 y sin opacidad; borde de input ≥ 3:1 | S |
| 10 | El velo de los sheets aclara la página en modo oscuro | `bg-foreground/40` en 4 `.styles.ts` | `bg-black/50` en ambos modos, dentro de las primitivas `ui/sheet` y `ui/dialog` (#16) | S |
| 11 | Lo fijo arriba en `/buscar` móvil ocupa ~260 px | 81 + 179 px medidos; pendiente desde §A.2 (2026-05-27) | Ocultar la cabecera global al hacer scroll, comprimir los filtros a una fila (pastilla de búsqueda + botón de filtros) y quitar el título en móvil | M |
| 12 | Los CTA del flujo de reserva no son fijos | «Continuar» queda debajo de 9 slots | Barra inferior fija con resumen (hora · precio) y CTA, por encima de la bottom nav o sustituyéndola dentro del flujo | M |
| 13 | El orden de `/buscar` contradice la promesa nº 1 | El primer resultado es «Sin hueco hoy» (orden por distancia) | Por defecto, disponibilidad primero y distancia después, o separar «Con hueco hoy» del resto | S/M |
| 14 | Datos de baja calidad publicados | «desde 0 €»; dirección larga de Google («…provincia de Barcelona, España») frente a la corta del resto | Ocultar «desde» si el mínimo es 0; normalizar la dirección al publicar | S |
| 15 | Galería con huecos vacíos | Ficha con 2 fotos y dos teselas vacías | Layout según el número de fotos (1, 2, 3, 5+) | S |
| 16 | Faltan primitivas Dialog, Sheet, Badge, Card y Chip | 5 copias del mismo overlay y dialog | `ui/dialog`, `ui/sheet`, `ui/badge`, `ui/card`, `ui/chip` con `cva`, y migrar. Es lo que más rentabiliza la app de React Native | M/L |
| 17 | Medidas de Button de escritorio | `button.tsx`: `default` h-8 (32 px), `lg` h-9 (36 px) | ≥ 44 px en táctil (`size="touch"` por defecto en móvil o `min-h-11` en `pointer:coarse`) | S |
| 18 | El sheet de servicio es un paso de más | Repite duración y precio de la card; recorrido card → sheet → reservar → slot → datos → pago | Mostrar en el sheet los 3 próximos huecos («Hoy 10:15 · 11:30 · 12:45») y, al tocar uno, ir directo al paso 2 (los «3 toques» de VISION §6.1) | M |

### P2 — pulido

| # | Hallazgo | Propuesta | Esfuerzo |
|---|---|---|---|
| 19 | «Cancelar reserva» como secundario en el paso 1, cuando aún no hay reserva | «Salir» o «Volver al centro» | S |
| 20 | El paso 2 repite fecha y hora («martes, 27 de octubre, 10:15» y «10:15 → 11:15»), igual que la confirmación (pendiente de 2026-09-23) | «Hoy · 10:15–11:15 (en 1 h)» | S |
| 21 | Título SEO duplicado: «Atelier Norte · Yaiwell \| Yaiwell» | Quitar el sufijo que ya añade la plantilla | S |
| 22 | Disponibilidad en dos formatos («En 48 min» y «Libre a las 10:15») | Una sola regla: relativo si falta menos de 60 min, hora absoluta si falta más | S |
| 23 | La aclaración del asterisco de distancia solo está en `title` | Nota visible bajo el contador de resultados cuando no hay ubicación real | S |
| 24 | Pines del mapa de 12 px, solo color y sin información | Pastillas con hora o precio («10:15 · 38 €») y forma o icono según el estado | M |
| 25 | `prefers-reduced-motion` solo en el halo | Regla global `@media (prefers-reduced-motion)` que anule `animate-in` y `slide-in` | S |
| 26 | Google y Apple «Próximamente» en el login | Quitarlos hasta que funcionen | S |
| 27 | `font-serif` y `stone-*` en `/cuenta` (pendiente de 2026-09-23) | `font-display` y tokens | S |
| 28 | «€ 0 /mes» en `/profesionales` | «0 €/mes» (`Intl` es-ES) | S |
| 29 | `components.json` dice `style: "radix-nova"` y la memoria de marca dice «new-york» | Alinear la documentación con el estilo real | S |
| 30 | El slot de las 09:00 se veía seleccionable a las 09:14 | Comprobar que el servidor filtra los huecos con menos de 30 min y que manda la hora del servidor, no la del cliente | S (verificar) |

### 3.bis Cómo comunicar las reservas a menos de 2 h y a más de 2 h

**Principio:** el usuario no elige una «tarifa». La condición **se deriva de la hora elegida**, se comunica donde se decide y con la hora concreta, no con una regla abstracta.

**Vocabulario único en los 4 idiomas:**
- **«Última hora»**: empieza en menos de 2 h. Se paga ahora y no admite cancelación.
- **«Con margen»**: empieza en 2 h o más. Cancelación gratuita hasta *[hora exacta]*; en el futuro, también «pagar en el local».

**Dónde se comunica:**
1. **SlotPicker**: los huecos de hoy se agrupan en «En las próximas 2 h» y «Más tarde». La primera sección lleva una línea neutra con icono de rayo: «Pago al reservar · sin cancelación». **Sin rojo ni ámbar de alerta**: es una condición, no un peligro.
2. **Paso de resumen**: el bloque de política cambia según el slot.
   - Con margen: «Cancela gratis hasta **hoy a las 16:15**. Después, el importe no se devuelve.»
   - Última hora: «Esta reserva empieza en menos de 2 h: **no admite cancelación ni reembolso**. Si el centro no puede atenderte, te devolvemos el 100 % automáticamente.» La última frase es la que genera confianza: el riesgo no recae solo en el cliente.
3. **Antes del botón de pago (solo en última hora)**: un checkbox **sin marcar** («Entiendo que esta reserva no es reembolsable») o, más ligero, la misma frase encima de «Pagar 55 €». Nunca escondido tras un enlace.
4. **Si cruza el umbral mientras paga**: si eligió «con margen» y, al pagar, ya faltan menos de 2 h, avisar antes de cobrar: «Tu hueco ahora empieza en menos de 2 h y pasa a ser no reembolsable. ¿Continuar?». Encaja con la comprobación de retención pendiente en `TODO.md`.
5. **Card y ficha**: el badge «En 46 min» basta; la leyenda del filtro explica «Reservas de última hora: pago al momento».
6. **Landing y `/entrar`**: sustituir «Sin compromiso: cancela hasta 2 horas antes» por «**Reglas claras** — Cancela gratis hasta 2 h antes. Para última hora, pago seguro al momento y reembolso total si el centro falla.»
7. **Pago en el local (futuro)**: solo en reservas con margen, con dos opciones del mismo peso visual. Que la opción online no parezca la «buena» (sería un patrón oscuro). Si se pide tarjeta como garantía contra el no-show, decirlo en la propia opción («Guardamos tu tarjeta solo si no te presentas: X €»).
8. **Confirmación y «Mis reservas»**: repetir la condición con la hora concreta («Cancelación gratuita hasta las 16:15» o «No reembolsable»). En las de última hora, el botón «Cancelar» desactivado y con la explicación, como ya se hace con el bloqueo de 2 h.

**Nota legal (condiciona el diseño, no es de diseño):** el art. 16(l) de la Directiva 2011/83/UE exceptúa del desistimiento los servicios de esparcimiento con fecha fija. **Hay que validar con un abogado** si peluquería y estética entran en esa excepción en España. Lo que sí es seguro: el art. 6(1)(k) obliga a informar **antes del pago** de que no hay derecho de desistimiento, así que el punto 2 o el 3 es obligatorio.

---

## 4. Lo que **no** conviene seguir de las tendencias

| Tendencia | Veredicto | Por qué |
|---|---|---|
| Vidrio translúcido (Liquid Glass) / glassmorphism | **Moda — no** | Críticas documentadas de contraste (hasta 1,5:1 en algunas pantallas) y ya vamos justos. El `backdrop-blur` cuesta rendimiento en móviles de gama media. Como mucho en la bottom nav, con fondo ≥ 85 % opaco. |
| Interfaz conversacional o «asistente con IA» para buscar | **No en 2026–27** | VISION descarta IA externa en el MVP, y un chat añade toques frente a la promesa de 3. Lo que sí aguanta es el sistema de diseño como fuente de verdad para *generar* UI con IA, y eso exige antes las primitivas del #16. |
| Gamificación, rachas, niveles | **No** | Es un antiprincipio explícito (VISION §8). |
| Prueba social en tiempo real («Marta acaba de reservar») | **No** | VISION §8 (privacidad). El «Lo más reservado esta semana» fijo va por ese camino: o datos reales o se quita. |
| Animación pesada y transiciones de página largas | **Moda — dosificar** | Lo duradero es el movimiento funcional (< 300 ms, respetando reduce-motion). Las View Transitions card → ficha merecen la pena por continuidad, pero después de arreglar el #25. |
| Bento grids y degradados pastel arcoíris | **Moda — contener** | Las cards de categoría en oscuro ya se alejan de los tonos tierra. Lo duradero es una paleta contenida con un acento. |
| Tipografía display gigante en todas partes | **Moda** | La serif ya da el aire premium; más escala resta densidad en la búsqueda, que es donde se decide. |
| Tokens, accesibilidad como requisito, modo oscuro propio, rendimiento percibido, transparencia de precio | **Duradero — invertir aquí** | Lo exigen la regulación (EAA, precio total) y el negocio. |

---

## 5. Estado de los pendientes de auditorías anteriores

| Informe | Pendiente | Hoy |
|---|---|---|
| audit-05-27 §B.2 | `--muted-foreground` 0.50 | **Resuelto** (0.42, 8,3:1) |
| audit-05-27 §A.2 | Altura fija arriba en `/buscar`, `top-[124px]` | **Pendiente** (#11) |
| audit-05-27 §D | `next/image` en ProviderCard | **Resuelto** |
| audit-05-27 §B.6 | Objetivos táctiles de chips y galería | Chips de 38 px: cumplen 2.5.8 pero no la recomendación de 44 px (#17) |
| pantallas-09-23 P0 #1 | Comisiones publicadas distintas de las cobradas | **Resuelto** (12/10/8/6 %) |
| pantallas-09-23 P0 #2 | CTA «Reservar (próximamente)» | **Resuelto** |
| pantallas-09-23 | Mapa blanco en modo oscuro | **Resuelto** |
| pantallas-09-23 | `[locale]/error.tsx` y `loading.tsx` | **Resuelto** en las rutas clave |
| pantallas-09-23 | Footer con 12 `href="#"` | **A medias**: enlaces retirados, falta el bloque legal (#5) |
| pantallas-09-23 | `font-serif` y `stone-*` en `/cuenta` | **Pendiente** (#27) |
| pantallas-09-23 | «0,0 · 0 valoraciones» | **Pendiente**, ahora también en la card pública (#3) |
| pantallas-09-23 | Fecha y hora redundantes | **Pendiente**, también en el paso 2 (#20) |
| pantallas-09-23 | Pestañas Cliente/Profesional inertes y «Recordarme» en `/entrar` | **Sin verificar** (siguen visibles) |
| pantallas-09-23 | `isPending` en `/buscar` e `isLoading` en el SlotPicker | **Sin verificar** en navegador |

---

## 6. Fuentes

- [UXPin — UI/UX Design Trends 2026](https://uxpin.com/studio/blog/ui-ux-design-trends/) (fabricante de herramientas: leer con cautela)
- [Lyssna — UX design trends (dic. 2025, encuesta a diseñadores)](https://www.lyssna.com/blog/ux-design-trends/)
- [Appetiser — Innovative UX design trends 2026](https://appetiser.com.au/blog/innovative-ux-design-trends/)
- [Android Authority — Material 3 Expressive vs Liquid Glass](https://androidauthority.com/android-16-material-3-expressive-vs-ios-26-liquid-glass-3565853)
- [UX Collective — Liquid Glass is beautiful, but is the chemistry missing?](https://uxdesign.cc/liquid-glass-is-beautiful-but-is-the-chemistry-missing-00b4f79ff529)
- [Mantlr — Liquid Glass vs Material Expressive](https://mantlr.com/blog/liquid-glass-vs-material-expressive)
- [Practical Ecommerce — New EU Accessibility Act impacts global merchants](https://www.practicalecommerce.com/new-e-u-accessibility-act-impacts-global-merchants)
- [TestParty — European Accessibility Act guide](https://testparty.ai/blog/european-accessibility-act-guide)
- [Silktide — The EU private sector is getting accessibility legislation](https://silktide.com/blog/the-eu-private-sector-is-finally-getting-some-accessibility-legislation/)
- [GOV.UK — Online hotel booking principles for businesses](https://gov.uk/government/publications/online-hotel-booking-principles-for-businesses)
- [Alberta — Tourism price transparency](https://www.alberta.ca/tourism-price-transparency)
- [Directiva 2011/83/UE, art. 16](https://www.legislation.gov.uk/eudr/2011/83/article/16)
- [CJEU C-96/21 — excepción de ocio para intermediarios](https://www.cde.ual.es/en/can-a-ticket-seller-refuse-to-refund-cancellation-fees-2)
- [Letslaw — Leisure as an exception to the right of withdrawal](https://letslaw.es/en/leisure-as-an-exception-to-the-right-of-withdrawal/)

*Nota: no se pudo confirmar si el EAA exige WCAG 2.2 o 2.1 (las fuentes citan 2.1 AA y la norma EN 301 549). Se usa 2.2 AA como objetivo porque incluye a 2.1.*
