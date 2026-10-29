import { legalDocumentStyles as s } from './LegalDocument.styles';
import type { LegalDocumentProps } from './LegalDocument.types';

/**
 * Documento legal (privacidad, y más adelante términos y cookies).
 * Server Component puramente presentacional: recibe el texto ya traducido.
 */
export function LegalDocument({ document }: LegalDocumentProps) {
  return (
    <article className={s.root} data-component="legal-document">
      <div className={s.container}>
        <header className={s.header}>
          <h1 className={s.title}>{document.title}</h1>
          <p className={s.updated}>{document.updated}</p>
          <p className={s.intro}>{document.intro}</p>
        </header>
        {document.sections.map((section) => (
          <section key={section.heading} className={s.section}>
            <h2 className={s.heading}>{section.heading}</h2>
            {section.items.length > 0 && (
              <ul className={s.list}>
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className={s.paragraph}>
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}
