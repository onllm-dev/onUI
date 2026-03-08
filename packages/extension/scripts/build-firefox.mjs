#!/usr/bin/env node
import { cp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_FIREFOX_EXTENSION_ID = 'onui@onllm.dev';
const DEFAULT_FIREFOX_MIN_VERSION = '140.0';
const FIREFOX_REQUIRED_DATA_COLLECTION = ['browsingActivity', 'websiteContent'];

const scriptDir = dirname(fileURLToPath(import.meta.url));
const extensionRoot = resolve(scriptDir, '..');
const chromiumDistDir = join(extensionRoot, 'dist');
const firefoxDistDir = join(extensionRoot, 'dist-firefox');
const firefoxManifestPath = join(firefoxDistDir, 'manifest.json');
const firefoxViteDir = join(firefoxDistDir, '.vite');

const firefoxExtensionId = process.env.ONUI_FIREFOX_EXTENSION_ID?.trim() || DEFAULT_FIREFOX_EXTENSION_ID;

if (!firefoxExtensionId) {
  throw new Error('Firefox extension id cannot be empty.');
}

await rm(firefoxDistDir, { recursive: true, force: true });
await cp(chromiumDistDir, firefoxDistDir, { recursive: true });
await rm(firefoxViteDir, { recursive: true, force: true });

const manifestRaw = await readFile(firefoxManifestPath, 'utf8');
const manifest = JSON.parse(manifestRaw);

delete manifest.key;

const background = manifest.background;
if (background && typeof background === 'object' && typeof background.service_worker === 'string') {
  const scripts = Array.isArray(background.scripts) ? background.scripts : [];
  if (!scripts.includes(background.service_worker)) {
    scripts.push(background.service_worker);
  }
  background.scripts = scripts;
}

const browserSpecificSettings =
  manifest.browser_specific_settings && typeof manifest.browser_specific_settings === 'object'
    ? manifest.browser_specific_settings
    : {};
const geckoSettings =
  browserSpecificSettings.gecko && typeof browserSpecificSettings.gecko === 'object'
    ? browserSpecificSettings.gecko
    : {};
const dataCollectionPermissions =
  geckoSettings.data_collection_permissions && typeof geckoSettings.data_collection_permissions === 'object'
    ? geckoSettings.data_collection_permissions
    : {};

manifest.browser_specific_settings = {
  ...browserSpecificSettings,
  gecko: {
    ...geckoSettings,
    id: firefoxExtensionId,
    strict_min_version: DEFAULT_FIREFOX_MIN_VERSION,
    data_collection_permissions: {
      ...dataCollectionPermissions,
      required: FIREFOX_REQUIRED_DATA_COLLECTION,
    },
  },
};

await writeFile(firefoxManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log(`[onUI] Firefox extension bundle generated at ${firefoxDistDir}`);
