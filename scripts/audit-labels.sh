#!/usr/bin/env bash
# audit-labels.sh
#
# button / chip / link の aria-label と children text にアイコン名・記号名が
# そのまま使われていないか grep で検出する簡易スクリプト。
#
# CLAUDE.md「ラベルはアイコン名ではなく機能 / 状態 / アクションを書く」原則の機械化。
#
# false positive あり（textarea や aria-label="星座" のような正当な用法）。
# 違反らしき箇所は手動で確認、機能ラベルに直す。

set -euo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

# 違反らしいパターン（lucide icon 名 / 記号名）
PATTERNS=(
	'aria-label="(星|スター|Star)"'
	'aria-label="(三本線|ハンバーガー|Menu)"'
	'aria-label="(プラス|Plus|＋)"'
	'aria-label="(虫眼鏡|Search)"'
	'aria-label="(ゴミ箱|Trash)"'
	'aria-label="(歯車|Gear|Settings)"'
	'aria-label="(チェック|Check)"'
	'aria-label="(矢印|Arrow)"'
	'>(★|☆|●|○|◯|▼|▲|✕)</'
	'>(Star|Trash|Settings)\s*</'
)

VIOLATIONS=0
for p in "${PATTERNS[@]}"; do
	matches=$(grep -rnE "$p" src/ 2>/dev/null || true)
	if [ -n "$matches" ]; then
		echo "❌ ラベル原則違反候補: $p"
		echo "$matches" | head -5
		VIOLATIONS=$((VIOLATIONS + $(echo "$matches" | wc -l)))
		echo ""
	fi
done

if [ "$VIOLATIONS" -eq 0 ]; then
	echo "✔️ ラベル原則違反ゼロ（grep ベース、false negative ありえる）"
	exit 0
else
	echo "❌ 計 $VIOLATIONS 件の違反候補が見つかった。手動で確認してください。"
	exit 1
fi
