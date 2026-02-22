#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOCAL_SCRIPT="$ROOT_DIR/scripts/release/chrome-web-store.publish.sh"
LOCAL_ENV="$ROOT_DIR/scripts/release/chrome-web-store.env"
TEMPLATE_SCRIPT="$ROOT_DIR/scripts/release/chrome-web-store.publish.sh.template"
TEMPLATE_ENV="$ROOT_DIR/scripts/release/chrome-web-store.env.example"

printf '[cws-init] Preparing local Chrome Web Store publish files\n'

if [ ! -f "$LOCAL_SCRIPT" ]; then
  cp "$TEMPLATE_SCRIPT" "$LOCAL_SCRIPT"
  chmod +x "$LOCAL_SCRIPT"
  printf '[cws-init] Created %s\n' "$LOCAL_SCRIPT"
else
  printf '[cws-init] Exists: %s\n' "$LOCAL_SCRIPT"
fi

if [ ! -f "$LOCAL_ENV" ]; then
  cp "$TEMPLATE_ENV" "$LOCAL_ENV"
  printf '[cws-init] Created %s\n' "$LOCAL_ENV"
else
  printf '[cws-init] Exists: %s\n' "$LOCAL_ENV"
fi

printf '[cws-init] Both files are gitignored. Fill credentials in %s\n' "$LOCAL_ENV"
