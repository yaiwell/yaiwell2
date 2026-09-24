import { Send, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';

import { footerStyles as s } from './Footer.styles';
import type { FooterLinkGroup } from './Footer.types';

/**
 * Dirección de contacto pública de Yaiwell. Es la misma que ofrece la
 * página 404 (`notFound.helpHint`), así que el usuario ve un único
 * canal en toda la app.
 */
const CONTACT_EMAIL = 'hola@yaiwell.com';

/**
 * Columnas de enlaces del footer.
 *
 * Todos los destinos son reales: un `href="#"` hace scroll al inicio y
 * el usuario interpreta que el click ha fallado, así que aquí no entra
 * nada que no exista todavía.
 *
 * Columnas retiradas a propósito el 2026-09-24 — reponerlas en cuanto
 * existan las páginas, con su clave i18n (que sigue en `messages/*.json`):
 *
 *  - **Empresa** (`about`, `blog`, `careers`): no hay ni "sobre
 *    nosotros", ni blog, ni página de empleo. Tres enlaces muertos
 *    valen menos que ninguna columna.
 *  - **Legal** (`terms`, `privacy`, `cookies`): decisión de producto
 *    del 2026-09-24. Los documentos no están redactados y prometer
 *    condiciones legales inexistentes es peor que no ofrecerlas.
 *    Producción va en modo test y sin clientes reales, así que no hay
 *    nadie a quien se le deban todavía. **Vuelven el día que se
 *    escriban** — si lees esto y el footer no tiene legales, es una
 *    decisión registrada, no un olvido.
 */
const linkGroups: FooterLinkGroup[] = [
  {
    titleKey: 'product',
    links: [
      // Ancla a la sección "Cómo funciona" de la landing.
      { href: '/#how-it-works', labelKey: 'howItWorks' },
      // Ancla a la rejilla de categorías populares de la landing.
      { href: '/#categories', labelKey: 'categories' },
      // La tabla de planes y comisiones vive en la landing comercial.
      { href: '/profesionales', labelKey: 'pricing' },
    ],
  },
];

/**
 * Footer global de la app.
 *
 * Estructura: bloque de marca + tagline + contacto + columnas de
 * enlaces + barra inferior con copyright y origen ("Hecho en
 * Barcelona"). En mobile el footer respeta el espacio del MobileNav con
 * padding inferior extra.
 *
 * Nota sobre el icono de contacto: lucide-react eliminó los iconos de
 * marca por motivos de licencia, así que usamos `Send` como
 * representación neutra del "escríbenos". Los botones de Instagram y X
 * se retiraron el 2026-09-24: no existen esas cuentas y apuntaban a
 * `#`. Se reponen cuando haya perfiles reales.
 */
export function Footer() {
  const tFooter = useTranslations('footer');
  const tCommon = useTranslations('common');
  // Año dinámico calculado en render. Yaiwell se renderiza por locale en
  // build time, pero como el contenido es estático no nos preocupa el SSG
  // momentáneo (cuando el año cambie un rebuild lo actualizará).
  const year = new Date().getFullYear();

  return (
    <footer className={s.root} data-component="footer">
      <div className={s.container}>
        <div className={s.top}>
          {/* Columna de marca. */}
          <div className={s.brandCol} data-component="footer-col-brand">
            <span className={s.brand} data-component="footer-brand">
              <span className={s.brandMark} aria-hidden="true">
                <Sparkles className="size-4" />
              </span>
              {tCommon('appName')}
            </span>
            <p className={s.tagline} data-component="footer-tagline">
              {tFooter('tagline')}
            </p>
            <div className={s.socials} data-component="footer-socials">
              {/* `<a>` nativo y no el `Link` de next-intl: `mailto:` no
                  pasa por el routing localizado. */}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className={s.socialButton}
                aria-label={tFooter('contact')}
                data-component="footer-social-contact"
              >
                <Send className="size-4" />
              </a>
            </div>
          </div>

          {/* Columnas de enlaces. */}
          {linkGroups.map((group) => (
            <div
              key={group.titleKey}
              className={s.group}
              data-component={`footer-col-${group.titleKey}`}
            >
              <h2 className={s.groupTitle}>{tFooter(`${group.titleKey}.title`)}</h2>
              <ul className={s.groupList}>
                {group.links.map((link) => (
                  <li key={`${group.titleKey}-${link.labelKey}`}>
                    <Link
                      href={link.href}
                      className={s.groupLink}
                      data-component={`footer-link-${group.titleKey}-${link.labelKey}`}
                    >
                      {tFooter(`${group.titleKey}.${link.labelKey}`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className={s.bottom} data-component="footer-bottom">
          <span data-component="footer-copyright">{tFooter('copyright', { year })}</span>
          <span data-component="footer-made-in">{tFooter('madeIn', { city: 'Barcelona' })}</span>
        </div>
      </div>
    </footer>
  );
}
