#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${ROOT_DIR}"

log() {
  printf '[app.sh] %s\n' "$1"
}

fail() {
  printf '[app.sh][error] %s\n' "$1" >&2
  exit 1
}

usage() {
  cat <<USAGE
Usage:
  ./app.sh --build
  ./app.sh --cws-package
  ./app.sh --legacy-install-assets
  ./app.sh --release

Modes:
  --build                 Full validation build + all artifacts (CWS + fallback install assets)
  --cws-package           Build extension and package only CWS upload artifact
  --legacy-install-assets Build extension and package fallback GitHub/manual install assets
  --release               Patch bump + sync versions + full build + git tag + GitHub release
USAGE
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
}

require_node_20() {
  local major
  major="$(node -p "process.versions.node.split('.')[0]")"
  if [ "${major}" -lt 20 ]; then
    fail "Node.js 20+ is required. Found: $(node -v)"
  fi
}

preflight_common() {
  require_cmd node
  require_cmd pnpm
  require_cmd git
  require_cmd zip
  require_node_20
}

current_version() {
  node -p "JSON.parse(require('fs').readFileSync('package.json', 'utf8')).version"
}

next_patch_version() {
  node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const [major, minor, patch] = pkg.version.split('.').map(Number);
process.stdout.write(`${major}.${minor}.${patch + 1}`);
"
}

ensure_clean_git_tree() {
  if [ -n "$(git status --porcelain)" ]; then
    fail 'Git working tree must be clean for --release.'
  fi
}

ensure_main_branch() {
  local branch
  branch="$(git rev-parse --abbrev-ref HEAD)"
  if [ "${branch}" != 'main' ]; then
    fail "--release must run from main. Current branch: ${branch}"
  fi
}

install_dependencies_if_missing() {
  if [ ! -d 'node_modules' ]; then
    log 'Installing dependencies (node_modules missing)'
    pnpm install --frozen-lockfile
  else
    log 'Dependencies already installed (node_modules present)'
  fi
}

run_extension_build() {
  log 'Building @onui/core'
  pnpm --filter @onui/core run build

  log 'Building @onui/extension'
  pnpm --filter @onui/extension run build
}

run_doctor_smoke() {
  log 'Running MCP doctor smoke check'

  set +e
  local doctor_output
  doctor_output="$(node packages/mcp-server/dist/bin/onui-cli.js doctor --json 2>&1)"
  local doctor_exit=$?
  set -e

  printf '%s\n' "${doctor_output}"

  if [ "${doctor_exit}" -ne 0 ] && [ "${doctor_exit}" -ne 1 ] && [ "${doctor_exit}" -ne 2 ]; then
    fail "Doctor command failed unexpectedly with exit code ${doctor_exit}."
  fi

  local doctor_status
  doctor_status="$(printf '%s' "${doctor_output}" | node -e "
let raw = '';
process.stdin.on('data', (chunk) => raw += chunk);
process.stdin.on('end', () => {
  try {
    const report = JSON.parse(raw);
    process.stdout.write(report.status || 'unknown');
  } catch {
    process.exit(1);
  }
});
")" || fail 'Unable to parse doctor JSON output.'

  if [ "${doctor_status}" = 'error' ] || [ "${doctor_exit}" -eq 2 ]; then
    fail 'MCP doctor reported critical failures.'
  fi

  if [ "${doctor_status}" = 'warning' ]; then
    log 'MCP doctor reported warnings; continuing build.'
  else
    log 'MCP doctor passed.'
  fi
}

run_full_validation_build() {
  run_extension_build

  log 'Building @onui/mcp-server'
  pnpm --filter @onui/mcp-server run build

  log 'Running @onui/mcp-server tests'
  pnpm --filter @onui/mcp-server run test

  run_doctor_smoke
}

artifact_dir_for_version() {
  local version="$1"
  printf '%s' "${ROOT_DIR}/artifacts/v${version}"
}

prepare_artifact_dir() {
  local version="$1"
  local artifact_dir
  artifact_dir="$(artifact_dir_for_version "${version}")"

  rm -rf "${artifact_dir}"
  mkdir -p "${artifact_dir}"
}

require_extension_dist() {
  [ -d 'packages/extension/dist' ] || fail 'Extension dist directory missing. Run a build first.'
}

package_extension_zip() {
  local version="$1"
  local artifact_dir
  artifact_dir="$(artifact_dir_for_version "${version}")"
  local extension_zip="${artifact_dir}/onui-extension-v${version}.zip"

  (
    cd 'packages/extension/dist'
    zip -qr "${extension_zip}" .
  )

  log "Created ${extension_zip}"
}

package_cws_zip() {
  local version="$1"
  local artifact_dir
  artifact_dir="$(artifact_dir_for_version "${version}")"
  local cws_zip="${artifact_dir}/onui-chrome-web-store-v${version}.zip"
  local temp_dir="${artifact_dir}/.cws-package"

  rm -rf "${temp_dir}"
  mkdir -p "${temp_dir}"
  cp -R 'packages/extension/dist' "${temp_dir}/dist"

  # CWS rejects manifest key for uploaded packages; strip only in CWS artifact.
  node -e "
const fs = require('fs');
const manifestPath = process.argv[1];
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
delete manifest.key;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
if ('key' in JSON.parse(fs.readFileSync(manifestPath, 'utf8'))) {
  process.exit(1);
}
" "${temp_dir}/dist/manifest.json"

  (
    cd "${temp_dir}/dist"
    zip -qr "${cws_zip}" .
  )

  rm -rf "${temp_dir}"
  log "Created ${cws_zip} (manifest key stripped)"
}

package_legacy_install_assets() {
  local version="$1"
  local artifact_dir
  artifact_dir="$(artifact_dir_for_version "${version}")"

  sed "s/__ONUI_VERSION__/${version}/g" "${ROOT_DIR}/scripts/install.sh.template" > "${artifact_dir}/install.sh"
  chmod +x "${artifact_dir}/install.sh"

  sed "s/__ONUI_VERSION__/${version}/g" "${ROOT_DIR}/scripts/install.ps1.template" > "${artifact_dir}/install.ps1"

  log "Created ${artifact_dir}/install.sh"
  log "Created ${artifact_dir}/install.ps1"
}

write_checksums_for_present_assets() {
  local version="$1"
  local artifact_dir
  artifact_dir="$(artifact_dir_for_version "${version}")"

  local assets=()
  local extension_zip_name="onui-extension-v${version}.zip"
  local cws_zip_name="onui-chrome-web-store-v${version}.zip"

  [ -f "${artifact_dir}/${extension_zip_name}" ] && assets+=("${extension_zip_name}")
  [ -f "${artifact_dir}/${cws_zip_name}" ] && assets+=("${cws_zip_name}")
  [ -f "${artifact_dir}/install.sh" ] && assets+=("install.sh")
  [ -f "${artifact_dir}/install.ps1" ] && assets+=("install.ps1")

  if [ "${#assets[@]}" -eq 0 ]; then
    fail 'No assets found for checksum generation.'
  fi

  if command -v shasum >/dev/null 2>&1; then
    (
      cd "${artifact_dir}"
      shasum -a 256 "${assets[@]}" > checksums.txt
    )
    return
  fi

  if command -v sha256sum >/dev/null 2>&1; then
    (
      cd "${artifact_dir}"
      sha256sum "${assets[@]}" > checksums.txt
    )
    return
  fi

  fail 'No SHA256 tool found (expected shasum or sha256sum).'
}

print_artifact_summary() {
  local version="$1"
  local artifact_dir
  artifact_dir="$(artifact_dir_for_version "${version}")"

  log "Artifacts for v${version}:"
  (
    cd "${artifact_dir}"
    ls -1
  ) | while IFS= read -r entry; do
    log "- ${artifact_dir}/${entry}"
  done
}

package_all_assets() {
  local version="$1"

  prepare_artifact_dir "${version}"
  require_extension_dist

  package_extension_zip "${version}"
  package_cws_zip "${version}"
  package_legacy_install_assets "${version}"
  write_checksums_for_present_assets "${version}"
  print_artifact_summary "${version}"
}

package_cws_only() {
  local version="$1"

  prepare_artifact_dir "${version}"
  require_extension_dist

  package_cws_zip "${version}"
  write_checksums_for_present_assets "${version}"
  print_artifact_summary "${version}"
}

package_legacy_only() {
  local version="$1"

  prepare_artifact_dir "${version}"
  require_extension_dist

  package_extension_zip "${version}"
  package_legacy_install_assets "${version}"
  write_checksums_for_present_assets "${version}"
  print_artifact_summary "${version}"
}

run_build_mode() {
  preflight_common
  install_dependencies_if_missing
  run_full_validation_build

  local version
  version="$(current_version)"

  log "Packaging all artifacts into $(artifact_dir_for_version "${version}")"
  package_all_assets "${version}"

  log "Build mode completed for v${version}"
}

run_cws_package_mode() {
  preflight_common
  install_dependencies_if_missing
  run_extension_build

  local version
  version="$(current_version)"

  log "Packaging CWS artifact into $(artifact_dir_for_version "${version}")"
  package_cws_only "${version}"

  log "CWS package mode completed for v${version}"
}

run_legacy_install_assets_mode() {
  preflight_common
  install_dependencies_if_missing
  run_extension_build

  local version
  version="$(current_version)"

  log "Packaging legacy install assets into $(artifact_dir_for_version "${version}")"
  package_legacy_only "${version}"

  log "Legacy install assets mode completed for v${version}"
}

check_release_target_available() {
  local version="$1"

  if git rev-parse "v${version}" >/dev/null 2>&1; then
    fail "Git tag v${version} already exists locally."
  fi

  if gh release view "v${version}" >/dev/null 2>&1; then
    fail "GitHub release v${version} already exists."
  fi
}

stage_release_files() {
  git add \
    package.json \
    packages/core/package.json \
    packages/extension/package.json \
    packages/mcp-server/package.json \
    packages/extension/manifest.json \
    packages/extension/src/popup/components/Popup.tsx \
    packages/mcp-server/src/mcp/server.ts \
    packages/mcp-server/src/doctor/checks/mcp-runtime.ts
}

run_release_mode() {
  preflight_common
  require_cmd gh

  ensure_clean_git_tree
  ensure_main_branch

  log 'Validating GitHub authentication'
  gh auth status -h github.com >/dev/null

  local next_version
  next_version="$(next_patch_version)"

  check_release_target_available "${next_version}"

  log "Bumping version to v${next_version}"
  node scripts/sync-version.mjs --set "${next_version}" >/dev/null

  run_build_mode

  stage_release_files

  if git diff --cached --quiet; then
    fail 'No staged version changes found for release commit.'
  fi

  log "Creating release commit and tag v${next_version}"
  git commit -m "release: v${next_version}"
  git tag -a "v${next_version}" -m "Release v${next_version}"

  log 'Pushing main and tag to origin'
  git push origin main
  git push origin "v${next_version}"

  local artifact_dir
  artifact_dir="$(artifact_dir_for_version "${next_version}")"

  log 'Publishing GitHub release via gh'
  gh release create "v${next_version}" \
    "${artifact_dir}/onui-extension-v${next_version}.zip" \
    "${artifact_dir}/onui-chrome-web-store-v${next_version}.zip" \
    "${artifact_dir}/install.sh" \
    "${artifact_dir}/install.ps1" \
    "${artifact_dir}/checksums.txt" \
    --title "v${next_version}" \
    --generate-notes

  log "Release completed: v${next_version}"
}

if [ "$#" -ne 1 ]; then
  usage
  exit 1
fi

case "$1" in
  --build)
    run_build_mode
    ;;
  --cws-package)
    run_cws_package_mode
    ;;
  --legacy-install-assets)
    run_legacy_install_assets_mode
    ;;
  --release)
    run_release_mode
    ;;
  *)
    usage
    exit 1
    ;;
esac
