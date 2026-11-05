# Reembolso por incidencia del centro

Procedimiento de soporte para devolver el dinero de una reserva cuando el centro no puede atender y ya no puede cancelarla por su cuenta. Se hace en `/admin/reembolsos`, en el bloque que hay bajo la cola.

## Cuándo usarlo

- El centro avisa de que no puede atender una reserva a menos de 2 h, o una de última hora (fuerza mayor, §4.bis de `CLAUDE.md`).
- La cita ya empezó o ya pasó y el servicio no se prestó bien, aunque el centro la marcara como finalizada.

**Cuándo no:**

- Si faltan 2 h o más, cancela el propio centro desde su panel.
- Si el problema es solo que el reembolso falló, usa «Reintentar» en la cola.
- Un no presentado pagado online no se devuelve (§4.bis), y este bloque no lo admite.

## Pasos

1. Copia el id de la reserva y pégalo en «Id de la reserva». Pulsa **Buscar**.
2. Comprueba negocio, servicio, fecha, importe y estado. Si no es elegible, la pantalla dice por qué (ver la tabla de abajo).
3. Escribe el motivo, de 10 a 500 caracteres, **sin datos personales**: se guarda en la reserva y en Stripe.
4. Pulsa **Cancelar y reembolsar**. No se puede deshacer.
5. Lee el resultado:
   - **Emitido**: Stripe ha aceptado el reembolso.
   - **Ya estaba devuelto**: Stripe indica que el pago ya se devolvió. No se emite otro.
   - **Ha fallado**: la reserva queda cancelada y el dinero **sin devolver**. Aparece en la cola de arriba: revisa el motivo y reintenta desde allí.
   - **Sin completar**: la reserva queda cancelada, el dinero sin devolver y **tampoco se pudo grabar en la cola**. Sigue el apartado «Reembolso sin completar».
6. Mira también lo que dice sobre la franja:
   - **No se pudo bloquear**: pide al centro que la bloquee desde su calendario.
   - **Otra reserva la ocupa**: hay otra cita con ese profesional a esa hora. Revisa con el centro si puede atenderla.

## Por qué una reserva puede no ser elegible

| Mensaje | Qué hacer |
|---|---|
| Se paga en el local | Ver «Si el pago era en el local». |
| Sin pago en Stripe | Revisa el pago en el dashboard: no hay un cobro hecho que devolver. |
| Otro estado | Solo admite `confirmed` y `completed`. |
| Ya devuelto | Nada. |
| En la cola | Reintenta desde la cola de arriba. |
| Reembolso en curso | Se acaba de cancelar por incidencia. Vuelve a buscarla a los 5 minutos. |
| Reembolso parcial previo | Devuelve el resto desde el dashboard de Stripe, marcando revertir transferencia y reembolsar comisión. Avisa tú al cliente y al centro: por esa vía no salen estos correos, la reserva no se marca como incidencia y **la franja no se bloquea**, así que pide al centro que la bloquee. |
| Contracargo | El dinero lo resuelve la disputa. Revísala en el dashboard antes de hacer nada. |
| Stripe no responde | No se ha tocado nada. Vuelve a buscarla en unos minutos. |

Cada búsqueda y cada confirmación comprueban el pago en Stripe, salvo que la reserva ya no sea elegible por lo que consta en la base de datos.

## Reembolso sin completar

Si el proceso se cae entre la cancelación y Stripe, o Stripe falla y el fallo no se puede grabar, la reserva queda cancelada por incidencia sin reembolso ni fallo registrados.

1. Pasados 5 minutos desde la cancelación aparece sola en la lista **Reembolsos sin completar** de `/admin/reembolsos`, sin pegar el id. El margen evita pisar una petición que siga en curso. También la encuentras buscándola.
2. Pulsa **Completar**. No pide motivo: usa el que se escribió al cancelar.

No puede devolver el dinero dos veces: usa la misma clave de idempotencia y, además, el reembolso es íntegro y Stripe rechaza un segundo sobre un cargo ya devuelto. También salen los avisos. Si el primero ya dijo «en trámite», el cliente y el centro reciben otro que cuenta que se ha devuelto. Un correo idéntico no se repite durante las 24 h en que Resend recuerda su clave; pasado ese plazo, puede llegar otra vez.

**Si el proceso se cortó tras devolver el dinero y antes de los correos**, la reserva ya no sale en la lista. Búscala: muestra «ya devuelto» y el botón **Reenviar los avisos**, que no mueve dinero ni vuelve a bloquear la franja. Lo mismo pasa si se repite la confirmación sobre una reserva marcada que ya consta devuelta.

## Qué pasa con la reserva

- `confirmed` o `completed` pasa a `cancelled` en el momento, y a `refunded` cuando Stripe confirma con `charge.refunded`.
- Si la cita aún no ha empezado, **la franja queda bloqueada** en la agenda de ese profesional para que nadie la reserve. El centro puede desbloquearla desde su calendario. El bloqueo es best effort: si falla, se avisa a Sentry, el reembolso sigue y la pantalla y el correo al centro lo cuentan.
- La hora no se puede liberar con descuento desde esa reserva, ni en el panel ni en el servidor. La oferta de origen, si la había, se retira.
- Una reseña ya publicada sigue contando. No se pueden crear reseñas nuevas sobre esa reserva.
- Avisos: si la cita estaba por venir, el cliente recibe la cancelación del centro con el estado de su dinero; si ya empezó o había finalizado, un aviso de devolución. El centro recibe un aviso de reembolso, «en trámite» si Stripe falló. El motivo no aparece en ningún correo.

## Dos peticiones a la vez

Al **cancelar**, solo una llega a Stripe: la escritura condicional frena a la otra, que responde que otra acción cambió la reserva o que el reembolso está en curso. Vuelve a buscarla para ver su estado.

Al **completar**, las dos pueden llegar a Stripe con la misma clave, y esa clave impide un segundo reembolso. Si Stripe responde que la otra sigue en curso, esta responde «reembolso en curso», sin grabar ningún fallo ni enviar correos.

Si la reserva ya consta devuelta, responde «ya estaba devuelto» y repite los avisos con las mismas claves.

## Transferencia y comisión

El reembolso es siempre íntegro, con `reverse_transfer` y `refund_application_fee`:

- **Cliente**: recupera el importe entero.
- **Transferencia**: se revierte, de modo que **el centro pierde su parte neta** (el importe menos la comisión). Por eso no conviene reembolsar a mano desde el dashboard, donde es fácil olvidarlo y lo acabaría pagando la plataforma.
- **Comisión**: Yaiwell devuelve también la suya. No cobra por esa reserva.

## Saldo negativo del centro

Si el centro ya cobró ese dinero en su banco, su saldo de Stripe puede quedar en negativo. Stripe lo compensa con sus próximos cobros. Si no tuviera ventas futuras, revisa el caso con el dev: en cuentas Express la plataforma responde ante Stripe del saldo negativo.

## Si el pago era en el local

No es elegible: no hubo cobro en la app y no hay nada que devolver desde aquí. El centro devuelve lo cobrado directamente al cliente. Si hay que corregir la reserva, una sanción o una comisión de esa reserva, escálalo al dev: este bloque no las toca.

## Auditoría

- **En la reserva**: `incidentRefundAt`, `incidentRefundBy` (`User.id` del admin) e `incidentRefundNote`. Se escriben al cancelar, también si Stripe falla después.
- **En Stripe**: la `metadata` del Refund lleva `reason` (`centre_incident`), `note` y `adminUserId`, también en un reintento desde la cola y al completar un reembolso a medias. `adminUserId` es siempre el admin que canceló.
- **En los logs**: reserva, admin, estado anterior y desenlace, sin el motivo.

**Eliminación de cuenta:** al eliminar la cuenta de la clientela se borran de sus reservas `incidentRefundNote` y `refundDismissReason`; `incidentRefundAt` e `incidentRefundBy` se conservan. **La copia del motivo en la `metadata` del Refund de Stripe no se borra sola.** Si la persona lo pide, bórrala a mano en el dashboard de Stripe. Una cuenta con un reembolso abierto, también a medias, no se puede eliminar por autoservicio.
