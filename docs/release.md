# onUI Local Release Runbook

## Release Summary (v2.0.0)

- Added a dual capture model with **Annotate mode** for element-level feedback and **Draw mode** for region-level layout and spacing issues.
- Added draw mode shape selection (`rectangle`/`ellipse`) plus region editing UX with persistent outlines and transform handles.
- Redesigned the floating toolbar to stay compact while opening output level and clear-on-copy controls in a readable pop-out settings card.
- Updated report formatters (`compact`, `standard`, `detailed`, `forensic`) to emit explicit region target metadata and geometry.
- Improved MCP/local search behavior so region annotations are queryable by target type/shape and geometry text, with report generation preserving region fields.
- Polished toolbar/dialog behavior for mode toggles, escape handling, multi-select hints, and copy/clear settings flow.

## Preconditions

1. Node 20+
2. pnpm
3. git
4. zip
5. GitHub CLI (`gh`) authenticated for `--release`

## Build Artifacts Locally

```bash
./app.sh --build
```

Outputs in `artifacts/vX.Y.Z/`:
1. `onui-extension-unpacked-vX.Y.Z.zip`
2. `onui-chrome-web-store-vX.Y.Z.zip`
3. `onui-edge-add-ons-vX.Y.Z.zip`
4. `onui-mcp-bundle-vX.Y.Z.zip`
5. `install.sh`
6. `install.ps1`
7. `checksums.txt`

## Publish a Release

```bash
./app.sh --release
```

This command:
1. Enforces clean tree + `main` branch
2. Bumps patch version
3. Syncs version across runtime files
4. Runs build/test/doctor checks
5. Creates artifacts
6. Commits + tags `vX.Y.Z`
7. Pushes and opens GitHub release with assets

## Chrome Web Store Upload

Upload `onui-chrome-web-store-vX.Y.Z.zip` from `artifacts/vX.Y.Z/`.
The CWS zip strips the `manifest.key` field automatically.

Live listing:
`https://chromewebstore.google.com/detail/onui/hllgijkdhegkpooopdhbfdjialkhlkan`

## Edge Add-ons Upload

Upload `onui-edge-add-ons-vX.Y.Z.zip` from `artifacts/vX.Y.Z/`.
The Edge zip strips the `manifest.key` field automatically.

Submission checklist (Microsoft Edge Add-ons):
1. Partner Center developer account (publisher profile complete).
2. Extension package zip (Manifest V3) with required icons and metadata.
3. Store listing assets: short/long description, screenshots, categories.
4. Privacy policy URL if the extension handles personal/sensitive data.
5. Accurate permission justification for requested extension permissions.
6. Pass automated validation and certification review before publish.

## Public Installer URLs

1. `https://github.com/onllm-dev/onUI/releases/latest/download/install.sh`
2. `https://github.com/onllm-dev/onUI/releases/latest/download/install.ps1`
