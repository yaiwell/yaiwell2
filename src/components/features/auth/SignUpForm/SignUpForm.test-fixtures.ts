/**
 * Mensajes i18n compartidos por los tests del SignUpForm.
 *
 * Los declaramos inline (patrón `ServiceDeleteButton.test.tsx`) en vez
 * de cargar `src/messages/es.json` para que un test no dependa de copy
 * de producción. Viven en su propio archivo porque los consumen dos
 * suites: la del formulario y la de preselección desde la URL.
 */

export const signUpMessages = {
  signUp: {
    eyebrow: 'Crea tu cuenta',
    title: 'Da el primer paso',
    subtitle: 'Reserva en segundos.',
    tabs: { client: 'Soy cliente', provider: 'Soy profesional' },
    fields: {
      fullName: 'Nombre',
      contactName: 'Nombre del responsable',
      businessName: 'Nombre del centro',
      email: 'Email',
      password: 'Contraseña',
      passwordRepeat: 'Repite la contraseña',
    },
    verificationNotice: 'Verificaremos tus datos antes de publicarte.',
    termsLabel: 'Acepto los <terms>términos</terms> y la <privacy>privacidad</privacy>.',
    cta: { submit: 'Crear cuenta', submitting: 'Creando…' },
    socialDivider: 'o regístrate con',
    social: { google: 'Google', apple: 'Apple' },
    haveAccount: '¿Ya tienes cuenta? <link>Entra</link>',
    illustration: {
      badge: 'Yaiwell',
      title: 'Belleza para hoy',
      subtitle: 'Profesionales cerca de ti.',
      footer: '© Yaiwell',
    },
    verification: {
      eyebrow: 'Verificación',
      title: 'Confirma tu email',
      subtitle: 'Te hemos enviado un código a {email}.',
      codeLabel: 'Código de 6 dígitos',
      submit: 'Confirmar',
      submitting: 'Confirmando…',
      back: 'Volver y cambiar el email',
    },
    errors: {
      required: 'Campo obligatorio.',
      fullNameMin: 'Mínimo 2 caracteres.',
      businessNameMin: 'Mínimo 2 caracteres.',
      emailInvalid: 'Email no válido.',
      passwordShort: 'Mínimo 8 caracteres.',
      passwordMismatch: 'Las contraseñas no coinciden.',
      termsRequired: 'Debes aceptar los términos.',
      emailAlreadyExists: 'Ese email ya tiene cuenta.',
      passwordCompromised: 'Esa contraseña es insegura.',
      verificationCodeInvalid: 'Código incorrecto.',
      verificationCodeExpired: 'El código ha expirado.',
      invalidCredentials: 'Credenciales inválidas.',
      tooManyAttempts: 'Demasiados intentos.',
      sessionExists: 'Ya hay una sesión activa.',
      networkError: 'No hemos podido conectar.',
      unknown: 'Algo no ha ido bien.',
    },
  },
};
