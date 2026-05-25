#!/usr/bin/env bash
# audit-widget-context-opener.sh (PH-CF-1200 ⑨)
# Workspace widget の context menu opener 伝播契約を grep で機械検出する。
#
# 契約:
#   widget 内アイテムの click 経路で `launchItemWithCascade(..., { widgetDefaultOpenerId: ... })`
#   を呼ぶ widget は、 同 component の `workspaceContextMenuStore.openMenuFor(...)` 呼出にも
#   `widgetDefaultOpenerId: ...` を渡す必要がある。
#
# 理由:
#   右クリック「デフォルトアプリで開く」 (`WidgetItemContextMenu.handleLaunchDefault`) が
#   widget opener を尊重するためには `openMenuFor` 経由で widget の opener id を渡す必要がある。
#   片方だけ書くと「click では widget opener、 右クリックでは ignore」 で挙動が食い違う bug を
#   起こす (PH-CF-1200 ⑨ root cause)。
#
# scope:
#   src/lib/widgets/ 配下の widget component (svelte) を全件走査。
#   _shared/WidgetItemContextMenu.svelte 自身は中継先なので除外。

set -euo pipefail

violations=0

echo "→ audit-widget-context-opener: widget の opener 伝播契約をチェック"

WIDGETS_DIR="src/lib/widgets"

# launchItemWithCascade に widgetDefaultOpenerId を渡している file を抽出
mapfile -t opener_widgets < <(grep -rEl 'launchItemWithCascade\([^)]*widgetDefaultOpenerId' \
	"$WIDGETS_DIR" 2>/dev/null | grep -v '_shared/WidgetItemContextMenu.svelte' || true)

if [ ${#opener_widgets[@]} -eq 0 ]; then
	echo "  ⚠️ no widget passes widgetDefaultOpenerId to launchItemWithCascade (unexpected for current era)"
fi

for f in "${opener_widgets[@]}"; do
	rel="${f#./}"

	# 同 file に workspaceContextMenuStore.openMenuFor 呼出があるか確認
	if ! grep -q 'workspaceContextMenuStore\.openMenuFor' "$f"; then
		# context menu を開かない widget もあり得る (settings-only など)。
		# その場合は opener 伝播の問題は発生しない (info 表示)。
		echo "  - $rel: no openMenuFor call (skip)"
		continue
	fi

	# openMenuFor 全呼出ブロックで widgetDefaultOpenerId が出現するか確認。
	# 1 file に複数の openMenuFor 呼出があり得る (例: ExeFolder list / card)。
	# 各呼出を openMenuFor({ から 直近の閉じカッコ + }; まで抽出して個別判定。

	# 一旦荒く: file 内の openMenuFor( 出現回数と、 同 file 内の widgetDefaultOpenerId 出現回数を比較。
	# 厳密には呼出ブロック単位で見るべきだが、 widget はそれぞれ launch 1 + openMenuFor 1〜2 という
	# 単純構造なので、 「openMenuFor の回数 >= widgetDefaultOpenerId の出現で `: config.default_opener_id`
	# / `: ... ?? null` の数」 で十分な近似になる。
	open_count=$(grep -c 'workspaceContextMenuStore\.openMenuFor' "$f")
	prop_count=$(awk '
		/workspaceContextMenuStore\.openMenuFor/ { in_block = 1; depth = 0 }
		in_block {
			# ブロック内に widgetDefaultOpenerId field があるか
			if ($0 ~ /widgetDefaultOpenerId[[:space:]]*:/) { found = 1 }
			for (i = 1; i <= length($0); i++) {
				ch = substr($0, i, 1)
				if (ch == "(") depth++
				else if (ch == ")") {
					depth--
					if (depth == 0) {
						if (found) count++
						in_block = 0; found = 0
						next
					}
				}
			}
		}
		END { print count + 0 }
	' "$f")

	if [ "$prop_count" -lt "$open_count" ]; then
		echo "  ❌ $rel: openMenuFor calls=$open_count but widgetDefaultOpenerId prop set in only $prop_count (PH-CF-1200 ⑨ violation)"
		violations=$((violations + 1))
	else
		echo "  ✓ $rel: openMenuFor propagates widgetDefaultOpenerId ($prop_count / $open_count)"
	fi
done

echo "→ audit-widget-context-opener: WidgetItemContextMenu.handleLaunchDefault が cascade を通すかチェック"

CTX_MENU="src/lib/widgets/_shared/WidgetItemContextMenu.svelte"

# handleLaunchDefault 関数の本体に launchItemWithCascade(item, { widgetDefaultOpenerId 形式の呼出が存在すること
if ! awk '
	/function handleLaunchDefault/ { in_fn = 1; depth = 0 }
	in_fn {
		print
		for (i = 1; i <= length($0); i++) {
			ch = substr($0, i, 1)
			if (ch == "{") depth++
			else if (ch == "}") {
				depth--
				if (depth == 0) { in_fn = 0; exit }
			}
		}
	}
' "$CTX_MENU" | grep -q 'launchItemWithCascade(item.*widgetDefaultOpenerId'; then
	echo "  ❌ $CTX_MENU: handleLaunchDefault must pass widgetDefaultOpenerId to launchItemWithCascade (PH-CF-1200 ⑨)"
	violations=$((violations + 1))
else
	echo "  ✓ $CTX_MENU: handleLaunchDefault forwards widgetDefaultOpenerId"
fi

# WorkspaceLayout が widgetDefaultOpenerId を WidgetItemContextMenu に渡しているか
LAYOUT="src/lib/components/arcagate/workspace/WorkspaceLayout.svelte"
if grep -q 'widgetDefaultOpenerId=' "$LAYOUT"; then
	echo "  ✓ $LAYOUT: forwards widgetDefaultOpenerId to WidgetItemContextMenu"
else
	echo "  ❌ $LAYOUT: missing widgetDefaultOpenerId= forwarding to WidgetItemContextMenu (PH-CF-1200 ⑨)"
	violations=$((violations + 1))
fi

# workspaceContextMenuStore に widgetDefaultOpenerId state が存在
STORE="src/lib/state/workspace-context-menu.svelte.ts"
if grep -q 'widgetDefaultOpenerId' "$STORE"; then
	echo "  ✓ $STORE: holds widgetDefaultOpenerId state"
else
	echo "  ❌ $STORE: missing widgetDefaultOpenerId state (PH-CF-1200 ⑨)"
	violations=$((violations + 1))
fi

if [ "$violations" -eq 0 ]; then
	echo "✓ audit-widget-context-opener: all PH-CF-1200 ⑨ contracts satisfied"
	exit 0
else
	echo "✗ audit-widget-context-opener: $violations violation(s)"
	exit 1
fi
