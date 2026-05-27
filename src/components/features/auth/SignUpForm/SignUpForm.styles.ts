/**
 * Estilos del componente SignUpForm.
 *
 * Mobile-first: el formulario ocupa todo el ancho disponible y en
 * desktop se centra en una card con un panel ilustrativo lateral.
 *
 * Tokens semánticos exclusivamente: `bg-background`, `bg-card`,
 * `text-foreground`, `text-muted-foreground`, `border-border`,
 * `bg-primary`, `text-primary-foreground`, etc. Para los acentos
 * decorativos del panel lateral usamos los tokens de marca
 * (`brand-peach-soft`, `brand-lilac-soft`...) que están definidos
 * tanto en modo claro como oscuro en `globals.css`. Sin clases
 * Tailwind con colores hardcoded.
 *
 * Decisión de gradiente: usamos peach + lilac (distinto al pairing de
 * /entrar, que A1 podrá elegir libremente) para diferenciar
 * visualmente las dos pantallas de auth sin salir de la paleta brand.
 */
export const signUpFormStyles = {
  // Wrapper a viewport completo con padding generoso en desktop.
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

  // Tabs (cliente / proveedor).
  tabsList: 'grid w-full grid-cols-2 gap-1',

  // Bloque del formulario propiamente dicho.
  form: 'flex flex-col gap-4',
  fieldGrid: 'grid grid-cols-1 gap-4 sm:grid-cols-2',
  field: 'flex flex-col gap-1.5',
  label: 'text-sm font-medium text-foreground',
  input:
    'h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20',
  errorText: 'text-xs font-medium text-destructive',

  // Checkbox de términos: input nativo + label flex.
  termsRow: 'mt-1 flex items-start gap-3',
  termsBox:
    'mt-0.5 size-4 shrink-0 cursor-pointer rounded-sm border border-border bg-background text-primary accent-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
  termsLabel: 'text-xs leading-relaxed text-muted-foreground',
  termsLink: 'font-medium text-foreground underline-offset-2 hover:underline',

  // Nota informativa para el rol proveedor.
  providerNotice:
    'rounded-2xl border border-dashed border-border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground',

  // CTA principal.
  submit:
    'inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60',

  // Divisor "o regístrate con".
  divider: 'relative flex items-center gap-3 py-1 text-xs text-muted-foreground',
  dividerLine: 'h-px flex-1 bg-border',

  // Botones sociales deshabilitados.
  socialRow: 'grid grid-cols-1 gap-2 sm:grid-cols-2',
  socialButton:
    'inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60',

  // Footer del form.
  footerNote: 'text-center text-sm text-muted-foreground',
  footerLink: 'font-medium text-foreground underline-offset-2 hover:underline',

  // Columna ilustrativa (solo desktop). En light: gradient pastel claro
  // peach→lilac brillante (los `*-soft` son L0.95). En dark los `*-soft`
  // son tintes oscuros y el gradient queda apagado y muddy; por eso en
  // dark sustituimos por los `*` (pastels claros L0.88) al 18% para
  // tintar el fondo sin quemar la vista.
  illustration:
    'relative hidden flex-col justify-between gap-8 overflow-hidden bg-gradient-to-br from-brand-peach-soft to-brand-lilac-soft dark:from-brand-peach/[0.18] dark:to-brand-lilac/[0.18] p-10 md:flex',
  illustrationBadge:
    'inline-flex w-fit items-center gap-2 rounded-full bg-card/70 px-3 py-1 text-xs font-medium text-foreground backdrop-blur',
  illustrationTitle:
    'font-display text-4xl leading-[1.05] text-foreground drop-shadow-[0_1px_0_var(--card)]',
  illustrationSubtitle: 'max-w-xs text-sm leading-relaxed text-foreground/80',
  illustrationFooter: 'text-xs text-foreground/70',

  // Decoraciones suaves (círculos). En light los `*-soft` claros con
  // blur dan halos pastel; en dark los `*-soft` son oscuros y los blobs
  // desaparecen — por eso en dark usamos los `*` (pastels claros) con
  // baja opacidad para que sigan luciendo como auras de color.
  illustrationBlob1:
    'pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-brand-rose-soft opacity-70 blur-2xl dark:bg-brand-rose dark:opacity-20',
  illustrationBlob2:
    'pointer-events-none absolute -bottom-16 -left-10 size-56 rounded-full bg-brand-butter-soft opacity-60 blur-2xl dark:bg-brand-butter dark:opacity-15',
} as const;
