# onUI MCP Setup (Local, No Backend)

## Scope

This release supports:
- Chrome + Edge extension runtime
- Local Native Messaging host (`com.onui.native`)
- Local MCP server (`onui-local`) for Claude Code and Codex

Browser support in this release: **Chrome stable + Edge stable (unpacked)**.

## UI Capture Model (v2.0.0)

This release formalizes two complementary capture flows in the extension UI:

1. **Annotate mode**: target individual elements (or Shift multi-select groups) for precise element-level issues.
2. **Draw mode**: drag rectangle/ellipse regions for layout, spacing, and grouping issues that span multiple elements.
3. **Compact toolbar + pop-out settings**: primary controls remain in a compact rail, while output level and clear-on-copy are configured in a readable settings pop-out.

MCP consumers receive these captures through the same local tools (`onui_get_annotations`, `onui_search_annotations`, `onui_get_report`) with region metadata preserved in report output.

## One-Command Setup

macOS/Linux:
```bash
curl -fsSL https://github.com/onllm-dev/onUI/releases/latest/download/install.sh | bash -s -- --mcp
```

Windows (PowerShell):
```powershell
irm https://github.com/onllm-dev/onUI/releases/latest/download/install.ps1 | iex
```

When prompted, enter `y` to enable MCP setup.
Installer-based MCP setup uses a prebuilt release bundle and requires Node 20+.

Manual source setup is also supported:

```bash
pnpm --filter @onui/mcp-server run setup
```

What setup does:
1. Installs a local Native Messaging wrapper and manifest.
2. Registers browser native hosts for `com.onui.native` in Chrome and Edge.
3. Registers MCP server `onui-local` in:
   - Claude Code (`claude mcp add ...`)
   - Codex (`codex mcp add ...`)

Optional extension ID overrides:
- `ONUI_CHROME_EXTENSION_IDS`: comma-separated Chrome extension IDs to append.
- `ONUI_EDGE_EXTENSION_IDS`: comma-separated Edge extension IDs to append.
- `ONUI_EXTRA_EXTENSION_IDS`: comma-separated IDs appended for both browsers.

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
7. `onui_delete_annotation`
8. `onui_clear_page_annotations`

## Recommended v2.0.0 Agent Flow

1. Open the page and capture issues with **Annotate mode** for elements or **Draw mode** for regions.
2. Use toolbar **Settings** to choose the output level your agent needs (`compact`, `standard`, `detailed`, `forensic`).
3. Query page state through `onui_get_annotations` or generate a page-level summary with `onui_get_report`.
4. Search region or element issues with `onui_search_annotations` when iterating on a subset of UI work.
5. After fixes are verified, update or clear annotations through the metadata/delete tools.

## Region-aware MCP Query Examples

### Search for region annotations by shape

```json
{
  "tool": "onui_search_annotations",
  "arguments": {
    "query": "region ellipse",
    "pageUrl": "https://example.com/ui"
  }
}
```

### Search by region geometry text

`onui_search_annotations` matches rounded region geometry tokens (`x`, `y`, `width`, `height`) in addition to comment/selector/path/tag text.

```json
{
  "tool": "onui_search_annotations",
  "arguments": {
    "query": "width 120 height 80",
    "pageUrl": "https://example.com/ui",
    "status": "pending"
  }
}
```

### Generate a region-aware report

```json
{
  "tool": "onui_get_report",
  "arguments": {
    "pageUrl": "https://example.com/ui",
    "level": "detailed"
  }
}
```

In `detailed` and `forensic` levels, region annotations include target type, shape, and geometry fields in report output.

## Recommended Agent Cleanup Workflow

If you want agents to process annotations and then remove them:
1. Pull page annotations with `onui_get_annotations`.
2. After processing each item, call `onui_delete_annotation` for the handled IDs.
3. If all annotations on the page were handled, call `onui_clear_page_annotations` for that page URL.

## Local Data Paths

1. macOS: `~/Library/Application Support/onui/store.v1.json`
2. Linux: `${XDG_DATA_HOME:-~/.local/share}/onui/store.v1.json`
3. Windows: `%APPDATA%\\onui\\store.v1.json`

## Rollback

```bash
claude mcp remove onui-local --scope user
codex mcp remove onui-local
```
