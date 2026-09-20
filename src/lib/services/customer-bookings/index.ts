/**
 * API pública del módulo `customer-bookings`.
 *
 * `getCustomerBookings` toca Prisma y arrastra `server-only`, así que
 * solo puede importarse desde Server Components o server actions. Los
 * componentes de UI importan de aquí **únicamente el tipo** (con
 * `import type`, que TypeScript borra al compilar y por tanto no mete
 * el cliente de Postgres en el bundle).
 */

export { getCustomerBookings } from './customer-bookings.service';
export type { BookingStatus, CustomerBookingView } from './customer-bookings.types';
