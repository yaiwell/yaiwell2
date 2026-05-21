import { ProviderGallery } from '@/components/features/provider/ProviderGallery';
import { ProviderHeader } from '@/components/features/provider/ProviderHeader';
import { ProviderInfoPanel } from '@/components/features/provider/ProviderInfoPanel';
import { ProviderReviewsSection } from '@/components/features/provider/ProviderReviewsSection';
import { ProviderServicesList } from '@/components/features/provider/ProviderServicesList';

import { providerDetailStyles as s } from './ProviderDetail.styles';
import { ProviderDetailNav } from './ProviderDetailNav';
import type { ProviderDetailProps } from './ProviderDetail.types';

/**
 * Compositor de la ficha pública del proveedor.
 *
 * Orden vertical fijado intencionalmente:
 *  1. Header (identidad + meta + disponibilidad)
 *  2. Galería (impacto visual antes del precio)
 *  3. Nav de secciones (sticky en mobile)
 *  4. Servicios — propósito primario del visitante
 *  5. Reseñas — confianza social
 *  6. Información — mapa + horario para confirmar antes de reservar
 *
 * Cada sección hija renderiza su propio `<h2>` interno. El compositor
 * solo aporta el `<section id="...">` ancla con `aria-labelledby` para
 * preservar accesibilidad sin duplicar el título en pantalla.
 *
 * Se renderiza como Server Component: la única isla interactiva es
 * `ProviderDetailNav` (mobile tabs con scroll-spy).
 */
export function ProviderDetail({
  provider,
  services,
  reviews,
  ratingBreakdown,
  locale,
}: ProviderDetailProps) {
  return (
    <main className={s.root} data-component="provider-detail-page">
      <ProviderHeader provider={provider} />

      <ProviderGallery photos={provider.photos} alt={provider.name} />

      <ProviderDetailNav />

      <div className={s.sections}>
        <section
          id="section-services"
          className={s.sectionAnchor}
          aria-labelledby="provider-services-heading"
        >
          <ProviderServicesList services={services} locale={locale} />
        </section>

        <section
          id="section-reviews"
          className={s.sectionAnchor}
          aria-labelledby="provider-reviews-heading"
        >
          <ProviderReviewsSection
            reviews={reviews}
            ratingAvg={provider.rating}
            reviewsCount={provider.reviewsCount}
            ratingBreakdown={ratingBreakdown}
            locale={locale}
          />
        </section>

        <section
          id="section-info"
          className={s.sectionAnchor}
          aria-labelledby="provider-info-heading"
        >
          <ProviderInfoPanel provider={provider} locale={locale} />
        </section>
      </div>
    </main>
  );
}
