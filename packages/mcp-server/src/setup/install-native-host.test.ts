import { afterEach, describe, expect, it } from 'vitest';
import {
  buildAllowedOrigins,
  buildAllowedOriginsForBrowser,
  buildChromeAllowedOrigins,
  buildEdgeAllowedOrigins,
} from './install-native-host.js';

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

describe('buildEdgeAllowedOrigins', () => {
  it('includes known Edge-compatible extension origins by default', () => {
    const origins = buildEdgeAllowedOrigins();
    expect(origins).toEqual([
      'chrome-extension://fnkengnadapimmlepnjienecfoekgacp/',
      'chrome-extension://hllgijkdhegkpooopdhbfdjialkhlkan/',
    ]);
  });
});

describe('buildAllowedOrigins', () => {
  it('deduplicates and normalizes a mixed extension id list', () => {
    const origins = buildAllowedOrigins([
      'HLLGIJKDHEGKPOOOPDHBFDJIALKHLKAN',
      'hllgijkdhegkpooopdhbfdjialkhlkan',
      'invalid-id',
      'fnkengnadapimmlepnjienecfoekgacp',
    ]);
    expect(origins).toEqual([
      'chrome-extension://hllgijkdhegkpooopdhbfdjialkhlkan/',
      'chrome-extension://fnkengnadapimmlepnjienecfoekgacp/',
    ]);
  });
});

describe('buildAllowedOriginsForBrowser', () => {
  afterEach(() => {
    delete process.env.ONUI_EXTRA_EXTENSION_IDS;
    delete process.env.ONUI_CHROME_EXTENSION_IDS;
    delete process.env.ONUI_EDGE_EXTENSION_IDS;
  });

  it('includes env-provided Chrome extension ids', () => {
    process.env.ONUI_CHROME_EXTENSION_IDS = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    process.env.ONUI_EXTRA_EXTENSION_IDS = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
    const origins = buildAllowedOriginsForBrowser('chrome');

    expect(origins).toContain('chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/');
    expect(origins).toContain('chrome-extension://bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb/');
    expect(origins).toContain('chrome-extension://hllgijkdhegkpooopdhbfdjialkhlkan/');
  });

  it('includes env-provided Edge extension ids', () => {
    process.env.ONUI_EDGE_EXTENSION_IDS = 'cccccccccccccccccccccccccccccccc';
    process.env.ONUI_EXTRA_EXTENSION_IDS = 'dddddddddddddddddddddddddddddddd';
    const origins = buildAllowedOriginsForBrowser('edge');

    expect(origins).toContain('chrome-extension://cccccccccccccccccccccccccccccccc/');
    expect(origins).toContain('chrome-extension://dddddddddddddddddddddddddddddddd/');
    expect(origins).toContain('chrome-extension://fnkengnadapimmlepnjienecfoekgacp/');
  });
});
