import { describe, expect, it } from 'vitest';
import { createResponse, isNativeRequest } from './protocol.js';

describe('native protocol', () => {
  it('validates request envelope', () => {
    expect(
      isNativeRequest({
        type: 'PING',
        requestId: 'r1',
        sentAt: Date.now(),
        payload: {},
      })
    ).toBe(true);

    expect(isNativeRequest({ foo: 'bar' })).toBe(false);
  });

  it('creates response envelope', () => {
    const response = createResponse('r1', true, { pong: true });
    expect(response.ok).toBe(true);
    expect(response.requestId).toBe('r1');
    expect(response.data).toEqual({ pong: true });
  });
});
