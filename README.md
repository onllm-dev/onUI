# onUI
### Annotate Any UI for AI Agents

Lightweight Chrome extension + local MCP bridge for annotation-first UI pair programming.

Powered by [onLLM.dev](https://onllm.dev).

[![GitHub stars](https://img.shields.io/github/stars/onllm-dev/onUI?style=for-the-badge)](https://github.com/onllm-dev/onUI/stargazers)
[![GitHub license](https://img.shields.io/github/license/onllm-dev/onUI?style=for-the-badge)](https://github.com/onllm-dev/onUI/blob/main/LICENSE)
[![Chrome Stable](https://img.shields.io/badge/Browser-Chrome_Stable-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://www.google.com/chrome/)

> [!NOTE]
> `onUI` is now stable and production-ready.

## ✨ Why onUI

- 🧩 No integration into app code
- 🎛️ Per-tab ON/OFF control (off by default)
- 🎯 In-page annotation dialog with intent + severity
- 👀 Visual markers and hover targeting
- 🧾 Export outputs in compact / standard / detailed / forensic formats
- 🛡️ Shadow DOM isolation for stable styling
- 🔌 Local MCP server + native bridge (no cloud backend required)

## Install (Current)

### Option A: Chrome Web Store (recommended once approved)

Install directly from Chrome Web Store when listed.

> Chrome Web Store extension listing is coming soon.

### Option B: Load unpacked from source (available now)

```bash
git clone https://github.com/onllm-dev/onUI.git
cd onUI
pnpm install
pnpm build
```

Then load it in Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select `packages/extension/dist`

> Chrome requires this final manual step for unpacked extensions.

## 🧠 Usage

1. Open any supported website tab.
2. Click the onUI extension icon.
3. Enable `This Tab`.
4. Use the on-page launcher to annotate and manage notes.
5. Copy exported output from the toolbar.

## 🔌 Local MCP Setup (Optional)

onUI ships with a local MCP server and Native Messaging bridge to sync extension annotations into a local store.

```bash
pnpm build:mcp
pnpm setup:mcp
pnpm doctor:mcp
```

- Auto-registers `onui-local` for Claude Code and Codex when those CLIs are installed.
- Browser support in this release: **Chrome stable only**.
- `@onui/mcp-server` is workspace-local (`private: true`), so run setup/doctor from this repo.

See:
- `docs/mcp-setup.md`
- `docs/doctor.md`
- `docs/release.md`

## Maintainer Build + Release

`app.sh` is the local release entrypoint (no CI/CD dependency).

### Local validation + artifact packaging

```bash
./app.sh --build
```

This runs:
1. Prereq checks (Node 20+, pnpm, git, zip)
2. Build order: `@onui/core` -> `@onui/extension` -> `@onui/mcp-server`
3. MCP tests
4. MCP doctor smoke check (warnings allowed, errors fail)
5. Artifact packaging into `artifacts/vX.Y.Z/`

Artifacts:
1. `onui-extension-unpacked-vX.Y.Z.zip`
2. `onui-chrome-web-store-vX.Y.Z.zip` (manifest `key` stripped for CWS)
3. `checksums.txt`

### Local release + GitHub publish

```bash
./app.sh --release
```

Release gates:
1. Clean git tree
2. Current branch is `main`
3. `gh auth status` succeeds

Release actions:
1. Auto patch bump from root `package.json`
2. Sync version across extension + MCP runtime strings
3. Run full `--build`
4. Commit + tag `vX.Y.Z`
5. Push commit/tag
6. Create GitHub release with packaged assets

## 🛠️ Development

```bash
pnpm install
pnpm build
pnpm build:mcp
```

## 🗂️ Repository Structure

```text
packages/
  core/        Shared annotation/report types + formatters
  extension/   Chrome extension runtime (background/content/popup)
  mcp-server/  Local MCP server + native bridge setup/doctor tooling
```

## ⭐ Support

If onUI is useful to you, please star the repo:
https://github.com/onllm-dev/onUI

It helps other users discover the product. 

## 📄 License

GPL-3.0
