'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { useLocale } from 'next-intl';
import { useCallback, useState, useTransition } from 'react';

import { useRouter } from '@/i18n/navigation';
import { buildBecomeProviderHref, type BecomeProviderResult } from '@/lib/auth';
// Import directo, no al barrel `@/lib/validation`: arrastra Prisma al bundle cliente.
import { withRedirectUrl } from '@/lib/validation/redirect-url';

import type {
  BecomeProviderConfirmProps,
  BecomeProviderErrorCode,
} from './BecomeProviderConfirm.types';

/** Siguiente paso de la pantalla según el resultado de la server action. */
export type BecomeProviderNextStep =
  | { kind: 'navigate'; href: string; refreshSession: boolean }
  | { kind: 'error'; code: BecomeProviderErrorCode };

/**
 * Traduce el resultado de `becomeProviderAction` al siguiente paso de
 * la pantalla. Pura para poder probarla sin Clerk ni router.
 *
 * @param result — lo que devolvió la server action.
 * @param plan — plan con el que llegó el usuario, para no perderlo si
 *   tiene que volver a iniciar sesión.
 */
export function resolveBecomeProviderNextStep(
  result: BecomeProviderResult,
  plan: BecomeProviderConfirmProps['plan'],
): BecomeProviderNextStep {
  switch (result.status) {
    case 'converted':
    case 'already-provider':
      return { kind: 'navigate', href: '/onboarding', refreshSession: true };
    case 'unauthenticated':
      return {
        kind: 'navigate',
        href: withRedirectUrl('/entrar', buildBecomeProviderHref(plan)),
        refreshSession: false,
      };
    case 'forbidden':
      return { kind: 'error', code: 'forbidden' };
    default:
      return { kind: 'error', code: 'unknown' };
  }
}

/** Firma mínima de `getToken` de Clerk que necesitamos. */
type GetFreshToken = (options: { skipCache: true }) => Promise<string | null>;

/**
 * Pide a Clerk un token de sesión nuevo, con un reintento.
 *
 * El token viejo aún dice `client`; sin uno nuevo las APIs del wizard
 * responderían 403, así que el caller no navega si esto devuelve `false`.
 *
 * @returns `true` si Clerk entregó un token.
 */
export async function refreshSessionToken(getToken: GetFreshToken): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      if (await getToken({ skipCache: true })) return true;
    } catch {
      // Fallo de red o de Clerk: probamos una vez más.
    }
  }
  return false;
}

/**
 * Hook de la pantalla de conversión a profesional.
 *
 * Tras convertir la cuenta pide a Clerk un token nuevo (`skipCache`) y
 * recarga el usuario: el JWT de la sesión aún dice `client` hasta su
 * siguiente refresco, y las APIs del wizard leen el rol de los claims
 * cuando los traen. Solo entonces navega a `/onboarding`.
 */
export function useBecomeProviderConfirm({ plan, action }: BecomeProviderConfirmProps) {
  const locale = useLocale();
  const router = useRouter();
  const { getToken } = useAuth();
  const { user } = useUser();
  const [isPending, startTransition] = useTransition();
  const [errorCode, setErrorCode] = useState<BecomeProviderErrorCode | null>(null);

  const confirm = useCallback(() => {
    setErrorCode(null);
    startTransition(async () => {
      let result: BecomeProviderResult;
      try {
        result = await action(locale, plan);
      } catch {
        result = { status: 'error' };
      }

      const next = resolveBecomeProviderNextStep(result, plan);
      if (next.kind === 'error') {
        setErrorCode(next.code);
        return;
      }
      if (next.refreshSession) {
        // Sin token nuevo no navegamos a ciegas: el wizard fallaría con
        // 403. Avisamos y, al pulsar otra vez, la action devuelve
        // `already-provider` y se reintenta solo el refresco.
        const [refreshed] = await Promise.all([
          refreshSessionToken(getToken),
          user?.reload().catch(() => undefined),
        ]);
        if (!refreshed) {
          setErrorCode('sessionRefresh');
          return;
        }
      }
      router.replace(next.href);
    });
  }, [action, getToken, locale, plan, router, user]);

  return { confirm, isPending, errorCode };
}
