import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { designSystemPageStyles as s } from './DesignSystemPage.styles';
import type {
  BrandPair,
  ButtonSize,
  ButtonVariant,
  ColorSwatch,
  RadiusToken,
} from './DesignSystemPage.types';

/**
 * Página interna `/design-system`.
 *
 * Server Component puro: muestra el catálogo de tokens (colores, marca,
 * tipografía, botones, radius) y unos cuantos componentes shadcn vivos.
 * Pensada para QA visual durante el rediseño y para detectar regresiones
 * cromáticas al tocar `globals.css`. No accesible desde el menú: solo se
 * llega por URL directa.
 */

const semanticColors: ColorSwatch[] = [
  { token: '--primary', bgClass: 'bg-primary', fgClass: 'text-primary-foreground' },
  { token: '--secondary', bgClass: 'bg-secondary', fgClass: 'text-secondary-foreground' },
  { token: '--accent', bgClass: 'bg-accent', fgClass: 'text-accent-foreground' },
  { token: '--muted', bgClass: 'bg-muted', fgClass: 'text-muted-foreground' },
  { token: '--card', bgClass: 'bg-card', fgClass: 'text-card-foreground' },
  { token: '--background', bgClass: 'bg-background', fgClass: 'text-foreground' },
  { token: '--destructive', bgClass: 'bg-destructive', fgClass: 'text-destructive-foreground' },
  { token: '--border', bgClass: 'bg-border', fgClass: 'text-foreground' },
];

const brandPairs: BrandPair[] = [
  {
    name: 'rose',
    solid: { bgClass: 'bg-brand-rose', fgClass: 'text-foreground' },
    soft: { bgClass: 'bg-brand-rose-soft', fgClass: 'text-brand-rose' },
  },
  {
    name: 'sky',
    solid: { bgClass: 'bg-brand-sky', fgClass: 'text-foreground' },
    soft: { bgClass: 'bg-brand-sky-soft', fgClass: 'text-brand-sky' },
  },
  {
    name: 'peach',
    solid: { bgClass: 'bg-brand-peach', fgClass: 'text-foreground' },
    soft: { bgClass: 'bg-brand-peach-soft', fgClass: 'text-brand-peach' },
  },
  {
    name: 'sage',
    solid: { bgClass: 'bg-brand-sage', fgClass: 'text-foreground' },
    soft: { bgClass: 'bg-brand-sage-soft', fgClass: 'text-brand-sage' },
  },
  {
    name: 'butter',
    solid: { bgClass: 'bg-brand-butter', fgClass: 'text-foreground' },
    soft: { bgClass: 'bg-brand-butter-soft', fgClass: 'text-brand-butter' },
  },
  {
    name: 'lilac',
    solid: { bgClass: 'bg-brand-lilac', fgClass: 'text-foreground' },
    soft: { bgClass: 'bg-brand-lilac-soft', fgClass: 'text-brand-lilac' },
  },
];

const buttonVariants: ButtonVariant[] = [
  'default',
  'outline',
  'secondary',
  'ghost',
  'destructive',
  'link',
];

const buttonSizes: ButtonSize[] = ['xs', 'sm', 'default', 'lg'];

const radiusTokens: RadiusToken[] = [
  { name: 'sm', className: 'rounded-sm' },
  { name: 'md', className: 'rounded-md' },
  { name: 'lg', className: 'rounded-lg' },
  { name: 'xl', className: 'rounded-xl' },
  { name: '2xl', className: 'rounded-2xl' },
  { name: '3xl', className: 'rounded-3xl' },
  { name: '4xl', className: 'rounded-4xl' },
];

export function DesignSystemPage() {
  const t = useTranslations('designSystem');

  return (
    <main className={s.root} data-component="design-system-page">
      <header className={s.header}>
        <h1 className={s.title}>{t('title')}</h1>
        <p className={s.subtitle}>{t('subtitle')}</p>
      </header>

      {/* ---------------- Colores semánticos ---------------- */}
      <section className={s.section} data-component="design-system-colors">
        <h2 className={s.sectionTitle}>{t('colors.title')}</h2>
        <p className={s.sectionDescription}>{t('colors.description')}</p>
        <div className={s.sectionGrid}>
          {semanticColors.map((color) => (
            <div key={color.token} className={`${s.swatch} ${color.bgClass} ${color.fgClass}`}>
              <span className={s.swatchToken}>{color.token}</span>
              <span className={s.swatchLabel}>{t('colors.sample')}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- Brand pastels ---------------- */}
      <section className={s.section} data-component="design-system-brand">
        <h2 className={s.sectionTitle}>{t('brand.title')}</h2>
        <p className={s.sectionDescription}>{t('brand.description')}</p>
        <div className={s.sectionGrid}>
          {brandPairs.map((pair) => (
            <div key={pair.name} className={s.brandRow}>
              <div className={`${s.brandCell} ${pair.solid.bgClass} ${pair.solid.fgClass}`}>
                <span className={s.brandToken}>brand-{pair.name}</span>
                <span className={s.brandLabel}>{t('brand.solid')}</span>
              </div>
              <div className={`${s.brandCell} ${pair.soft.bgClass} ${pair.soft.fgClass}`}>
                <span className={s.brandToken}>brand-{pair.name}-soft</span>
                <span className={s.brandLabel}>{t('brand.soft')}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- Tipografía ---------------- */}
      <section className={s.section} data-component="design-system-typography">
        <h2 className={s.sectionTitle}>{t('typography.title')}</h2>
        <p className={s.sectionDescription}>{t('typography.description')}</p>
        <div className="flex flex-col gap-3">
          <div className={s.typeRow}>
            <p className={`${s.typeSample} font-display text-5xl`}>{t('typography.displaySample')}</p>
            <span className={s.typeMeta}>font-display · text-5xl (Fraunces)</span>
          </div>
          <div className={s.typeRow}>
            <p className={`${s.typeSample} text-3xl`}>{t('typography.headlineSample')}</p>
            <span className={s.typeMeta}>text-3xl (Inter via h1/h2 → Fraunces fallback)</span>
          </div>
          <div className={s.typeRow}>
            <p className={`${s.typeSample} text-lg`}>{t('typography.leadSample')}</p>
            <span className={s.typeMeta}>text-lg</span>
          </div>
          <div className={s.typeRow}>
            <p className={`${s.typeSample} text-base`}>{t('typography.bodySample')}</p>
            <span className={s.typeMeta}>text-base</span>
          </div>
          <div className={s.typeRow}>
            <p className={`${s.typeSample} text-sm text-muted-foreground`}>
              {t('typography.captionSample')}
            </p>
            <span className={s.typeMeta}>text-sm · text-muted-foreground</span>
          </div>
        </div>
      </section>

      {/* ---------------- Botones ---------------- */}
      <section className={s.section} data-component="design-system-buttons">
        <h2 className={s.sectionTitle}>{t('buttons.title')}</h2>
        <p className={s.sectionDescription}>{t('buttons.description')}</p>
        <div className="flex flex-col gap-4">
          {buttonVariants.map((variant) => (
            <div key={variant} className={s.buttonGroup} data-variant={variant}>
              <span className={s.buttonGroupTitle}>{variant}</span>
              <div className={s.buttonGroupRow}>
                {buttonSizes.map((size) => (
                  <Button key={size} variant={variant} size={size}>
                    {t('buttons.label', { variant, size })}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- Radius ---------------- */}
      <section className={s.section} data-component="design-system-radius">
        <h2 className={s.sectionTitle}>{t('radius.title')}</h2>
        <p className={s.sectionDescription}>{t('radius.description')}</p>
        <div className={s.sectionRow}>
          {radiusTokens.map((radius) => (
            <div key={radius.name} className={`${s.radiusCell} ${radius.className}`}>
              <span>{radius.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- Componentes ---------------- */}
      <section className={s.section} data-component="design-system-components">
        <h2 className={s.sectionTitle}>{t('components.title')}</h2>
        <p className={s.sectionDescription}>{t('components.description')}</p>

        <div className={s.componentBlock} data-component="design-system-select">
          <span className={s.componentTitle}>Select</span>
          <Select>
            <SelectTrigger className="w-64">
              <SelectValue placeholder={t('components.selectPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="option-1">{t('components.selectOption', { index: 1 })}</SelectItem>
              <SelectItem value="option-2">{t('components.selectOption', { index: 2 })}</SelectItem>
              <SelectItem value="option-3">{t('components.selectOption', { index: 3 })}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className={s.componentBlock} data-component="design-system-tabs">
          <span className={s.componentTitle}>Tabs</span>
          <Tabs defaultValue="tab-1">
            <TabsList>
              <TabsTrigger value="tab-1">{t('components.tabLabel', { index: 1 })}</TabsTrigger>
              <TabsTrigger value="tab-2">{t('components.tabLabel', { index: 2 })}</TabsTrigger>
              <TabsTrigger value="tab-3">{t('components.tabLabel', { index: 3 })}</TabsTrigger>
            </TabsList>
            <TabsContent value="tab-1">{t('components.tabContent', { index: 1 })}</TabsContent>
            <TabsContent value="tab-2">{t('components.tabContent', { index: 2 })}</TabsContent>
            <TabsContent value="tab-3">{t('components.tabContent', { index: 3 })}</TabsContent>
          </Tabs>
        </div>
      </section>
    </main>
  );
}
