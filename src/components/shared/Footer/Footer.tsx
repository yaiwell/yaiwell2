import { AtSign, Camera, Send, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { footerStyles as s } from './Footer.styles';
import type { FooterLinkGroup } from './Footer.types';

/**
 * Estructura estática de los grupos de enlaces del footer.
 *
 * Todos los `href` son placeholders por ahora; cuando exista la página
 * destino los iremos sustituyendo. Mantenerlos como datos (no como JSX
 * inline) nos permite mapearlos limpiamente y traducirlos por clave.
 */
const linkGroups: FooterLinkGroup[] = [
  {
    titleKey: 'product',
    links: [
      { href: '#', labelKey: 'howItWorks' },
      { href: '#', labelKey: 'categories' },
      { href: '#', labelKey: 'pricing' },
    ],
  },
  {
    titleKey: 'company',
    links: [
      { href: '#', labelKey: 'about' },
      { href: '#', labelKey: 'blog' },
      { href: '#', labelKey: 'careers' },
    ],
  },
  {
    titleKey: 'legal',
    links: [
      { href: '#', labelKey: 'terms' },
      { href: '#', labelKey: 'privacy' },
      { href: '#', labelKey: 'cookies' },
    ],
  },
];

/**
 * Footer global de la app.
 *
 * Estructura: bloque de marca + tagline + columnas de enlaces + barra
 * inferior con copyright y origen ("Hecho en Barcelona"). En mobile el
 * footer respeta el espacio del MobileNav con padding inferior extra.
 *
 * Nota sobre iconos de redes: lucide-react eliminó los iconos de marca
 * (Instagram, X, LinkedIn) por motivos de licencia. Usamos iconos genéricos
 * como representación visual neutra (Camera ≈ Instagram, AtSign ≈ X,
 * Send ≈ contacto) y dejamos los aria-labels descriptivos para
 * accesibilidad. Los enlaces reales se conectarán cuando existan cuentas.
 */
export function Footer() {
  const tFooter = useTranslations('footer');
  const tCommon = useTranslations('common');
  // Año dinámico calculado en render. Yeiwell se renderiza por locale en
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
              <a
                href="#"
                className={s.socialButton}
                aria-label="Instagram"
                data-component="footer-social-instagram"
              >
                <Camera className="size-4" />
              </a>
              <a
                href="#"
                className={s.socialButton}
                aria-label="X / Twitter"
                data-component="footer-social-twitter"
              >
                <AtSign className="size-4" />
              </a>
              <a
                href="#"
                className={s.socialButton}
                aria-label="Contacto"
                data-component="footer-social-contact"
              >
                <Send className="size-4" />
              </a>
            </div>
          </div>

          {/* Columnas de enlaces.
              Recorremos cada grupo con un switch por titleKey para que
              TypeScript pueda estrechar el tipo de `labelKey` y validar
              en compile-time la clave i18n combinada. */}
          {linkGroups.map((group) => (
            <div
              key={group.titleKey}
              className={s.group}
              data-component={`footer-col-${group.titleKey}`}
            >
              <h2 className={s.groupTitle}>{tFooter(`${group.titleKey}.title`)}</h2>
              <ul className={s.groupList}>
                {group.titleKey === 'product' &&
                  group.links.map((link) => (
                    <li key={`product-${link.labelKey}`}>
                      <a
                        href={link.href}
                        className={s.groupLink}
                        data-component={`footer-link-product-${link.labelKey}`}
                      >
                        {tFooter(`product.${link.labelKey}`)}
                      </a>
                    </li>
                  ))}
                {group.titleKey === 'company' &&
                  group.links.map((link) => (
                    <li key={`company-${link.labelKey}`}>
                      <a
                        href={link.href}
                        className={s.groupLink}
                        data-component={`footer-link-company-${link.labelKey}`}
                      >
                        {tFooter(`company.${link.labelKey}`)}
                      </a>
                    </li>
                  ))}
                {group.titleKey === 'legal' &&
                  group.links.map((link) => (
                    <li key={`legal-${link.labelKey}`}>
                      <a
                        href={link.href}
                        className={s.groupLink}
                        data-component={`footer-link-legal-${link.labelKey}`}
                      >
                        {tFooter(`legal.${link.labelKey}`)}
                      </a>
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
