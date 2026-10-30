import { describe, expect, it } from 'vitest';

import { toBlockStatus } from './WeeklyCalendar.logic';
import { bookingBlockByStatus, legendDotByStatus } from './WeeklyCalendar.styles';

/**
 * Un no presentado tiene color propio en la cuadrícula: la hora estuvo
 * reservada, no quedó libre como en una cancelación.
 */
describe('WeeklyCalendar · no presentado', () => {
  it('no se funde con cancelada; reembolsada sí', () => {
    expect(toBlockStatus('no_show')).toBe('no_show');
    expect(toBlockStatus('refunded')).toBe('cancelled');
  });

  it('tiene estilo de bloque y punto de leyenda, sin tachar', () => {
    expect(bookingBlockByStatus.no_show).toContain('border-dashed');
    expect(bookingBlockByStatus.no_show).not.toContain('line-through');
    expect(legendDotByStatus.no_show).toBeTruthy();
  });
});
