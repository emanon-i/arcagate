#!/usr/bin/env bash
# PH-issue-012: 横スクロールバー禁止 audit
#
# 引用元 guideline:
# - docs/l1_requirements/ux_standards.md §10 スクロール・レイアウトルール
# - docs/desktop_ui_ux_agent_rules.md P11 (装飾より対象)
# - docs/lessons.md「flex/grid h-full 伝播 + min-w-0 必須パターン」
#
# 検出する pattern:
#   widget 内 (src/lib/widgets/) で `overflow-x-auto` / `overflow-x-scroll`
#   または `overflow-x:\s*(auto|scroll)` を使用している箇所
#
# Workspace Canvas 等の大枠コンテナは scope 外 (横 scroll は意図的)。

set -euo pipefail

VIOLATIONS=0

# Tailwind class形式 (overflow-x-auto / overflow-x-scroll) を src/lib/widgets/ で検出
TW=$(
  grep -rnE 'overflow-x-(auto|scroll)' src/lib/widgets/ 2>/dev/null \
    || true
)
if [ -n "$TW" ]; then
  echo "ERROR: widget 内で横スクロールバー (overflow-x-auto/scroll) が検出されました"
  echo "  → text は truncate / line-clamp で吸収、横 scrollbar は noise (§10 / P11)"
  echo "$TW"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# inline CSS 形式 (overflow-x: auto) を src/lib/widgets/ で検出
INLINE=$(
  grep -rnE 'overflow-x:\s*(auto|scroll)' src/lib/widgets/ 2>/dev/null \
    || true
)
if [ -n "$INLINE" ]; then
  echo "ERROR: widget 内で inline overflow-x: auto/scroll が検出されました"
  echo "$INLINE"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

if [ "$VIOLATIONS" -gt 0 ]; then
  echo
  echo "audit-no-horizontal-scrollbar: $VIOLATIONS 件の violation"
  echo "参照: docs/l1_requirements/ux_standards.md §10"
  exit 1
fi

echo "✓ audit-no-horizontal-scrollbar: violations 0"
exit 0
