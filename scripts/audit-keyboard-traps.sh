#!/usr/bin/env bash
# audit-keyboard-traps.sh
#
# R8-4 G1 keyboard 全機能到達 audit。
# キーボードで到達不能な「interactive な要素」 (= clickable だが tabindex/role 欠如) を検出する。
#
# 検出対象:
#  1. <div onclick=...> で role/tabindex 両方ともなし
#  2. <span onclick=...> で role/tabindex 両方ともなし
#  3. <a> で href も role も持たない (anchor として focus 不可)
#
# scope: src/lib/**/*.svelte
# 除外: src/lib/components/ui/ (shadcn-svelte scaffold、手動編集禁止)

set -euo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

# 違反行 (file:line:content) を収集する。1 行 grep で抽出した上で、
# 同行に role= か tabindex= が含まれない場合のみ違反。
collect_div_span_violations() {
	# pattern: <div ...onclick=... または <span ...onclick=...
	local hits
	hits=$(grep -rEn --include="*.svelte" '<(div|span)[^>]*onclick=' src/lib 2>/dev/null \
		| grep -v "src/lib/components/ui/" \
		| grep -vE 'role=|tabindex=' \
		|| true)
	echo "$hits"
}

collect_a_without_href() {
	# pattern: <a ...> (no href、no role、no onclick で focus 不能)
	local hits
	hits=$(grep -rEn --include="*.svelte" '<a[[:space:]][^>]*>' src/lib 2>/dev/null \
		| grep -v "src/lib/components/ui/" \
		| grep -vE 'href=|role=|onclick=' \
		|| true)
	echo "$hits"
}

div_violations=$(collect_div_span_violations)
a_violations=$(collect_a_without_href)

total_violations=0
if [ -n "$div_violations" ]; then
	count=$(printf "%s\n" "$div_violations" | grep -c '' || true)
	total_violations=$((total_violations + count))
	echo "ERROR: $count <div|span onclick> without role/tabindex (= keyboard 到達不能):"
	echo "$div_violations"
	echo
fi

if [ -n "$a_violations" ]; then
	count=$(printf "%s\n" "$a_violations" | grep -c '' || true)
	total_violations=$((total_violations + count))
	echo "ERROR: $count <a> without href/role/onclick (= focus 不能):"
	echo "$a_violations"
	echo
fi

if [ "$total_violations" -gt 0 ]; then
	echo "Total keyboard reach violations: $total_violations"
	exit 1
fi

echo "✓ audit-keyboard-traps: 0 violations"
