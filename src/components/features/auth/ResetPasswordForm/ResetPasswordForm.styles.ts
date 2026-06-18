/**
 * Estilos del componente ResetPasswordForm.
 *
 * Reutiliza el lenguaje visual de SignInForm/SignUpForm: misma card
 * blanca con borde sutil, gradient pastel decorativo en desktop y
 * tokens semánticos exclusivamente (`bg-card`, `text-foreground`,
 * etc.) para que el dark mode funcione sin overrides.
 *
 * Diferenciamos esta pantalla de las otras dos de auth usando el
 * pairing `brand-sky-soft` → `brand-butter-soft`, que no coincide
 * con el de `/entrar` (rose/peach/sky) ni con el de `/registro`
 * (peach/lilac). Mantiene el carácter editorial sin repetir paleta.
 */
export const resetPasswordStyles = {
  // Wrapper a viewport completo con el mismo padding que SignUp.
  root: 'flex min-h-[calc(100vh-4rem)] w-full items-stretch justify-center bg-background px-4 py-8 md:px-8 md:py-12',

  // Card principal: en mobile ocupa todo el ancho, en desktop se
  // divide en dos columnas (form + panel ilustrativo).
  shell:
    'grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-3xl border border-border bg-card shadow-xl shadow-black/5 md:grid-cols-[1.05fr_1fr]',

  // Columna del formulario.
  formColumn: 'flex flex-col gap-6 p-6 sm:p-10',

  // Cabecera editorial.
  header: 'flex flex-col gap-2',
  eyebrow: 'text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground',
  title: 'font-display text-3xl leading-tight text-foreground md:text-4xl',
  subtitle: 'max-w-md text-sm leading-relaxed text-muted-foreground',

  // Bloque del formulario propiamente dicho.
  form: 'flex flex-col gap-4',
  fieldGrid: 'grid grid-cols-1 gap-4 sm:grid-cols-2',
  field: 'flex flex-col gap-1.5',
  label: 'text-sm font-medium text-foreground',
  input:
    'h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20',
  errorText: 'text-xs font-medium text-destructive',

  // CTA principal.
  submit:
    'inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60',

  // Secundario (volver a la fase de email o ir a sign-in).
  secondary:
    'inline-flex h-10 w-full items-center justify-center rounded-xl text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',

  // Footer del form: link a sign-in/registro.
  footerNote: 'text-center text-sm text-muted-foreground',
  footerLink: 'font-medium text-foreground underline-offset-2 hover:underline',

  // Banner de error global (rate limit, red, código sin anclar).
  rootError:
    'rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-xs font-medium text-destructive',

  // Banner de éxito post-reset antes del redirect (visible ~1s).
  successNote:
    'rounded-xl border border-emerald-300/40 bg-emerald-50/80 px-3.5 py-2.5 text-xs font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',

  // Input específico del código OTP: monoespaciado y tracking ancho
  // para que los 6 dígitos respiren como en SignUpForm.
  codeInput:
    'h-12 w-full rounded-xl border border-border bg-background px-3.5 text-center text-lg font-semibold tracking-[0.4em] text-foreground transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',

  // Columna ilustrativa (solo desktop). En light: gradient pastel
  // claro sky→butter brillante. En dark: tintes oscuros de los mismos
  // tokens al 18% para tintar el fondo sin quemar la vista.
  illustration:
    'relative hidden flex-col justify-between gap-8 overflow-hidden bg-gradient-to-br from-brand-sky-soft to-brand-butter-soft dark:from-brand-sky/[0.18] dark:to-brand-butter/[0.18] p-10 md:flex',
  illustrationBadge:
    'inline-flex w-fit items-center gap-2 rounded-full bg-card/70 px-3 py-1 text-xs font-medium text-foreground backdrop-blur',
  illustrationTitle:
    'font-display text-4xl leading-[1.05] text-foreground drop-shadow-[0_1px_0_var(--card)]',
  illustrationSubtitle: 'max-w-xs text-sm leading-relaxed text-foreground/80',
  illustrationFooter: 'text-xs text-foreground/70',

  // Decoraciones suaves (blobs) coherentes con SignUpForm.
  illustrationBlob1:
    'pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-brand-rose-soft opacity-70 blur-2xl dark:bg-brand-rose dark:opacity-20',
  illustrationBlob2:
    'pointer-events-none absolute -bottom-16 -left-10 size-56 rounded-full bg-brand-butter-soft opacity-60 blur-2xl dark:bg-brand-butter dark:opacity-15',
} as const;
