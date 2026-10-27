/**
 * Estilos del botón «Continuar con Google».
 *
 * Mismo lenguaje que los botones sociales de `/entrar` y `/registro`,
 * pero a todo el ancho: es la única opción social activa.
 */
export const googleAuthButtonStyles = {
  root: 'flex flex-col gap-2',
  button:
    'inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60',
  logo: 'size-4 shrink-0',
  spinner: 'size-4 animate-spin',
  error: 'text-sm text-destructive',
  note: 'text-xs text-muted-foreground',
} as const;
