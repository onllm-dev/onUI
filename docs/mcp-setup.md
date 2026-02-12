# onUI MCP Setup (Local, No Backend)

## Scope

This release supports:
- Chrome stable extension runtime
- Local Native Messaging host (`com.onui.native`)
- Local MCP server (`onui-local`) for Claude Code and Codex

Browser support in this release: **Chrome stable only**.

## One-Command Setup

macOS/Linux:
```bash
curl -fsSL https://github.com/onllm-dev/onUI/releases/latest/download/install.sh | bash -s -- --mcp
```

Windows (PowerShell):
```powershell
$env:ONUI_INSTALL_MCP=1; irm https://github.com/onllm-dev/onUI/releases/latest/download/install.ps1 | iex
```

Manual source setup is also supported:

```bash
pnpm --filter @onui/mcp-server run setup
```

What setup does:
1. Installs a local Native Messaging wrapper and manifest.
2. Registers Chrome native host for `com.onui.native`.
3. Registers MCP server `onui-local` in:
   - Claude Code (`claude mcp add ...`)
   - Codex (`codex mcp add ...`)

## Verify Installation

```bash
pnpm --filter @onui/mcp-server run doctor
```

Use deep mode for V2 sync readiness checks:

```bash
pnpm --filter @onui/mcp-server run doctor -- --deep
```

## MCP Tooling

The local MCP server exposes:
1. `onui_list_pages`
2. `onui_get_annotations`
3. `onui_get_report`
4. `onui_search_annotations`
5. `onui_update_annotation_metadata`
6. `onui_bulk_update_annotation_metadata`

## Local Data Paths

1. macOS: `~/Library/Application Support/onui/store.v1.json`
2. Linux: `${XDG_DATA_HOME:-~/.local/share}/onui/store.v1.json`
3. Windows: `%APPDATA%\\onui\\store.v1.json`

## Rollback

```bash
claude mcp remove onui-local --scope user
codex mcp remove onui-local
```
