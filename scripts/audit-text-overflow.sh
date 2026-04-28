#!/usr/bin/env bash
# PH-issue-016: アイコン+文字列はみ出し audit
#
# 引用元 guideline:
# - docs/l1_requirements/ux_standards.md §6-1 (header / list-row layout 仕様)
# - docs/l1_requirements/ux_standards.md §9 truncate ルール
# - docs/desktop_ui_ux_agent_rules.md P11 (装飾より対象) / P12 (整合性)
#
# 検出する pattern:
#   1. `class="...flex-1...truncate..."` の同一 class 文字列で `min-w-0` を欠く
#      → flex item (flex-1) が truncate を実効化するには min-w-0 必須 (lessons.md パターン)
#
# 注:
#   - flex-1 + truncate + min-w-0 の 3 点セットが基本
#   - flex-1 と truncate を別 class string に分けてる場合は誤検知を避けるため対象外
#     (この audit は同一要素の class 文字列内のみを scan)

set -euo pipefail

VIOLATIONS=0

# Pattern: 同一 class 文字列で flex-1 と truncate を持ちながら min-w-0 を欠く要素
# rg / grep で multiline class を扱えないので class="..." 1 行に収まっているケースのみ検出
RAW=$(
  grep -rnE 'class=("|'\'')[^"'\'']*\bflex-1\b[^"'\'']*\btruncate\b[^"'\'']*\1' src/ 2>/dev/null \
    | grep -vE 'min-w-0' \
    || true
)
if [ -n "$RAW" ]; then
  echo "ERROR: flex-1 + truncate を持つ要素に min-w-0 が無い"
  echo "  → flex item の truncate は min-w-0 と組み合わせて初めて実効化します"
  echo "  → docs/l1_requirements/ux_standards.md §6-1 list-row layout 仕様"
  echo "$RAW"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# Pattern 2: 逆順 (truncate ... flex-1) も同様に検出
RAW2=$(
  grep -rnE 'class=("|'\'')[^"'\'']*\btruncate\b[^"'\'']*\bflex-1\b[^"'\'']*\1' src/ 2>/dev/null \
    | grep -vE 'min-w-0' \
    || true
)
if [ -n "$RAW2" ]; then
  echo "ERROR: truncate + flex-1 を持つ要素に min-w-0 が無い (逆順検出)"
  echo "$RAW2"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

if [ "$VIOLATIONS" -gt 0 ]; then
  echo
  echo "audit-text-overflow: $VIOLATIONS 件の violation"
  echo "参照: docs/l1_requirements/ux_standards.md §6-1 / §9"
  exit 1
fi

echo "✓ audit-text-overflow: violations 0"
exit 0
