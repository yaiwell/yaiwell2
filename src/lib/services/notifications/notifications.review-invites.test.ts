/**
 * Tests de la selección de reservas a invitar tras el cierre automático:
 * solo citas de los últimos 7 días.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ findStartedSince: vi.fn() }));
vi.mock('./notifications.review-invites.repository', () => ({
  reviewInvitesRepository: { findStartedSince: mocks.findStartedSince },
}));
vi.mock('./notifications.service', () => ({ notifyBookingCompleted: vi.fn() }));

import {
  REVIEW_INVITE_MAX_AGE_DAYS,
  selectReviewInviteCandidates,
} from './notifications.review-invites';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findStartedSince.mockResolvedValue(['bk-1']);
});

describe('selectReviewInviteCandidates', () => {
  it('filtra por citas de los últimos 7 días', async () => {
    const now = new Date('2026-11-10T03:00:00Z');
    await expect(selectReviewInviteCandidates(['bk-1', 'bk-old'], now)).resolves.toEqual(['bk-1']);
    expect(REVIEW_INVITE_MAX_AGE_DAYS).toBe(7);
    expect(mocks.findStartedSince).toHaveBeenCalledWith(
      ['bk-1', 'bk-old'],
      new Date('2026-11-03T03:00:00Z'),
    );
  });
});
