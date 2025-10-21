#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
VENDOR_DIR="vendor"
REPO="https://github.com/nvim-lua/plenary.nvim"
PIN_SHA="b9fd5226c2f76c951fc8ed5923d85e4de065e509"

mkdir -p "$VENDOR_DIR"
if [ ! -d "$VENDOR_DIR/plenary.nvim/.git" ]; then
  git clone --depth 1 "$REPO" "$VENDOR_DIR/plenary.nvim"
fi
(
  cd "$VENDOR_DIR/plenary.nvim"
  git fetch --depth 1 origin "$PIN_SHA" || true
  git checkout -q "$PIN_SHA"
)
echo "plenary.nvim pinned at $(cd "$VENDOR_DIR/plenary.nvim" && git rev-parse --short HEAD)"