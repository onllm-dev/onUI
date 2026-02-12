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

## Project Background

onUI was built from hands-on exploration of annotation-first agent workflows and adapted into a frictionless browser-extension model.

## Quick Start

```bash
git clone https://github.com/onllm-dev/onUI.git
cd onUI
pnpm install
pnpm --filter @onui/extension build
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
```

## Repository Structure

```text
packages/
  extension/   Chrome extension runtime (background/content/popup)
  mcp-server/  MCP server package scaffold
```

## License

MIT
