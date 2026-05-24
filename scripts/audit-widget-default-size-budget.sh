#!/usr/bin/env bash
# audit-widget-default-size-budget.sh
#
# PH-CF-1100 ④ 機械検出: widget 初期サイズ (defaultSize) が「配置しづらい大きさ」 に膨れて
# regress するのを防ぐ。 user 検収 (2026-05-25) で「全部でかすぎる」 と指摘された 4×4 を
# 上限として禁止し、 cap (w<=3, h<=3) を超える defaultSize は audit fail。
#
# 引用元 guideline:
#   docs/l2_foundation/features/widgets/_default-size-budget.md
#   docs/l2_foundation/features/screens/workspace.md §widget defaultSize 上限
#
# 検出:
#   src/lib/widgets/*/index.ts の `defaultSize: { w: N, h: M }` で N>3 または M>3 を fail。

set -euo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

VIOLATIONS=0
BUDGET_W=3
BUDGET_H=3

# `defaultSize: { w: 4, h: 4 }` のような pattern を file ごとに extract。
# multi-line にはしないが、 全 widget registry は単一行で記述する規約 (現状 16 file 全部 1 行)。
while IFS= read -r line; do
  # line = "src/lib/widgets/<kind>/index.ts:NN:	defaultSize: { w: N, h: M },"
  file=$(echo "$line" | cut -d: -f1)
  lineno=$(echo "$line" | cut -d: -f2)
  w=$(echo "$line" | grep -oE 'w:\s*[0-9]+' | grep -oE '[0-9]+')
  h=$(echo "$line" | grep -oE 'h:\s*[0-9]+' | grep -oE '[0-9]+')
  if [ -z "$w" ] || [ -z "$h" ]; then
    continue
  fi
  if [ "$w" -gt "$BUDGET_W" ] || [ "$h" -gt "$BUDGET_H" ]; then
    echo "ERROR: $file:$lineno  defaultSize w=$w h=$h が予算 (w<=$BUDGET_W, h<=$BUDGET_H) を超過"
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
done < <(grep -rnE --include='index.ts' 'defaultSize:\s*\{\s*w:\s*[0-9]+,\s*h:\s*[0-9]+' src/lib/widgets/ 2>/dev/null || true)

# 追加チェック: workspace-widgets.svelte.ts の `addWidget` で effectiveCols 計算に
# `widgetMaxRight` を再導入していないか。 旧 `Math.max(1, opts.cols ?? DEFAULT_GRID_COLS, widgetMaxRight)`
# が「右に異常に伸びる」 真因だったため (PH-CF-1100 ④ root cause)、 viewport cols を厳格に守る
# 形に修正済。 widgetMaxRight 引数を含む Math.max は禁止 (overlap 判定の障害物として残すのは可)。
EFFCOLS_RE=$(
  grep -nE 'effectiveCols\s*=\s*Math\.max\([^)]*widgetMaxRight' \
    src/lib/state/workspace-widgets.svelte.ts 2>/dev/null || true
)
if [ -n "$EFFCOLS_RE" ]; then
  echo "ERROR: effectiveCols 計算に widgetMaxRight を含めると「右に異常に伸びる」 (PH-CF-1100 ④) が再発します"
  echo "  → viewport cols のみで cap し、 viewport 外既存 widget は overlap 判定のみで使う"
  echo
  echo "$EFFCOLS_RE"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

if [ "$VIOLATIONS" -gt 0 ]; then
  echo
  echo "audit-widget-default-size-budget: $VIOLATIONS violation(s)"
  echo "  → defaultSize 予算 (w<=$BUDGET_W, h<=$BUDGET_H) は user 検収 (2026-05-25 PH-CF-1100 ④) で確定。"
  echo "  → user は配置後に resize で個別拡大可能。 初回配置占有面積を抑えることが優先。"
  exit 1
fi

echo "audit-widget-default-size-budget: OK (全 widget defaultSize <= ${BUDGET_W}x${BUDGET_H} + effectiveCols strict)"
exit 0
