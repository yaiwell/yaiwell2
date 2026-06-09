/**
 * Tests de `scrubSentryEvent`.
 *
 * Cubrimos:
 *  - Descarta errores en `SENTRY_IGNORED_ERRORS` (NEXT_REDIRECT, etc.).
 *  - Sanitiza headers/cookies con claves PII (case-insensitive).
 *  - Preserva headers no sensibles intactos.
 *  - Sanitiza `request.data` cuando es un object.
 *  - Sanitiza `event.extra` añadido manualmente con `setContext`.
 *  - Devuelve el evento intacto (modulo scrub) cuando no hay match en
 *    la lista de ignored.
 */

import type { ErrorEvent, EventHint } from '@sentry/nextjs';
import { describe, expect, it } from 'vitest';

import { scrubSentryEvent } from './sentry.scrub';

function buildHint(error: unknown): EventHint {
  return { originalException: error };
}

function buildEvent(overrides: Partial<ErrorEvent> = {}): ErrorEvent {
  return {
    event_id: 'evt_test',
    ...overrides,
  } as ErrorEvent;
}

describe('scrubSentryEvent', () => {
  it('descarta errores con mensaje NEXT_REDIRECT', () => {
    const result = scrubSentryEvent(buildEvent(), buildHint(new Error('NEXT_REDIRECT;replace;/')));
    expect(result).toBeNull();
  });

  it('descarta errores con mensaje NEXT_NOT_FOUND', () => {
    const result = scrubSentryEvent(buildEvent(), buildHint(new Error('NEXT_NOT_FOUND')));
    expect(result).toBeNull();
  });

  it('descarta BAILOUT_TO_CLIENT_SIDE_RENDERING', () => {
    const result = scrubSentryEvent(
      buildEvent(),
      buildHint(new Error('BAILOUT_TO_CLIENT_SIDE_RENDERING')),
    );
    expect(result).toBeNull();
  });

  it('NO descarta errores genéricos', () => {
    const result = scrubSentryEvent(buildEvent(), buildHint(new Error('Something broke')));
    expect(result).not.toBeNull();
  });

  it('sanitiza headers con claves PII (case-insensitive)', () => {
    const event = buildEvent({
      request: {
        headers: {
          'Stripe-Signature': 't=123,v1=fake',
          authorization: 'Bearer secret',
          'x-request-id': 'safe-value',
        },
      },
    });

    const result = scrubSentryEvent(event, buildHint(new Error('boom')));

    expect(result?.request?.headers).toEqual({
      'Stripe-Signature': '[Filtered]',
      authorization: 'Bearer secret', // No está en nuestra lista; Sentry SDK lo scrubea aparte
      'x-request-id': 'safe-value',
    });
  });

  it('sanitiza cookies con claves PII', () => {
    const event = buildEvent({
      request: {
        cookies: {
          __session: 'jwt_payload_clerk',
          theme: 'dark',
        },
      },
    });

    const result = scrubSentryEvent(event, buildHint(new Error('boom')));

    expect(result?.request?.cookies).toEqual({
      __session: '[Filtered]',
      theme: 'dark',
    });
  });

  it('sanitiza request.data si es object', () => {
    const event = buildEvent({
      request: {
        data: {
          email: 'cliente@ejemplo.com',
          notes: 'reservar 14h',
        },
      },
    });

    const result = scrubSentryEvent(event, buildHint(new Error('boom')));

    expect(result?.request?.data).toEqual({
      email: '[Filtered]',
      notes: 'reservar 14h',
    });
  });

  it('sanitiza event.extra añadido con setContext', () => {
    const event = buildEvent({
      extra: {
        emailAddress: 'admin@yaiwell.com',
        bookingId: 'bk_42',
      },
    });

    const result = scrubSentryEvent(event, buildHint(new Error('boom')));

    expect(result?.extra).toEqual({
      emailAddress: '[Filtered]',
      bookingId: 'bk_42',
    });
  });

  it('devuelve el evento intacto cuando no hay headers/cookies/extra', () => {
    const event = buildEvent({ message: 'plain event' });
    const result = scrubSentryEvent(event, buildHint(new Error('boom')));
    expect(result).toEqual(event);
  });

  it('no rompe si originalException no es un Error', () => {
    const result = scrubSentryEvent(buildEvent(), buildHint('plain string'));
    expect(result).not.toBeNull();
  });
});
