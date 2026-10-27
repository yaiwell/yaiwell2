import { describe, expect, it } from 'vitest';

import { REVIEW_WINDOW_DAYS, isWithinReviewWindow } from './review.window';

/**
 * Límite exacto de la ventana de valoración (§4.bis): inclusivo a los
 * 30 días justos, cerrado un milisegundo después.
 */
const COMPLETED_AT = new Date('2026-10-01T10:00:00.000Z');
const WINDOW_MS = REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;

describe('isWithinReviewWindow', () => {
  it('acepta a los 30 días exactos', () => {
    expect(isWithinReviewWindow(COMPLETED_AT, new Date(COMPLETED_AT.getTime() + WINDOW_MS))).toBe(
      true,
    );
  });

  it('rechaza a los 30 días + 1 ms', () => {
    expect(
      isWithinReviewWindow(COMPLETED_AT, new Date(COMPLETED_AT.getTime() + WINDOW_MS + 1)),
    ).toBe(false);
  });

  it('acepta justo al completarse', () => {
    expect(isWithinReviewWindow(COMPLETED_AT, COMPLETED_AT)).toBe(true);
  });
});
