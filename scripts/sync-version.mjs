#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const VERSION_RE = /^\d+\.\d+\.\d+$/;

function usage() {
  process.stderr.write(
    'Usage:\n' +
      '  node scripts/sync-version.mjs --set <x.y.z>\n' +
      '  node scripts/sync-version.mjs --bump-patch\n'
  );
}

function validateVersion(version) {
  if (!VERSION_RE.test(version)) {
    throw new Error(`Invalid version: ${version}. Expected semantic version x.y.z`);
  }
}

function bumpPatch(version) {
  validateVersion(version);
  const [major, minor, patch] = version.split('.').map(Number);
  return `${major}.${minor}.${patch + 1}`;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function updateJsonVersion(path, nextVersion) {
  const json = await readJson(path);
  json.version = nextVersion;
  await writeJson(path, json);
}

async function replaceInFile(path, pattern, replaceValue) {
  const content = await readFile(path, 'utf8');
  if (!pattern.test(content)) {
    throw new Error(`Pattern not found in ${path}`);
  }
  const next = content.replace(pattern, replaceValue);
  await writeFile(path, next, 'utf8');
}

async function getRootVersion(rootDir) {
  const rootPackagePath = resolve(rootDir, 'package.json');
  const rootPackage = await readJson(rootPackagePath);
  validateVersion(rootPackage.version);
  return rootPackage.version;
}

async function syncVersion(rootDir, nextVersion) {
  validateVersion(nextVersion);

  const jsonVersionFiles = [
    'package.json',
    'packages/core/package.json',
    'packages/extension/package.json',
    'packages/mcp-server/package.json',
  ];

  for (const relativePath of jsonVersionFiles) {
    await updateJsonVersion(resolve(rootDir, relativePath), nextVersion);
  }

  await replaceInFile(
    resolve(rootDir, 'packages/extension/manifest.json'),
    /"version":\s*"\d+\.\d+\.\d+"/,
    `"version": "${nextVersion}"`
  );

  await replaceInFile(
    resolve(rootDir, 'packages/extension/src/popup/components/Popup.tsx'),
    /onUI v\d+\.\d+\.\d+ • /,
    `onUI v${nextVersion} • `
  );

  await replaceInFile(
    resolve(rootDir, 'packages/mcp-server/src/mcp/server.ts'),
    /version:\s*'\d+\.\d+\.\d+'/,
    `version: '${nextVersion}'`
  );

  await replaceInFile(
    resolve(rootDir, 'packages/mcp-server/src/doctor/checks/mcp-runtime.ts'),
    /version:\s*'\d+\.\d+\.\d+'/,
    `version: '${nextVersion}'`
  );
}

async function main() {
  const args = process.argv.slice(2);
  const rootDir = process.cwd();

  if (args.length === 0) {
    usage();
    process.exitCode = 1;
    return;
  }

  let nextVersion;

  if (args[0] === '--set') {
    if (args.length !== 2) {
      usage();
      process.exitCode = 1;
      return;
    }
    nextVersion = args[1];
  } else if (args[0] === '--bump-patch') {
    if (args.length !== 1) {
      usage();
      process.exitCode = 1;
      return;
    }
    const current = await getRootVersion(rootDir);
    nextVersion = bumpPatch(current);
  } else {
    usage();
    process.exitCode = 1;
    return;
  }

  await syncVersion(rootDir, nextVersion);
  process.stdout.write(`${nextVersion}\n`);
}

void main();
