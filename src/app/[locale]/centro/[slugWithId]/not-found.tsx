import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';

/**
 * 404 dedicado de la ficha de proveedor.
 *
 * Se renderiza cuando el id parseado del segmento `{slug}-{id}` no
 * existe en el repositorio o el formato del segmento es inválido.
 * Usamos un mensaje específico ("centro no encontrado") en vez del
 * 404 genérico de la app porque el contexto da por sentado que el
 * usuario venía de la búsqueda y conviene devolverlo allí.
 */
export default function ProviderNotFound() {
  const t = useTranslations('providerDetail.notFound');

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="font-display text-foreground text-3xl tracking-tight md:text-4xl">
        {t('title')}
      </h1>
      <p className="text-muted-foreground">{t('subtitle')}</p>
      <Link
        href="/buscar"
        className="bg-foreground text-background hover:bg-foreground/90 mt-2 inline-flex items-center rounded-full px-5 py-2.5 text-sm font-medium transition-colors"
      >
        {t('backToSearch')}
      </Link>
    </div>
  );
}
