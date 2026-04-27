#!/usr/bin/env bash
# audit-text-overflow.sh (PH-501)
#
# widget / panel / button で text overflow が発生しやすいパターンを検出、CI error。
#
# 検出ルール:
#   - .svelte ファイル内で `flex` + items-center/justify-* と一緒に
#     子要素 `flex-1` を持つのに、ファイル内のどこにも
#     `min-w-0` も `truncate` も `break-words` も
#     `overflow-hidden` も `whitespace-nowrap` も無い
#     → 高確率で overflow 違反 (truncate/min-w-0 不在)
#
# 対象 path:
#   - src/lib/widgets/**/*.svelte
#   - src/lib/components/arcagate/**/*.svelte
#   - src/lib/components/settings/**/*.svelte
#
# 動作: 違反 0 → exit 0、違反あり → 一覧出力 + exit 1 (CI fail)
#
# 例外: scope_files に明示的に NO_OVERFLOW_AUDIT_OK comment がある場合は skip

set -euo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

paths=(
	"src/lib/widgets"
	"src/lib/components/arcagate"
	"src/lib/components/settings"
)

violations=()
scanned=0

for p in "${paths[@]}"; do
	if [[ ! -d "$p" ]]; then continue; fi
	while IFS= read -r f; do
		scanned=$((scanned + 1))
		# 例外指定 (overflow audit を意図的に bypass、コメントで明示)
		if grep -q 'NO_OVERFLOW_AUDIT_OK' "$f"; then
			continue
		fi
		# flex container check (flex + items-center や justify-* と一緒の line)
		# Use grep -E for extended regex
		if ! grep -qE 'flex[^"]*\b(items-center|justify-(start|center|end|between|around|evenly))\b' "$f"; then
			continue
		fi
		# flex-1 child check
		if ! grep -qE '\bflex-1\b' "$f"; then
			continue
		fi
		# safety check (min-w-0 / truncate / break-words / overflow-hidden / whitespace-nowrap)
		if grep -qE '\b(min-w-0|truncate|break-words|overflow-hidden|whitespace-nowrap)\b' "$f"; then
			continue
		fi
		# violation
		violations+=("$f")
	done < <(find "$p" -name '*.svelte')
done

if [[ ${#violations[@]} -gt 0 ]]; then
	echo "❌ text-overflow audit (PH-501) FAILED — ${#violations[@]} violations of $scanned scanned"
	for v in "${violations[@]}"; do
		echo "  - $v"
	done
	echo ""
	echo "Fix hint:"
	echo "  - Add 'min-w-0' to flex-1 element (parent flex の direct child)"
	echo "  - Or 'truncate' to text element (1 行省略)"
	echo "  - Or 'break-words' to text container (折返し許可)"
	echo "  - Or 'overflow-hidden' to outer container"
	echo "  - 例外時は scope file 上部に <!-- NO_OVERFLOW_AUDIT_OK: 理由 --> コメントを追加"
	echo "Reference: docs/lessons.md (Svelte 5 reactive + text overflow)"
	exit 1
fi

echo "✓ text-overflow audit (PH-501): scanned $scanned .svelte files, 0 violations"
exit 0
