import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright';
import type { Page } from '@playwright/test';

/**
 * Inicia sesión con un usuario de Clerk DEV (`+clerk_test`) reintentando.
 *
 * `clerk.signIn` espera sin límite a que cargue Clerk JS; con varios workers
 * y la red a Clerk intermitente se cuelga hasta agotar el timeout del test.
 * Aquí cada intento tiene su propio límite y se recarga la página de entrada
 * antes de reintentar.
 */
export async function signInAs(page: Page, emailAddress: string, attempts = 3): Promise<void> {
  await setupClerkTestingToken({ page });
  for (let i = 1; ; i++) {
    try {
      await page.goto('/es/entrar', { waitUntil: 'domcontentloaded' });
      let timer: NodeJS.Timeout | undefined;
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('signIn: Clerk no cargó a tiempo')), 45_000);
      });
      try {
        await Promise.race([clerk.signIn({ page, emailAddress }), timeout]);
      } finally {
        clearTimeout(timer);
      }
      return;
    } catch (error) {
      if (i >= attempts) throw error;
    }
  }
}
