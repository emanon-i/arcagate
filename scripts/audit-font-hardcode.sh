#!/usr/bin/env bash
# PH-issue-007: フォントサイズ ハードコード検出 audit
#
# 引用元 guideline:
# - docs/l1_requirements/ux_standards.md §4-2 タイポグラフィスケール
# - docs/desktop_ui_ux_agent_rules.md P12 (整合性)
# - docs/lessons.md "Guideline doc 不活用が劣化の主因"
#
# 過去 PH-475 (batch-107) で `--text-ag-xs: 11px` 等を新設して全 widget に
# 一斉適用した結果、Tailwind default (text-xs = 12px) との差で「全体的に劣化」
# user fb を受けた。本 audit は font-size の数値ハードコードを禁止することで
# 同種の過剰反応を再発させない (Tailwind default class 経由のみ許容)。
#
# 検出する pattern:
#   1. `text-[NNpx]` / `text-[NNrem]` / `text-[NNem]` 等の Tailwind 任意値クラス
#      → text-xs / text-sm / text-base / text-lg 等の default class を使うこと
#   2. `style="font-size: ..."` / `style='font-size: ...'` の inline style 直書き
#      → Tailwind class または `--ag-*` token 経由にすること

set -euo pipefail

VIOLATIONS=0

# Pattern 1: Tailwind 任意値の font-size class (text-[Npx] / text-[Nrem] / text-[Nem])
# 例: `text-[11px]` `text-[0.7rem]`
PATTERN1=$(
  grep -rnE 'text-\[\s*[0-9]+(\.[0-9]+)?(px|rem|em)\s*\]' src/ 2>/dev/null \
    || true
)
if [ -n "$PATTERN1" ]; then
  echo "ERROR: Tailwind 任意値 font-size class が検出されました"
  echo "  → text-xs / text-sm / text-base / text-lg 等の default class を使ってください"
  echo "  (§4-2 タイポグラフィスケール: ハードコード禁止、Tailwind class 経由)"
  echo "$PATTERN1"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# Pattern 2: inline style での font-size 直書き
# 例: `style="font-size: 13px"` `style='font-size:1rem'`
PATTERN2=$(
  grep -rnE 'style=["\x27][^"\x27]*font-size\s*:' src/ 2>/dev/null \
    || true
)
if [ -n "$PATTERN2" ]; then
  echo "ERROR: inline style での font-size 直書きが検出されました"
  echo "  → Tailwind class または var(--ag-*) token を使ってください"
  echo "$PATTERN2"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

if [ "$VIOLATIONS" -gt 0 ]; then
  echo
  echo "audit-font-hardcode: $VIOLATIONS 件の violation"
  echo "参照: docs/l1_requirements/ux_standards.md §4-2"
  exit 1
fi

echo "✓ audit-font-hardcode: violations 0"
exit 0
