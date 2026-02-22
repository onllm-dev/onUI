import { describe, expect, it } from 'vitest';
import { buildChromeAllowedOrigins } from './install-native-host.js';

describe('buildChromeAllowedOrigins', () => {
  it('includes both known Chrome extension origins by default', () => {
    const origins = buildChromeAllowedOrigins();
    expect(origins).toEqual([
      'chrome-extension://hllgijkdhegkpooopdhbfdjialkhlkan/',
      'chrome-extension://fnkengnadapimmlepnjienecfoekgacp/',
    ]);
  });

  it('deduplicates and normalizes valid extension ids', () => {
    const origins = buildChromeAllowedOrigins([
      'HLLGIJKDHEGKPOOOPDHBFDJIALKHLKAN',
      'hllgijkdhegkpooopdhbfdjialkhlkan',
      'fnkengnadapimmlepnjienecfoekgacp',
    ]);
    expect(origins).toEqual([
      'chrome-extension://hllgijkdhegkpooopdhbfdjialkhlkan/',
      'chrome-extension://fnkengnadapimmlepnjienecfoekgacp/',
    ]);
  });

  it('ignores invalid extension ids', () => {
    const origins = buildChromeAllowedOrigins(['invalid-id', '', 'abc', 'hllgijkdhegkpooopdhbfdjialkhlkan']);
    expect(origins).toEqual(['chrome-extension://hllgijkdhegkpooopdhbfdjialkhlkan/']);
  });
});
