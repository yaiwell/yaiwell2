/**
 * Estilos del componente SignInForm.
 *
 * Reglas clave:
 *  - Sólo tokens semánticos (`bg-card`, `text-foreground`, `border-border`,
 *    etc.) y tokens de marca pastel (`brand-rose-soft`, `brand-peach-soft`,
 *    `brand-sky-soft`). Nada de `bg-white`, `text-stone-900` ni similares,
 *    para que el dark mode funcione sin sobreescribir clases.
 *  - Mobile-first: en mobile el formulario ocupa toda la pantalla; en
 *    desktop se centra en una card con max-w-md y, a su izquierda, un
 *    panel ilustrativo con gradiente editorial de los pasteles de marca.
 */
export const signInStyles = {
  // Layout exterior: ocupa al menos la altura útil tras header/mobilenav.
  root: 'flex min-h-[calc(100vh-8rem)] w-full items-stretch bg-background md:min-h-[calc(100vh-4rem)]',

  // Grid de dos columnas en desktop; una sola en mobile.
  grid: 'mx-auto grid w-full max-w-6xl grid-cols-1 lg:grid-cols-[1.05fr_1fr]',

  // Panel ilustrativo (solo desktop). En light, gradient pastel claro
  // brillante (los soft son L0.94-0.95). En dark los `*-soft` son tintes
  // oscuros muy parecidos al card y el gradient queda apagado;
  // overrideamos a los `*` (pastels claros L0.85) al 18% para mantener
  // el carácter alegre sin quemar la vista sobre fondo oscuro.
  aside:
    'relative hidden overflow-hidden bg-gradient-to-br from-brand-rose-soft via-brand-peach-soft to-brand-sky-soft dark:from-brand-rose/[0.18] dark:via-brand-peach/[0.18] dark:to-brand-sky/[0.18] p-12 lg:flex lg:flex-col lg:justify-between',
  asideBadge:
    'inline-flex w-fit items-center gap-2 rounded-full bg-background/70 px-3 py-1 text-xs font-medium uppercase tracking-wider text-foreground/80 backdrop-blur',
  asideTitle:
    'mt-8 max-w-md text-balance font-display text-4xl leading-tight font-medium tracking-tight text-foreground xl:text-5xl',
  asideSubtitle: 'mt-4 max-w-md text-balance text-base text-muted-foreground',
  asideFooter: 'mt-auto flex flex-col gap-2 text-sm text-muted-foreground',
  asideFooterRow: 'flex items-center gap-2',

  // Columna del formulario.
  formColumn: 'flex flex-col items-center justify-center px-6 py-12 md:px-10 md:py-16',
  formCard:
    'w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-sm md:p-8',

  // Encabezado del card.
  header: 'flex flex-col gap-2 text-left',
  title: 'font-display text-3xl font-medium tracking-tight text-foreground md:text-4xl',
  subtitle: 'text-sm text-muted-foreground md:text-base',

  // Tabs cliente/proveedor.
  tabsWrap: 'mt-6',

  // Form.
  form: 'mt-6 flex flex-col gap-4',
  field: 'flex flex-col gap-1.5',
  label: 'text-sm font-medium text-foreground',
  input:
    'h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground placeholder:text-muted-foreground/70 transition-colors focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20',
  errorText: 'text-xs font-medium text-destructive',

  // Fila "recordarme" + "olvidé contraseña".
  rowBetween: 'flex items-center justify-between gap-3',
  checkboxWrap: 'flex items-center gap-2 text-sm text-foreground',
  checkbox:
    'size-4 rounded border-border bg-background text-primary focus:outline-none focus:ring-2 focus:ring-ring/40',
  forgotLink: 'text-sm font-medium text-primary underline-offset-4 hover:underline',

  // Botón submit principal (token primary, funciona en ambos modos).
  submit:
    'mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60',
  submitSpinner: 'size-4 animate-spin',

  // Divider "o continúa con".
  divider: 'my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground',
  dividerLine: 'h-px flex-1 bg-border',

  // Botones sociales (deshabilitados).
  socialRow: 'grid grid-cols-1 gap-2 sm:grid-cols-2',
  socialButton:
    'inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60',
  socialBadge: 'ml-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground',

  // Footer del card: link a registro.
  footer: 'mt-6 text-center text-sm text-muted-foreground',
  footerLink: 'font-medium text-primary underline-offset-4 hover:underline',
} as const;
