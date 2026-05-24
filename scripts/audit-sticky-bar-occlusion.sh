#!/usr/bin/env bash
# audit-sticky-bar-occlusion.sh
#
# PH-CF-500 D1 + PH-CF-1100 ③ 機械検出: widget 内 sort/filter/search toolbar の構造契約。
#
# 経緯:
#   PR #535 → #536 → #563 (PH-CF-500 D1) → PR #566 と「sticky bar 色付き帯 vs 透けめり込み」 を
#   半透明 token (`--ag-sticky-bar-bg`) で繰り返し調整したが、 user 検収 (2026-05-25 PH-CF-1100 ③)
#   で「色付き帯が再発」 と再指摘。 token + class の半透明 token 経由デザインでは active 表示の
#   bg fill や theme 別 token 値が回帰しやすく、 audit がそこまで検出できなかった。
#
#   PH-CF-1100 ③ で構造を変更: widget 内 toolbar (並び替え / 検索 / view mode 等) は
#   `WidgetShell.toolbar` snippet slot で scroll container の **外** に静的配置する。
#   sticky 配置 + 半透明 fill 自体が不要になり、 「色付き帯」 も「めり込み」 も構造上発生しない。
#
# 引用元 guideline:
#   docs/l2_foundation/features/widgets/_chrome-consistency.md §A6 (toolbar 契約)
#
# 検出 (= fail):
#   Pattern A: `--ag-sticky-bar-bg` token を CSS で再定義 (= 撤廃済 token を復活)。
#   Pattern B: `.ag-sticky-bar` class を src/ で再使用 (= 撤廃済 class を復活)。
#   Pattern C: ag-sticky-bar 子要素の active 表示で `'bg-[var(--ag-surface-*)]'`
#              を使う pattern (= 色付き帯の真因。 もし sticky bar 構造が復活した場合の double check)。

set -euo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

VIOLATIONS=0

# Pattern A: token 定義の再導入
TOKEN_VIOLATIONS=$(
  grep -rnE --include='*.css' \
    '^\s*--ag-sticky-bar-bg\s*:' \
    src/ 2>/dev/null || true
)
if [ -n "$TOKEN_VIOLATIONS" ]; then
  echo "ERROR (Pattern A): --ag-sticky-bar-bg token が再定義されています"
  echo "  → PH-CF-1100 ③ で撤廃済。 widget 内 toolbar は WidgetShell.toolbar snippet を使う"
  echo "  → 「色付き帯 vs 透けめり込み」 のジレンマを構造で解消した契約。 半透明 token を復活させない"
  echo
  echo "$TOKEN_VIOLATIONS"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# Pattern B: .ag-sticky-bar class の再使用 (svelte template / css 両方)。
# comment 行 (Svelte `<!--` / TS `//` / CSS `/* ... */` 内 mention) は除外。
# class=" ... ag-sticky-bar ... " (Svelte template) と {} 直前の CSS selector のみ violation。
CLASS_VIOLATIONS=$(
  {
    grep -rnE --include='*.svelte' 'class="[^"]*\bag-sticky-bar\b' src/ 2>/dev/null || true
    grep -rnE --include='*.css' '\.ag-sticky-bar\s*[\{,]' src/ 2>/dev/null || true
  }
)
if [ -n "$CLASS_VIOLATIONS" ]; then
  echo "ERROR (Pattern B): .ag-sticky-bar class が src/ で再使用されています"
  echo "  → PH-CF-1100 ③ で撤廃済。 widget 内 toolbar は WidgetShell.toolbar snippet を使う"
  echo
  echo "$CLASS_VIOLATIONS"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# Pattern C (defense in depth): もし ag-sticky-bar 構造が復活した場合、 active 表示の
# `'bg-[var(--ag-surface-*)] text-[var(--ag-text-*)]'` (= 色付き帯の真因) を block する。
STICKY_FILES=$(grep -rlE --include='*.svelte' 'class="[^"]*\bag-sticky-bar\b' src/ 2>/dev/null || true)
ACTIVE_BG_VIOLATIONS=""
for f in $STICKY_FILES; do
  hits=$(grep -nE "'bg-\[var\(--ag-surface-[0-9]+\)\] text-\[var\(--ag-text-" "$f" 2>/dev/null || true)
  if [ -n "$hits" ]; then
    ACTIVE_BG_VIOLATIONS+="$f:"$'\n'"$hits"$'\n'
  fi
done
if [ -n "$ACTIVE_BG_VIOLATIONS" ]; then
  echo "ERROR (Pattern C): ag-sticky-bar 子要素で active 表示に bg-[var(--ag-surface-*)] を使っています"
  echo "  → sticky bar 構造の復活も基本 NG だが、 active 表示の bg fill は二重に禁止"
  echo "  → active 表示は accent text + font-semibold のみで表現"
  echo
  echo "$ACTIVE_BG_VIOLATIONS"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

if [ "$VIOLATIONS" -gt 0 ]; then
  echo
  echo "audit-sticky-bar-occlusion: FAIL"
  echo "参照: docs/l2_foundation/features/widgets/_chrome-consistency.md §A6 (toolbar 契約)"
  exit 1
fi

echo "audit-sticky-bar-occlusion: OK (ag-sticky-bar token/class 共に src/ から消滅)"
exit 0
