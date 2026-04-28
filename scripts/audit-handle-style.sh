#!/usr/bin/env bash
# PH-issue-001: Widget handle 視覚規格の機械検証 audit
#
# 引用元 guideline:
# - docs/l0_ideas/arcagate-visual-language.md 「過度に派手 NG / よく磨かれた工具」
# - docs/desktop_ui_ux_agent_rules.md P11 (装飾は対象を邪魔しない)
# - docs/l1_requirements/ux_standards.md §6-1 / §13 (Widget 編集モード規格)
#
# 過去 batch-107/108/109 で派手 destructive 丸ボタンが繰り返し出現 → user fb
# 「ださい / 普通そう実装しないでしょう」で 2026-04-28 hard rollback 実施。
# 本 audit は同 pattern が再発しないよう機械検出する。
#
# 検出する pattern:
#   1. `rounded-full bg-destructive` (派手な丸 destructive button)
#      → ghost variant (`hover:bg-destructive/10` + `hover:text-destructive`) を使うこと
#   2. ` bg-destructive/80` (透過 destructive を hover 以外で使う)
#      → ghost variant の hover 以外では destructive 背景を持たないこと

set -euo pipefail

VIOLATIONS=0

# Pattern 1: 派手丸 destructive button (常時 destructive 背景の rounded-full、hover 限定 destructive は許容)
# 行内に rounded-full + bare bg-destructive (hover:/focus:/active: prefix なし) がある場合のみ flag
PATTERN1=$(
  grep -rn 'rounded-full' src/ 2>/dev/null \
    | grep -E '[^a-z:-]bg-destructive(/[0-9]+)?(\b|")' \
    || true
)
if [ -n "$PATTERN1" ]; then
  echo "ERROR: 派手 'rounded-full bg-destructive' button が検出されました"
  echo "  → ghost variant に変更してください (hover で bg-destructive/10、§6-4 参照)"
  echo "$PATTERN1"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# Pattern 2: 透過 destructive 背景を hover 以外で使用 (大きな面積で常時 destructive 色は派手すぎる)
# hover:bg-destructive または hover:bg-destructive/N は許容、それ以外は要レビュー
PATTERN2=$(grep -rnE '(^|[^:])bg-destructive/[0-9]' src/ 2>/dev/null | grep -v 'hover:bg-destructive' || true)
if [ -n "$PATTERN2" ]; then
  echo "WARNING: 'bg-destructive/N' (常時 destructive 透過背景) が検出されました"
  echo "  → hover 時のみ destructive 色を出すか、ghost variant を使ってください"
  echo "$PATTERN2"
  # warning のみで violation カウントしない (運用側に判断委ねる)
fi

if [ "$VIOLATIONS" -gt 0 ]; then
  echo
  echo "audit-handle-style: $VIOLATIONS 件の violation"
  echo "参照: docs/l1_requirements/ux_standards.md §6-1 / §13"
  exit 1
fi

echo "✓ audit-handle-style: violations 0"
exit 0
