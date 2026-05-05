#!/usr/bin/env bash
# audit-i18n-hardcode.sh
#
# 多言語化準備 (i18n readiness) 用 audit。日本語 hard-code 文字列の数を計測、
# baseline 記録 + 増加検出。
#
# 現 phase は **日本語固定** で意図的、release blocker でない。
# 本 audit は CI で WARN 表示するだけで exit 0 (gate ではない)。
# 多言語化を始めるとき (L4) に **新規追加分のみ** を i18n key 化する gate に転換可能。
#
# 計測対象:
#   - svelte / ts のうち user-facing 文字列に該当する行
#   - aria-label="..." / title="..." / >...</tag> 内の日本語
#   - import / class / data-* 等は除外

set -euo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

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

echo "i18n hardcode baseline (日本語固定 phase、informational のみ):"
echo "  aria-label:    $ariaCount"
echo "  title:         $titleCount"
echo "  placeholder:   $placeholderCount"
echo "  text content:  $visibleCount"
echo "  total:         $total"
echo ""
echo "現 phase は日本語固定で意図的、本 audit は計測のみ (gate ではない)。"
echo "L4 多言語化フェーズで i18n key 集約を始めるとき、本 audit を gate 化:"
echo "  - 既存数を baseline に記録 (docs/l1_requirements/release-readiness/measurements/i18n-baseline.md)"
echo "  - 新規 PR で増加検出 → 新規分は i18n key 経由を強制"
exit 0
