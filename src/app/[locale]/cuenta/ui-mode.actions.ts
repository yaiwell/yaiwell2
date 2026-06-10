'use server';

import { auth, currentUser } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

import { redirect } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { getRoleFromSessionClaims, getRoleFromUser } from '@/lib/auth/role';
import { writeUiModeCookie, type UiMode } from '@/lib/auth/ui-mode';

/**
 * Server Action que cambia el modo de UI del usuario actual.
 *
 * Reglas:
 *  - El usuario debe estar autenticado.
 *  - Sólo el rol real `provider` puede alternar. Para un cliente puro,
 *    poner `provider` no tendría sentido (no hay panel real al que ir),
 *    así que rechazamos silenciosamente con un redirect a /cuenta.
 *  - Tras escribir la cookie, redirigimos al destino natural del modo
 *    elegido: `/panel` si pasa a proveedor, `/` si pasa a cliente.
 *    Invalidar el cache de layout es necesario para que el shell global
 *    (MobileNav/Header) vuelva a leer la cookie en su próximo render.
 *
 * @param formData — debe contener `mode` (`client` | `provider`) y
 *   `locale` (para construir el destino con next-intl).
 */
export async function switchUiModeAction(formData: FormData): Promise<void> {
  const rawMode = formData.get('mode');
  const rawLocale = formData.get('locale');
  if (rawMode !== 'client' && rawMode !== 'provider') {
    throw new Error('Invalid mode');
  }
  const mode: UiMode = rawMode;
  const locale = (rawLocale ?? 'es') as AppLocale;

  const { userId, sessionClaims } = await auth();
  if (!userId) {
    redirect({ href: '/entrar', locale });
    return;
  }

  // Resolución de rol: claims primero (sin fetch), fallback a currentUser.
  let role = getRoleFromSessionClaims(
    sessionClaims as unknown as Parameters<typeof getRoleFromSessionClaims>[0],
  );
  if (!role) {
    const user = await currentUser();
    role = getRoleFromUser(user);
  }

  // Solo un provider real puede solicitar el modo provider. Cliente o
  // admin que intenten activarlo se quedan en client sin error visible.
  const effective: UiMode = mode === 'provider' && role !== 'provider' ? 'client' : mode;
  await writeUiModeCookie(effective);

  // Invalida el layout para refrescar el shell (MobileNav, Header,
  // /cuenta). El redirect ya forzaría re-render, pero la invalidación
  // ayuda cuando el destino comparte segmento con el origen.
  revalidatePath('/', 'layout');

  // Destino natural del modo recién activado.
  const target = effective === 'provider' ? '/panel' : '/';
  redirect({ href: target, locale });
}
