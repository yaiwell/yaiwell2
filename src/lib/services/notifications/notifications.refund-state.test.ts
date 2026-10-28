import { describe, expect, it } from 'vitest';

import { toCancellationRefundState } from './notifications.refund-state';

describe('toCancellationRefundState', () => {
  it.each([
    ['issued', false, 'refunded'],
    ['already_refunded', false, 'refunded'],
    ['failed', false, 'refund_pending'],
    ['not_applicable', false, 'no_payment'],
    ['failed', true, 'refund_uncertain'],
  ] as const)('%s (sin saber si hubo cobro: %s) → %s', (refund, uncertain, expected) => {
    expect(toCancellationRefundState(refund, uncertain)).toBe(expected);
  });
});
