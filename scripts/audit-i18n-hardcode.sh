#!/usr/bin/env bash
# audit-i18n-hardcode.sh
#
# 多言語化準備 (i18n readiness) 用 audit。日本語 hard-code 文字列の数を計測、
# baseline 記録 + 増加検出 (R9-C で budget gate 化)。
#
# Phase 1 (R7-4): informational のみ
# Phase 2 (R9-C 本 PR): **budget gate** — 現 baseline ≤ MAX_HARDCODE で regression 防止
# Phase 3 (L4): 段階的に MAX_HARDCODE を下げる (実 strings を i18n key へ migrate)
# Phase 4 (L4 完了): hardcoded 0、t() 経由のみ
#
# 計測対象:
#   - svelte / ts のうち user-facing 文字列に該当する行
#   - aria-label="..." / title="..." / >...</tag> 内の日本語
#   - import / class / data-* 等は除外

set -euo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

# budget 推移: R7-4 = 295 → R9-C = 299 → R10-B = 301 (axe Phase 2 fix で aria-label / コメント JP 含む +2)
# R10-C で migration により削減 + MAX 引下げ予定。
MAX_HARDCODE=301

# 日本語文字 (ひらがな + カタカナ + CJK Unified Ideographs) を含む文字列リテラル
ja_pattern='[ぁ-んァ-ヴー一-龯]'

# scope: src/lib (route 直下も含む src/routes)、test 除外、bindings 除外
src_targets=$(find src \( -name "*.svelte" -o -name "*.ts" \) \
	! -path "src/lib/components/ui/*" \
	! -path "src/lib/bindings/*" \
	! -path "*.test.ts" \
	2>/dev/null || true)

# user-facing 日本語 hardcode を検出: aria-label / title / placeholder / >...< 内
ariaCount=0
titleCount=0
placeholderCount=0
visibleCount=0

# grep -c 各 pattern を一括 (file ごとループより速い)、結果を集約
ariaCount=$(printf '%s\n' $src_targets | xargs -r grep -cE "aria-label=\"[^\"]*$ja_pattern" 2>/dev/null | awk -F: '{s+=$NF} END {print s+0}')
titleCount=$(printf '%s\n' $src_targets | xargs -r grep -cE "title=\"[^\"]*$ja_pattern" 2>/dev/null | awk -F: '{s+=$NF} END {print s+0}')
placeholderCount=$(printf '%s\n' $src_targets | xargs -r grep -cE "placeholder=\"[^\"]*$ja_pattern" 2>/dev/null | awk -F: '{s+=$NF} END {print s+0}')
visibleCount=$(printf '%s\n' $src_targets | xargs -r grep -cE ">[^<>]*$ja_pattern[^<>]*<" 2>/dev/null | awk -F: '{s+=$NF} END {print s+0}')

total=$((ariaCount + titleCount + placeholderCount + visibleCount))

echo "i18n hardcode count (R9-C budget gate phase 2):"
echo "  aria-label:    $ariaCount"
echo "  title:         $titleCount"
echo "  placeholder:   $placeholderCount"
echo "  text content:  $visibleCount"
echo "  total:         $total / MAX_HARDCODE=$MAX_HARDCODE"
echo ""

if [ "$total" -gt "$MAX_HARDCODE" ]; then
	echo "ERROR: i18n hardcode budget exceeded ($total > $MAX_HARDCODE)"
	echo ""
	echo "新規 hardcoded 日本語文字列が追加されました。次のいずれかの対応を:"
	echo "  1. 既存 hardcoded 文字列を共通 module に集約 (i18n key 化)、MAX_HARDCODE を下げる"
	echo "  2. やむを得ず新規追加する場合は scripts/audit-i18n-hardcode.sh の MAX_HARDCODE を更新"
	echo ""
	echo "L4 多言語化フェーズの目標: MAX_HARDCODE = 0、全文字列を t() 経由に置換"
	exit 1
fi

echo "✓ audit-i18n-hardcode: budget OK ($total ≤ $MAX_HARDCODE)"
exit 0
