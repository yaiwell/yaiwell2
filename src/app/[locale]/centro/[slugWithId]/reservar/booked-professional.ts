import 'server-only';

import { getBookedProfessional } from '@/lib/services/providers';

/**
 * Profesional que quedó en una reserva recién creada, para que la
 * confirmación diga «quién te atenderá» (CLAUDE.md §4.bis «Equipo»).
 *
 * Si el cliente eligió profesional, el servidor ya lo validó contra el
 * servicio y es ese: no hace falta leer. Con «cualquiera disponible» lo
 * asignó `createBooking` dentro de la transacción y se lee de la reserva.
 *
 * No es un módulo `'use server'` (sus exportaciones serían endpoints): lo
 * importan las acciones de checkout y de pago en el local. Un fallo aquí
 * no debe tumbar una reserva ya creada: devuelve `null` y la
 * confirmación omite la fila.
 *
 * @param bookingId — reserva recién creada.
 * @param clientUserId — `User.id` del cliente (comprobación de titularidad).
 * @param chosenProfessionalId — profesional que eligió el cliente, si lo hizo.
 */
export async function resolveBookedProfessionalId(
  bookingId: string,
  clientUserId: string,
  chosenProfessionalId: string | undefined,
): Promise<string | null> {
  if (chosenProfessionalId) return chosenProfessionalId;
  try {
    const professional = await getBookedProfessional(bookingId, clientUserId);
    return professional?.id ?? null;
  } catch (error) {
    console.error('[reservar] could not read the assigned professional:', error);
    return null;
  }
}
