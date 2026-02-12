# onUI Local Release Runbook

This project uses a local release flow (no CI pipeline yet).

## Commands

```bash
./app.sh --build
./app.sh --cws-package
./app.sh --legacy-install-assets
./app.sh --release
```

Mode summary:
- `--build`: full validation + all artifacts (CWS ZIP + fallback install assets).
- `--cws-package`: extension build + CWS ZIP only.
- `--legacy-install-assets`: extension build + fallback GitHub/manual install assets.
- `--release`: patch bump + version sync + full build + tag + GitHub release.

## `--build` behavior

`./app.sh --build` performs:
1. Preflight checks (`node`, `pnpm`, `git`, `zip`, Node 20+).
2. Dependency install if `node_modules` is missing.
3. Ordered builds:
   - `@onui/core`
   - `@onui/extension`
   - `@onui/mcp-server`
4. MCP tests (`vitest`).
5. MCP doctor smoke check (warnings allowed, errors fail).
6. Artifact packaging in `artifacts/vX.Y.Z/`.

Build artifacts:
- `onui-extension-vX.Y.Z.zip`
- `onui-chrome-web-store-vX.Y.Z.zip` (Chrome Web Store upload ZIP, `manifest.key` stripped automatically)
- `install.sh`
- `install.ps1`
- `checksums.txt`

## `--release` behavior

`./app.sh --release` performs:
1. Strict git checks:
   - clean working tree
   - current branch is `main`
2. Validates GitHub auth (`gh auth status`).
3. Auto patch bump (`X.Y.Z -> X.Y.(Z+1)`) and version sync across:
   - root/package versions
   - extension manifest version
   - popup version label
   - MCP runtime/server version fields
4. Runs full `--build` pipeline.
5. Creates release commit + annotated tag.
6. Pushes `main` and tag.
7. Publishes GitHub release with packaged artifacts.

## Notes for Install UX

The release installers are designed for one-command setup, but Chrome still requires one manual extension action:

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click Load unpacked
4. Select the installed extension directory

Why manual still exists:
- As of April 2025, branded Chrome no longer supports command-line sideload flags for normal users.
- Chromium PSA: https://groups.google.com/a/chromium.org/g/chromium-extensions/c/1-g8EFx2BBY
- Chrome docs: https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked
