import { describe, expect, it } from 'vitest';

import { LIVE_SUBSCRIPTION_STATUSES } from '@/lib/services/billing/billing.types';

import { isLiveSubscriptionStatus, LIVE_SUBSCRIPTION_STATUS_VALUES } from './plan-billing';

describe('isLiveSubscriptionStatus', () => {
  it('es espejo exacto de LIVE_SUBSCRIPTION_STATUSES del módulo billing', () => {
    expect([...LIVE_SUBSCRIPTION_STATUS_VALUES].sort()).toEqual(
      [...LIVE_SUBSCRIPTION_STATUSES].sort(),
    );
  });

  it.each(['active', 'past_due'])('%s está viva', (status) => {
    expect(isLiveSubscriptionStatus(status)).toBe(true);
  });

  it.each(['trialing', 'incomplete', 'canceled', 'unpaid', 'paused', null, undefined])(
    '%s no está viva',
    (status) => {
      expect(isLiveSubscriptionStatus(status)).toBe(false);
    },
  );
});
