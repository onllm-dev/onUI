# onUI Development Guide

## Prerequisites

- Node.js 20+
- pnpm 8+
- Chrome

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

## Load Extension

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click Load unpacked
4. Select `packages/extension/dist`

## Useful Paths

- `packages/extension/src/background` service worker + message routing
- `packages/extension/src/content` page-injected UI and annotation logic
- `packages/extension/src/popup` extension popup UI
- `packages/extension/src/types` shared contracts
