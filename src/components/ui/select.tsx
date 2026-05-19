'use client';

import { Check, ChevronDown } from 'lucide-react';
import * as React from 'react';
import { Select as RadixSelect } from 'radix-ui';

import { cn } from '@/lib/utils';

/**
 * Select tipado al estilo shadcn/ui, montado sobre Radix Select.
 *
 * Se usa cuando queremos un dropdown que respete el estilo del producto
 * (no el render nativo del navegador). El trigger es transparente para
 * que cada consumidor pueda envolverlo en su propio "field" y mantener
 * la coherencia visual con el resto del formulario.
 */

const Select = RadixSelect.Root;
const SelectGroup = RadixSelect.Group;
const SelectValue = RadixSelect.Value;

const SelectTrigger = React.forwardRef<
  React.ComponentRef<typeof RadixSelect.Trigger>,
  React.ComponentPropsWithoutRef<typeof RadixSelect.Trigger> & {
    /** Si es `true`, no se pinta el chevron por defecto (el padre ya lo coloca). */
    hideChevron?: boolean;
  }
>(({ className, children, hideChevron, ...props }, ref) => (
  <RadixSelect.Trigger
    ref={ref}
    className={cn(
      'text-foreground data-[placeholder]:text-muted-foreground/70 inline-flex w-full items-center justify-between gap-2 text-left text-sm font-medium outline-none disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
      className,
    )}
    {...props}
  >
    {children}
    {!hideChevron && (
      <RadixSelect.Icon asChild>
        <ChevronDown className="text-muted-foreground size-4 shrink-0 transition-transform data-[state=open]:rotate-180" />
      </RadixSelect.Icon>
    )}
  </RadixSelect.Trigger>
));
SelectTrigger.displayName = 'SelectTrigger';

const SelectContent = React.forwardRef<
  React.ComponentRef<typeof RadixSelect.Content>,
  React.ComponentPropsWithoutRef<typeof RadixSelect.Content>
>(({ className, children, position = 'popper', sideOffset = 8, ...props }, ref) => (
  <RadixSelect.Portal>
    <RadixSelect.Content
      ref={ref}
      position={position}
      sideOffset={sideOffset}
      className={cn(
        'border-border bg-popover text-popover-foreground z-50 max-h-(--radix-select-content-available-height) min-w-(--radix-select-trigger-width) overflow-hidden rounded-2xl border p-1 shadow-xl ring-1 shadow-black/10 ring-black/5',
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
        className,
      )}
      {...props}
    >
      <RadixSelect.Viewport className="p-1">{children}</RadixSelect.Viewport>
    </RadixSelect.Content>
  </RadixSelect.Portal>
));
SelectContent.displayName = 'SelectContent';

const SelectItem = React.forwardRef<
  React.ComponentRef<typeof RadixSelect.Item>,
  React.ComponentPropsWithoutRef<typeof RadixSelect.Item>
>(({ className, children, ...props }, ref) => (
  <RadixSelect.Item
    ref={ref}
    className={cn(
      'text-foreground relative flex w-full cursor-pointer items-center gap-2 rounded-xl py-2 pr-8 pl-3 text-sm transition-colors outline-none select-none',
      'data-[highlighted]:bg-muted data-[highlighted]:text-foreground data-[state=checked]:font-semibold',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className,
    )}
    {...props}
  >
    <RadixSelect.ItemText>{children}</RadixSelect.ItemText>
    <RadixSelect.ItemIndicator className="text-primary absolute right-2 flex size-4 items-center justify-center">
      <Check className="size-3.5" />
    </RadixSelect.ItemIndicator>
  </RadixSelect.Item>
));
SelectItem.displayName = 'SelectItem';

export { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue };
