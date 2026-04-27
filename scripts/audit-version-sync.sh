#!/usr/bin/env bash
# audit-version-sync.sh
#
# package.json / Cargo.toml / tauri.conf.json の version 3 点同期を検証 (PH-454 batch-103)。
# Codex 4 回目 Q3 #2 Critical 指摘対応。tag push 前に必ず通す。

set -euo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

# package.json
pkg=$(grep -E '^\s*"version"' package.json | head -1 | sed -E 's/.*"version":\s*"([^"]+)".*/\1/')

# Cargo.toml (top-level [package])
cargo=$(grep -E '^version\s*=' src-tauri/Cargo.toml | head -1 | sed -E 's/version\s*=\s*"([^"]+)".*/\1/')

# tauri.conf.json
tauri=$(grep -E '^\s*"version"' src-tauri/tauri.conf.json | head -1 | sed -E 's/.*"version":\s*"([^"]+)".*/\1/')

echo "package.json:        $pkg"
echo "Cargo.toml:          $cargo"
echo "tauri.conf.json:     $tauri"

if [ "$pkg" = "$cargo" ] && [ "$cargo" = "$tauri" ]; then
	echo "OK: version 3 点同期 ($pkg)"
	exit 0
else
	echo ""
	echo "ERROR: version 3 点不整合"
	echo "  package.json:    $pkg"
	echo "  Cargo.toml:      $cargo"
	echo "  tauri.conf.json: $tauri"
	echo ""
	echo "tag push 前に必ず 3 点を一致させること。"
	exit 1
fi
