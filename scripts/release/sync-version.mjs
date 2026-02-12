#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const version = process.argv[2];

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('Usage: node scripts/release/sync-version.mjs <x.y.z>');
  process.exit(1);
}

const root = process.cwd();

function updateJsonFile(filePath, mutator) {
  const absolutePath = path.join(root, filePath);
  const value = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  mutator(value);
  fs.writeFileSync(absolutePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function updateTextFile(filePath, replacer, requiredPattern) {
  const absolutePath = path.join(root, filePath);
  const current = fs.readFileSync(absolutePath, 'utf8');
  if (requiredPattern && !requiredPattern.test(current)) {
    console.error(`Expected version pattern not found in ${filePath}`);
    process.exit(1);
  }
  const next = replacer(current);
  fs.writeFileSync(absolutePath, next, 'utf8');
}

updateJsonFile('package.json', (pkg) => {
  pkg.version = version;
});

updateJsonFile('packages/core/package.json', (pkg) => {
  pkg.version = version;
});

updateJsonFile('packages/extension/package.json', (pkg) => {
  pkg.version = version;
});

updateJsonFile('packages/mcp-server/package.json', (pkg) => {
  pkg.version = version;
});

updateJsonFile('packages/extension/manifest.json', (manifest) => {
  manifest.version = version;
});

updateTextFile(
  'packages/extension/src/popup/components/Popup.tsx',
  (content) => content.replace(/onUI v\d+\.\d+\.\d+ •/g, `onUI v${version} •`),
  /onUI v\d+\.\d+\.\d+ •/
);

updateTextFile(
  'packages/mcp-server/src/mcp/server.ts',
  (content) => content.replace(/version:\s*'[^']+'/, `version: '${version}'`),
  /version:\s*'[^']+'/
);

updateTextFile(
  'packages/mcp-server/src/doctor/checks/mcp-runtime.ts',
  (content) => content.replace(/version:\s*'[^']+'/, `version: '${version}'`),
  /version:\s*'[^']+'/
);

console.log(`Synced version to ${version}`);
