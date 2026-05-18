#!/usr/bin/env bash
# audit-design-tokens.sh
#
# src/ 配下の Svelte / CSS で「token 経由しない生の見た目値」 が使われていないか検証。
# design tokens v2 では color / shadow / glass はすべて --ag-* / --c-* / --surface-* 等の
# token 経由でなければならない (docs/l2_foundation/design-tokens.md)。
#
# 検出対象 (= fail):
#   - 生 hex            : color: #fff / bg-[#fff]
#   - 生 rgb / rgba     : background: rgba(...)
#   - 生 hsl            : color: hsl(...)
#   - 生 oklch / oklab  : color: oklch(...)            ← v2 で追加
#   - box-shadow 生色   : box-shadow: 0 0 4px #000 / rgba(...) ← v2 で追加
#
# 非検出 (= 仕様):
#   - filter: blur(Npx) — wallpaper 等の dynamic blur は user 値、 token 化対象外。
#     glass 面の blur は --surface-blur token 経由 (arcagate-theme.css) を使うこと。
#
# 除外:
#   - src/lib/components/ui/ (shadcn-svelte scaffold、手動編集禁止)
#   - src/lib/bindings/ (auto generated)
#   - src/app.css (ag-* ⇄ shadcn token の bridge 定義そのもの)
#   - src/lib/themes/ (テーマ JSON、色定義そのもの)
#   - src/lib/styles/arcagate-theme.css (token システム定義そのもの)

set -euo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

# Tailwind arbitrary value 形式: bg-[#xxx] / text-[oklch(...)] / shadow-[rgba(...)] etc
# 直書き CSS: color/background/box-shadow 等 1 宣言内に生色値が出現
patterns_to_check='(\b(bg|text|border|ring|fill|stroke|outline|decoration|divide|shadow)-\[(#|rgb|rgba|hsl|oklch|oklab)|(color|background|background-color|border-color|fill|stroke|box-shadow|outline):[[:space:]]*[^;{}]*(#[0-9a-fA-F]|rgb\(|rgba\(|hsl\(|oklch\(|oklab\())'

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
	echo "ERROR: $violations file(s) use hardcoded colors/shadows instead of design tokens:"
	cat "$violations_log"
	rm -f "$violations_log"
	exit 1
fi

rm -f "$violations_log"
echo "OK: no hardcoded colors/shadows in src/ (excluding shadcn ui/, bindings/, themes/, app.css)."

# glass 面トークン vocabulary の regression ガード (#9 由来、 v2 token 名に更新)。
# glass surface (popup / dialog / widget body 等) は .ag-glass utility class が
# --surface-blur / --surface-glass-regular / --surface-noise-opacity をまとめて適用する。
# これらが arcagate-theme.css から消えると全ガラス面が崩れるため存在を検証する。
theme_css="src/lib/styles/arcagate-theme.css"
glass_missing=0
for tok in '--surface-blur' '--surface-glass-regular' '--surface-noise-opacity' '.ag-glass'; do
	if ! grep -qF -- "$tok" "$theme_css" 2>/dev/null; then
		echo "ERROR: glass token/utility '$tok' missing from $theme_css"
		glass_missing=$((glass_missing + 1))
	fi
done
if [ "$glass_missing" -gt 0 ]; then
	exit 1
fi
echo "OK: glass surface tokens (--surface-* + .ag-glass) present."
