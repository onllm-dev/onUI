# onUI

Annotate UI elements for AI agents with a Chrome extension, no code integration required.

onUI works on any web page where content scripts can run. Turn it on per tab, annotate elements visually, and export structured notes for agents.

## Highlights

- Zero integration into app code
- Per-tab ON/OFF control (off by default)
- In-page annotation dialog with intent and severity
- Visual markers and hover targeting
- Export outputs in compact/standard/detailed/forensic formats
- Shadow DOM isolation for stable styling
- Local MCP server + native bridge (no backend required)

## Project Background

onUI was built from hands-on exploration of annotation-first agent workflows and adapted into a frictionless browser-extension model.

## Quick Start

```bash
git clone https://github.com/onllm-dev/onUI.git
cd onUI
pnpm install
pnpm --filter @onui/extension build
pnpm --filter @onui/mcp-server build
```

Load in Chrome:
1. Open `chrome://extensions`
2. Enable Developer mode
3. Click Load unpacked
4. Select `packages/extension/dist`

## Usage

1. Open any supported website tab.
2. Click the onUI extension icon.
3. Enable `This Tab`.
4. Use the on-page launcher to annotate and manage notes.
5. Copy exported output from the toolbar.

## Development

```bash
pnpm install
pnpm --filter @onui/extension build
pnpm --filter @onui/mcp-server build
```

## Local MCP Setup (Chrome Stable)

onUI ships with a local MCP server and Native Messaging bridge to sync extension annotations into a local store.

```bash
pnpm setup:mcp
pnpm doctor:mcp
```

- No cloud backend required.
- Auto-registers `onui-local` for Claude Code and Codex when those CLIs are installed.
- Browser support in this release: **Chrome stable only**.
- `@onui/mcp-server` is currently workspace-local (`private: true`), so run setup/doctor from this repo.

See:
- `docs/mcp-setup.md`
- `docs/doctor.md`

## Repository Structure

```text
packages/
  core/        Shared annotation/report types + formatters
  extension/   Chrome extension runtime (background/content/popup)
  mcp-server/  Local MCP server + native bridge setup/doctor tooling
```

## License

MIT
