#!/usr/bin/env bash
# audit-widget-settings-schema.sh
# PH-issue-021 / 根本原因 retrospective: widget の SettingsContent registry
# (`src/lib/widgets/<type>/index.ts`) が「config schema と一致する Settings
# component」を指しているかを検証。
#
# 失敗パターン (PR #252 / #262 で 3 widget が引き当たった):
#   - ItemWidget config = { item_id }, registered SettingsContent = CommonMaxItemsSettings (max_items 不在)
#   - DailyTaskWidget config = { tasks, hideCompleted, title }, registered = CommonMaxItemsSettings
#   - SnippetWidget config = { snippets, title }, registered = CommonMaxItemsSettings
# → user 「Settings 画面が壊れたまま」で発覚
#
# 検出ルール (heuristic):
#   - widget 本体 (.svelte) が parseWidgetConfig を使っているなら、その config schema の field 集合を取り出す
#   - widget の index.ts で SettingsContent: <Component> を取り出す
#   - <Component>.svelte が "config:" interface で持つ field 集合を取り出す
#   - widget 本体 schema ⊇ Settings の touch field 集合 でないと fail
#
# 簡易版: index.ts で SettingsContent: CommonMaxItemsSettings を指している場合、
# widget 本体が max_items を実際に config として読んでいるかチェック。

set -euo pipefail

VIOLATIONS=0
WIDGET_DIR="src/lib/widgets"

# CommonMaxItemsSettings を使っている widget を列挙
mapfile -t COMMON_USERS < <(grep -l "SettingsContent: CommonMaxItemsSettings" "$WIDGET_DIR"/*/index.ts 2>/dev/null || true)

for indexfile in "${COMMON_USERS[@]}"; do
  dir=$(dirname "$indexfile")
  widget=$(basename "$dir")
  # 本体 .svelte で max_items を実際に config 経由で読んでいるか
  body=$(find "$dir" -maxdepth 1 -name "*Widget.svelte" -not -name "*Settings.svelte" | head -1)
  if [ -z "$body" ]; then
    continue
  fi
  if ! grep -q "max_items" "$body"; then
    echo "❌ [$widget] index.ts は SettingsContent=CommonMaxItemsSettings を指すが、widget 本体が max_items を使っていない"
    echo "   → CommonMaxItemsSettings.svelte は max_items + sort_field を編集する。schema 不一致 → PR #252 と同 class のバグ"
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
done

if [ "$VIOLATIONS" -eq 0 ]; then
  echo "✓ audit-widget-settings-schema: violations 0"
  exit 0
else
  echo ""
  echo "❌ Violations: $VIOLATIONS — widget の index.ts と本体の config schema が一致していない"
  echo "   修正方法: 専用 *Settings.svelte を作って index.ts に登録する (例 ItemSettings / DailyTaskSettings / SnippetSettings)"
  exit 1
fi
