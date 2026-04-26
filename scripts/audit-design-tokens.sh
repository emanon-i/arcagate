#!/usr/bin/env bash
# audit-design-tokens.sh
#
# src/ 配下の Svelte / CSS でハードコード色 (#xxx, rgb, rgba, hsl) が使われていないか検証。
# var(--ag-*) トークン経由か、shadcn 生成ファイル (除外) のみを許可。
#
# 除外:
#   - src/lib/components/ui/ (shadcn-svelte scaffold、手動編集禁止)
#   - src/lib/bindings/ (auto generated)
#   - src/app.css (テーマ変数定義そのもの、--ag-* と --background のブリッジが正)
#   - src/lib/themes/ (テーマ JSON、色定義そのもの)
#   - src/lib/styles/arcagate-theme.css (テーマ構造定義、特定テーマのカラー直書きは仕様)

set -euo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

# Tailwind arbitrary value 形式: bg-[#xxx] / text-[rgb(...)] / etc
# 直書き CSS: color: #xxx; / background: rgba(...);
patterns_to_check='(\b(bg|text|border|ring|fill|stroke|outline|decoration|divide)-\[(#|rgb|rgba|hsl)|(color|background|background-color|border-color|fill|stroke):[[:space:]]*(#[0-9a-fA-F]|rgb\(|rgba\(|hsl\())'

violations=0
violations_log=$(mktemp)

src_targets=$(find src -type f \( -name "*.svelte" -o -name "*.css" \) \
	! -path "src/lib/components/ui/*" \
	! -path "src/lib/bindings/*" \
	! -path "src/lib/themes/*" \
	! -path "src/app.css" \
	! -path "src/lib/styles/arcagate-theme.css" \
	2>/dev/null || true)

for f in $src_targets; do
	[ -f "$f" ] || continue
	found=$(grep -nE "$patterns_to_check" "$f" 2>/dev/null || true)
	if [ -n "$found" ]; then
		echo "$f:" >> "$violations_log"
		echo "$found" >> "$violations_log"
		echo "---" >> "$violations_log"
		violations=$((violations + 1))
	fi
done

if [ "$violations" -gt 0 ]; then
	echo "ERROR: $violations file(s) use hardcoded colors instead of --ag-* design tokens:"
	cat "$violations_log"
	rm -f "$violations_log"
	exit 1
fi

rm -f "$violations_log"
echo "OK: no hardcoded colors found in src/ (excluding shadcn ui/, bindings/, themes/, app.css)."
