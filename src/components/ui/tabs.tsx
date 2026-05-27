'use client';

import * as React from 'react';
import { Tabs as RadixTabs } from 'radix-ui';

import { cn } from '@/lib/utils';

/**
 * Tabs tipados al estilo shadcn/ui, montados sobre Radix Tabs.
 *
 * Se usa cuando necesitamos pestañas accesibles (roles `tablist`/`tab`/
 * `tabpanel`, navegación por flechas) con un look coherente con el resto
 * del producto. El estilo por defecto es una píldora segmentada cálida
 * que respeta los tokens semánticos para que el dark mode funcione sin
 * sobrescribir clases.
 */

const Tabs = RadixTabs.Root;

const TabsList = React.forwardRef<
  React.ComponentRef<typeof RadixTabs.List>,
  React.ComponentPropsWithoutRef<typeof RadixTabs.List>
>(({ className, ...props }, ref) => (
  <RadixTabs.List
    ref={ref}
    className={cn(
      // Píldora segmentada: fondo `muted` para que contraste suave con
      // la card; padding interno mínimo para que los triggers respiren.
      'inline-flex h-11 items-center justify-center rounded-full bg-muted p-1 text-muted-foreground',
      className,
    )}
    {...props}
  />
));
TabsList.displayName = 'TabsList';

const TabsTrigger = React.forwardRef<
  React.ComponentRef<typeof RadixTabs.Trigger>,
  React.ComponentPropsWithoutRef<typeof RadixTabs.Trigger>
>(({ className, ...props }, ref) => (
  <RadixTabs.Trigger
    ref={ref}
    className={cn(
      // El estado activo se pinta con `bg-background` para que parezca
      // que la pestaña activa "sale" de la píldora hacia el primer plano.
      'inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-all',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      'disabled:pointer-events-none disabled:opacity-50',
      'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = 'TabsTrigger';

const TabsContent = React.forwardRef<
  React.ComponentRef<typeof RadixTabs.Content>,
  React.ComponentPropsWithoutRef<typeof RadixTabs.Content>
>(({ className, ...props }, ref) => (
  <RadixTabs.Content
    ref={ref}
    className={cn(
      'mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = 'TabsContent';

export { Tabs, TabsList, TabsTrigger, TabsContent };
