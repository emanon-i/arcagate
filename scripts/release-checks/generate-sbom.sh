#!/usr/bin/env bash
# generate-sbom.sh
#
# release artifact 用 SBOM (Software Bill of Materials) を CycloneDX JSON 形式で生成。
# - sbom-npm.json: pnpm 依存ツリー (npm sbom 経由)
# - sbom-cargo.json: Rust 依存ツリー (cargo cyclonedx 必要、未 install なら skip + WARN)
#
# release.yml 末尾で呼び、artifact に同梱する。

set -euo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

OUT_DIR="${1:-./sbom}"
mkdir -p "$OUT_DIR"

echo "=== npm SBOM ==="
if command -v npm >/dev/null 2>&1; then
	# npm 8+ で sbom サブコマンドが組み込まれた
	if npm sbom --sbom-format=cyclonedx > "$OUT_DIR/sbom-npm.json" 2>/dev/null; then
		echo "OK: $OUT_DIR/sbom-npm.json"
	else
		echo "WARN: 'npm sbom' failed (npm < 8 or unsupported), trying pnpm fallback"
		# pnpm fallback: pnpm-lock.yaml を CycloneDX 形式に手動変換は重いので、
		# 最低限 lock file をコピーして release artifact に同梱
		cp pnpm-lock.yaml "$OUT_DIR/pnpm-lock.yaml" 2>/dev/null || true
	fi
else
	echo "WARN: npm not in PATH"
fi

echo ""
echo "=== Cargo SBOM ==="
if command -v cargo >/dev/null 2>&1; then
	if cargo --list 2>/dev/null | grep -q "cyclonedx"; then
		(cd src-tauri && cargo cyclonedx --format json --output-pattern "../$OUT_DIR/sbom-cargo" 2>&1 | tail -3 || true)
		if [ -f "$OUT_DIR/sbom-cargo.json" ] || [ -f "$OUT_DIR/sbom-cargo.cdx.json" ]; then
			echo "OK: cargo SBOM generated in $OUT_DIR"
		else
			echo "WARN: cargo cyclonedx ran but no JSON output found"
		fi
	else
		echo "WARN: 'cargo cyclonedx' subcommand not installed, skipping"
		echo "  install: cargo install cargo-cyclonedx"
		# fallback: Cargo.lock を copy
		cp src-tauri/Cargo.lock "$OUT_DIR/Cargo.lock" 2>/dev/null || true
	fi
else
	echo "WARN: cargo not in PATH"
fi

echo ""
echo "SBOM artifacts in $OUT_DIR/:"
ls -la "$OUT_DIR/" 2>/dev/null
