#!/usr/bin/env bash
# audit-font-tokens.sh (PH-475)
#
# widget 配下で Tailwind の text-{xs,sm,base,lg,xl,2xl} 直書きや
# text-[Npx] 任意サイズを検出し、1 件でも見つかれば exit 1。
#
# 新仕様: text-ag-{xs,sm,md,lg,xl,2xl} (CSS var --ag-font-* 経由) のみ許可。
#
# 検出対象:
#   - src/lib/widgets/**/*.svelte
#   - src/lib/components/arcagate/common/WidgetShell.svelte (widget 共通枠)
#
# 除外:
#   - text-ag-* (新 token)
#   - text-{primary,secondary,muted,accent,destructive} (color、サイズではない)
#   - 単語境界で text-base 等の固有名詞 / variable 名はマッチしない (rg word boundary)

set -euo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

paths=(
	"src/lib/widgets"
	"src/lib/components/arcagate/common/WidgetShell.svelte"
)

# Tailwind 直サイズ class (ag- prefix なし)
# rg pattern: \btext-(xs|sm|base|lg|xl|2xl)\b
size_pattern='\btext-(xs|sm|base|lg|xl|2xl)\b'
# px 直書き: text-[14px] / text-[1rem]
arbitrary_pattern='text-\[[0-9.]+(px|rem|em)\]'

violations=0
for p in "${paths[@]}"; do
	if [[ ! -e "$p" ]]; then continue; fi
	if found=$(rg -n -e "$size_pattern" -e "$arbitrary_pattern" "$p" 2>/dev/null); then
		echo "❌ Font token violation in $p:" >&2
		echo "$found" >&2
		violations=$((violations + 1))
	fi
done

if (( violations > 0 )); then
	echo "" >&2
	echo "Use text-ag-{xs,sm,md,lg,xl,2xl} instead (defined in arcagate-theme.css + app.css @theme inline)" >&2
	exit 1
fi

echo "✓ font tokens audit passed (no Tailwind size class hardcode in widgets)"
