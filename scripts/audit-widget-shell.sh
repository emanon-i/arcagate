#!/usr/bin/env bash
# audit-widget-shell.sh
# 5/01 user 検収: 全 widget が共通 shell パターンに従っているか機械検証。
#
# 必須 pattern (1 つでも欠けたら fail):
#   1. `import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';`
#   2. `<WidgetShell ...>` で内容を包む
#   3. `widgetMenuItems` helper を使って「設定」 menu を共通化 (ItemWidget の旧形式
#      'アイテムを変更' のような独自 menu を防ぐ)
#   4. `WidgetSettingsDialog` を mount (設定 menu から開く先)
#
# 失敗パターン (PR #275 で 1 件引き当て):
#   - ItemWidget が `widgetMenuItems` を使わず 'アイテムを変更' 独自 menu のみ、
#     `WidgetSettingsDialog` も未 mount → 他 widget と挙動 / 見た目が乖離。
#     → user 「右上の設定ボタンも変ですね。旧形式のまま」 fb で発覚。

set -euo pipefail

# 対象: src/lib/widgets/<type>/<*Widget>.svelte (Settings.svelte は除外)
mapfile -t widgets < <(find src/lib/widgets -maxdepth 2 -name "*Widget.svelte" -not -name "*Settings*.svelte" 2>/dev/null | sort)

violations=0

for f in "${widgets[@]}"; do
	missing=()
	grep -q "import WidgetShell from " "$f" || missing+=("WidgetShell import")
	grep -q "<WidgetShell " "$f" || missing+=("<WidgetShell> usage")
	grep -q "widgetMenuItems(" "$f" || missing+=("widgetMenuItems helper")
	grep -q "WidgetSettingsDialog" "$f" || missing+=("WidgetSettingsDialog")

	if [ ${#missing[@]} -gt 0 ]; then
		echo "❌ $f: missing [${missing[*]}]"
		violations=$((violations + 1))
	fi
done

if [ "$violations" -eq 0 ]; then
	echo "✓ audit-widget-shell: ${#widgets[@]} widgets all use common shell pattern"
	exit 0
else
	echo ""
	echo "❌ Violations: $violations widgets missing common shell elements"
	echo "   修正: 該当 widget で WidgetShell + widgetMenuItems + WidgetSettingsDialog を統一"
	echo "   参照: src/lib/widgets/file-search/FileSearchWidget.svelte (基準実装)"
	exit 1
fi
