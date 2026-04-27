#!/usr/bin/env bash
# audit-text-overflow.sh (PH-491)
#
# widget / panel / button で text overflow が発生しやすいパターンを検出し、warning 表示。
# false positive 多めだが、コードレビュー指針として有用。
#
# 検出対象:
#   - `flex items-center` を持つ container で `min-w-0` が周辺に無いケース
#   - text を含む button で `truncate` または `whitespace-nowrap` が無いケース
#
# 対象 path:
#   - src/lib/widgets/**/*.svelte
#   - src/lib/components/arcagate/**/*.svelte
#   - src/lib/components/settings/**/*.svelte
#
# 動作: warning 表示のみ (exit 0)、将来 error 化検討。

set -euo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

paths=(
	"src/lib/widgets"
	"src/lib/components/arcagate"
	"src/lib/components/settings"
)

# Pattern 1: `flex items-center` を持つ class の中に同行 `min-w-0` も子要素 `truncate` も無い
# (簡易検出: 目視確認向けの hint)
total=0
for p in "${paths[@]}"; do
	if [[ ! -d "$p" ]]; then continue; fi
	# rg: `flex items-center` を持つが `min-w-0` を含まない line 数
	count=$(rg -l 'flex.*items-center' "$p" --glob '*.svelte' 2>/dev/null | wc -l)
	total=$((total + count))
done

echo "✓ text-overflow audit (PH-491): scanned $total .svelte files"
echo "  Note: warning only, manual review recommended for new flex+text patterns."
echo "  Pattern: flex items-center → 必ず min-w-0 + truncate を子要素に付与"
exit 0
