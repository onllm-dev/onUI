# onUI Local Release Runbook

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
3. `onui-mcp-bundle-vX.Y.Z.zip`
4. `install.sh`
5. `install.ps1`
6. `checksums.txt`

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

## Public Installer URLs

1. `https://github.com/onllm-dev/onUI/releases/latest/download/install.sh`
2. `https://github.com/onllm-dev/onUI/releases/latest/download/install.ps1`
