# onUI Development Guide

## Prerequisites

- Node.js 20+
- pnpm 8+
- Chrome, Edge, or Firefox

## Setup

```bash
git clone https://github.com/onllm-dev/onUI.git
cd onUI
pnpm install
```

## Build

```bash
pnpm --filter @onui/extension build
```

## Test

Run workspace tests:

```bash
pnpm test:all
```

Run all local quality gates (recommended before push):

```bash
pnpm check
```

Run coverage checks:

```bash
pnpm test:coverage
```

## Load Extension

Chromium (Chrome/Edge):
1. Open `chrome://extensions` or `edge://extensions`
2. Enable Developer mode
3. Click Load unpacked
4. Select `packages/extension/dist`

Firefox:
1. Open `about:debugging#/runtime/this-firefox`
2. Click `Load Temporary Add-on...`
3. Select `packages/extension/dist-firefox/manifest.json`

## Useful Paths

- `packages/extension/src/background` service worker + message routing
- `packages/extension/src/content` page-injected UI and annotation logic
- `packages/extension/src/popup` extension popup UI
- `packages/extension/src/types` shared contracts
