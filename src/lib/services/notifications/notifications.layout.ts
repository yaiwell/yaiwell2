import type { AppLocale } from '@/i18n/routing';

import type { EmailContent } from './notifications.types';

/**
 * Escapa texto para HTML. Todo lo que entra en la plantilla (nombres de
 * centro, notas del cliente, motivos de rechazo) lo escribe un usuario.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Estilos en línea: los clientes de correo ignoran las hojas de estilo.
// Paleta cálida de la marca (stone) con buen contraste en fondo claro.
const STYLE = {
  body: 'margin:0;padding:0;background:#f5f5f4;',
  wrapper: 'width:100%;background:#f5f5f4;padding:24px 12px;',
  card: 'max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px 28px;font-family:Helvetica,Arial,sans-serif;color:#1c1917;',
  brand: 'margin:0 0 24px;font-size:20px;font-weight:700;letter-spacing:0.5px;color:#1c1917;',
  heading: 'margin:0 0 16px;font-size:22px;line-height:1.3;color:#1c1917;',
  text: 'margin:0 0 14px;font-size:15px;line-height:1.6;color:#44403c;',
  label:
    'padding:6px 12px 6px 0;font-size:13px;color:#78716c;vertical-align:top;white-space:nowrap;',
  value: 'padding:6px 0;font-size:15px;color:#1c1917;',
  quote:
    'margin:0 0 14px;padding:12px 16px;border-left:3px solid #a8a29e;background:#fafaf9;font-size:15px;line-height:1.6;color:#1c1917;white-space:pre-line;',
  button:
    'display:inline-block;margin:8px 0 20px;padding:12px 24px;border-radius:999px;background:#1c1917;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;',
  footer: 'margin:24px 0 0;font-size:12px;line-height:1.5;color:#a8a29e;',
} as const;

/** Pinta el contenido como documento HTML listo para enviar. */
export function renderEmailHtml(content: EmailContent, lang: AppLocale): string {
  const paragraphs = content.paragraphs
    .map((p) => `<p style="${STYLE.text}">${escapeHtml(p)}</p>`)
    .join('');
  const details = content.details.length
    ? `<table role="presentation" style="margin:4px 0 20px;border-collapse:collapse;">${content.details
        .map(
          (d) =>
            `<tr><td style="${STYLE.label}">${escapeHtml(d.label)}</td><td style="${STYLE.value}">${escapeHtml(d.value)}</td></tr>`,
        )
        .join('')}</table>`
    : '';
  const quote = content.quote ? `<p style="${STYLE.quote}">${escapeHtml(content.quote)}</p>` : '';
  const outro = (content.outro ?? [])
    .map((p) => `<p style="${STYLE.text}">${escapeHtml(p)}</p>`)
    .join('');
  const cta = content.cta
    ? `<a href="${escapeHtml(content.cta.url)}" style="${STYLE.button}">${escapeHtml(content.cta.label)}</a>`
    : '';

  return `<!doctype html><html lang="${escapeHtml(lang)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(content.subject)}</title></head><body style="${STYLE.body}"><div style="${STYLE.wrapper}"><div style="${STYLE.card}"><p style="${STYLE.brand}">Yaiwell</p><h1 style="${STYLE.heading}">${escapeHtml(content.heading)}</h1><p style="${STYLE.text}">${escapeHtml(content.greeting)}</p>${paragraphs}${quote}${details}${outro}${cta}<p style="${STYLE.text}">${escapeHtml(content.signature)}</p><p style="${STYLE.footer}">${escapeHtml(content.footer)}</p></div></div></body></html>`;
}

/** Versión en texto plano, para clientes sin HTML y filtros de spam. */
export function renderEmailText(content: EmailContent): string {
  const blocks = [
    content.heading,
    content.greeting,
    ...content.paragraphs,
    content.quote ?? '',
    content.details.map((d) => `${d.label}: ${d.value}`).join('\n'),
    ...(content.outro ?? []),
    content.cta ? `${content.cta.label}: ${content.cta.url}` : '',
    content.signature,
    content.footer,
  ];
  return blocks.filter((b) => b.length > 0).join('\n\n');
}
