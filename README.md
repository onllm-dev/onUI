<div align="center">

# onUI
### Annotate Any UI for AI Agents

Lightweight Chrome extension + local MCP bridge for annotation-first UI pair programming.

[![GitHub stars](https://img.shields.io/github/stars/onllm-dev/onUI?style=for-the-badge)](https://github.com/onllm-dev/onUI/stargazers)
[![GitHub license](https://img.shields.io/github/license/onllm-dev/onUI?style=for-the-badge)](https://github.com/onllm-dev/onUI/blob/main/LICENSE)
[![Chrome Stable](https://img.shields.io/badge/Browser-Chrome_Stable-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://www.google.com/chrome/)

</div>

> [!NOTE]
> 🚧 `onUI` is in active beta development.

## ✨ Why onUI

- 🧩 No integration into app code
- 🎛️ Per-tab ON/OFF control (off by default)
- 🎯 In-page annotation dialog with intent + severity
- 👀 Visual markers and hover targeting
- 🧾 Export outputs in compact / standard / detailed / forensic formats
- 🛡️ Shadow DOM isolation for stable styling
- 🔌 Local MCP server + native bridge (no cloud backend required)

## 🚀 Quick Start (Chrome Stable)

### 1) One-command install (latest release)

macOS / Linux:

```bash
curl -fsSL https://github.com/onllm-dev/onUI/releases/latest/download/install.sh | bash
```

Windows (PowerShell):

```powershell
irm https://github.com/onllm-dev/onUI/releases/latest/download/install.ps1 | iex
```

The installer:
- Downloads the latest extension build artifact.
- Builds and configures the local MCP bridge (`onui-local`).
- Runs doctor checks and prints status.

### 2) Final manual Chrome step (required)

Chrome still requires manual unpacked extension loading for this beta flow:
1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the extension folder printed by the installer

> Chromium removed branded Chrome command-line sideload flags in April 2025.
> - https://groups.google.com/a/chromium.org/g/chromium-extensions/c/1-g8EFx2BBY
> - https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked

### 3) Build from source (alternative)

```bash
git clone https://github.com/onllm-dev/onUI.git
cd onUI
pnpm install
pnpm build
```

Load `packages/extension/dist` in `chrome://extensions` using **Load unpacked**.

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
