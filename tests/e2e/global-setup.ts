import { clerkSetup } from '@clerk/testing/playwright';
import dotenv from 'dotenv';
import path from 'node:path';

/**
 * Setup global de Playwright.
 *
 * 1. Carga `.env.local` para que los tests E2E vean las claves de Clerk,
 *    Supabase y demás. Por defecto Playwright NO lee `.env.local`.
 * 2. Llama a `clerkSetup()` para obtener el testing token desde la
 *    Clerk Backend API. Sin esto los `clerk.signIn` programáticos
 *    quedarían bloqueados por el bot-protection captcha del frontend.
 */
export default async function globalSetup(): Promise<void> {
  // El runner de Playwright se ejecuta desde la raíz del repo.
  dotenv.config({ path: path.join(process.cwd(), '.env.local') });

  await clerkSetup();
}
