#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

usage() {
  cat <<'EOF'
Usage:
  ./app.sh --build
  ./app.sh --release
EOF
}

log() {
  printf '[onui] %s\n' "$1"
}

fail() {
  printf '[onui] ERROR: %s\n' "$1" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

node_major() {
  node -p "process.versions.node.split('.')[0]"
}

current_version() {
  node -p "require('./package.json').version"
}

next_patch_version() {
  node -e "const p=require('./package.json');const [a,b,c]=p.version.split('.').map(Number);console.log([a,b,c+1].join('.'));"
}

preflight_common() {
  require_cmd node
  require_cmd pnpm
  require_cmd git
  require_cmd zip

  local major
  major="$(node_major)"
  if [ "$major" -lt 20 ]; then
    fail "Node 20+ required. Found Node $(node -v)"
  fi
}

assert_clean_tree() {
  [ -z "$(git status --porcelain)" ] || fail "Release requires a clean git working tree."
}

assert_main_branch() {
  local branch
  branch="$(git rev-parse --abbrev-ref HEAD)"
  [ "$branch" = "main" ] || fail "Release must run on main. Current branch: $branch"
}

assert_gh_auth() {
  require_cmd gh
  gh auth status >/dev/null 2>&1 || fail "GitHub CLI is not authenticated. Run: gh auth login"
}

sync_version() {
  local version="$1"
  node scripts/release/sync-version.mjs "$version"
}

run_build_pipeline() {
  log "Installing dependencies"
  pnpm install --frozen-lockfile

  log "Building @onui/core"
  pnpm --filter @onui/core run build

  log "Building @onui/extension"
  pnpm --filter @onui/extension run build

  log "Building @onui/mcp-server"
  pnpm --filter @onui/mcp-server run build

  log "Running MCP tests"
  pnpm --filter @onui/mcp-server run test

  log "Running MCP doctor smoke check (warnings allowed)"
  local report
  report="$(node packages/mcp-server/dist/bin/onui-cli.js doctor --json || true)"
  printf '%s\n' "$report" | node -e '
    const fs = require("node:fs");
    const input = fs.readFileSync(0, "utf8").trim();
    const report = JSON.parse(input);
    if (report.status === "error") process.exit(1);
  ' || fail "MCP doctor reported error status."
}

sha256_file() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1"
  else
    shasum -a 256 "$1"
  fi
}

package_artifacts() {
  local version="$1"
  local artifacts_dir="artifacts/v${version}"
  local ext_dist_dir="packages/extension/dist"
  local sh_template="scripts/install/install.sh.template"
  local ps_template="scripts/install/install.ps1.template"

  [ -d "$ext_dist_dir" ] || fail "Missing extension dist at $ext_dist_dir"
  [ -f "$sh_template" ] || fail "Missing installer template: $sh_template"
  [ -f "$ps_template" ] || fail "Missing installer template: $ps_template"

  log "Packaging artifacts into $artifacts_dir"
  rm -rf "$artifacts_dir"
  mkdir -p "$artifacts_dir"

  local unpacked_zip="$artifacts_dir/onui-extension-unpacked-v${version}.zip"
  local cws_zip="$artifacts_dir/onui-chrome-web-store-v${version}.zip"
  local install_sh="$artifacts_dir/install.sh"
  local install_ps1="$artifacts_dir/install.ps1"

  (
    cd "$ext_dist_dir"
    zip -qr "../../../$unpacked_zip" .
  )

  local tmp_dir
  tmp_dir="$(mktemp -d)"
  cp -R "$ext_dist_dir/." "$tmp_dir/"
  node -e "
    const fs = require('node:fs');
    const p = '$tmp_dir/manifest.json';
    const m = JSON.parse(fs.readFileSync(p, 'utf8'));
    delete m.key;
    fs.writeFileSync(p, JSON.stringify(m, null, 2) + '\n', 'utf8');
  "
  (
    cd "$tmp_dir"
    zip -qr "$ROOT_DIR/$cws_zip" .
  )
  rm -rf "$tmp_dir"

  sed "s/__VERSION__/${version}/g" "$sh_template" > "$install_sh"
  sed "s/__VERSION__/${version}/g" "$ps_template" > "$install_ps1"
  chmod +x "$install_sh"

  {
    sha256_file "$unpacked_zip"
    sha256_file "$cws_zip"
    sha256_file "$install_sh"
    sha256_file "$install_ps1"
  } > "$artifacts_dir/checksums.txt"

  log "Artifacts created:"
  ls -1 "$artifacts_dir"
}

release_to_github() {
  local version="$1"
  local tag="v${version}"
  local artifacts_dir="artifacts/v${version}"

  log "Committing version bump"
  git add \
    package.json \
    packages/core/package.json \
    packages/extension/package.json \
    packages/mcp-server/package.json \
    packages/extension/manifest.json \
    packages/extension/src/popup/components/Popup.tsx \
    packages/mcp-server/src/mcp/server.ts \
    packages/mcp-server/src/doctor/checks/mcp-runtime.ts
  git commit -m "chore(release): ${tag}"

  log "Tagging release ${tag}"
  git tag "$tag"

  log "Pushing commit and tag"
  git push origin main
  git push origin "$tag"

  log "Creating GitHub release ${tag}"
  gh release create "$tag" \
    "$artifacts_dir/onui-extension-unpacked-v${version}.zip" \
    "$artifacts_dir/onui-chrome-web-store-v${version}.zip" \
    "$artifacts_dir/install.sh" \
    "$artifacts_dir/install.ps1" \
    "$artifacts_dir/checksums.txt" \
    --title "$tag" \
    --generate-notes
}

main() {
  if [ "$#" -ne 1 ]; then
    usage
    exit 1
  fi

  case "$1" in
    --build)
      preflight_common
      local version
      version="$(current_version)"
      run_build_pipeline
      package_artifacts "$version"
      ;;
    --release)
      preflight_common
      assert_clean_tree
      assert_main_branch
      assert_gh_auth
      local version
      version="$(next_patch_version)"
      log "Bumping version to $version"
      sync_version "$version"
      run_build_pipeline
      package_artifacts "$version"
      release_to_github "$version"
      ;;
    *)
      usage
      exit 1
      ;;
  esac
}

main "$@"
