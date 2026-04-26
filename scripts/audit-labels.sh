#!/usr/bin/env bash
# audit-labels.sh
#
# button / chip / link の aria-label と children text に Lucide アイコン名・
# 記号名がそのまま使われていないか検出する。
#
# CLAUDE.md「ラベルはアイコン名ではなく機能 / 状態 / アクションを書く」原則の機械化。
# false positive を減らすため、検出は src/lib/components/ + src/routes に限定する
# （icons.ts や型定義の中のアイコン名は除外）。

set -euo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

# 引数があればその対象だけスキャン（pre-commit 用にステージングファイル個別対応）
TARGETS=("$@")
if [ ${#TARGETS[@]} -eq 0 ]; then
	TARGETS=("src/lib/components" "src/routes")
fi

# 違反らしいパターン（lucide icon 名 / 記号名のみのラベル）
PATTERNS=(
	# 漢字 / 記号一致
	'aria-label="(星|スター)"'
	'aria-label="(三本線|ハンバーガー)"'
	'aria-label="(プラス|＋)"'
	'aria-label="(虫眼鏡)"'
	'aria-label="(ゴミ箱)"'
	'aria-label="(歯車)"'
	'aria-label="(チェック)"'
	'aria-label="(矢印)"'
	# Lucide icon 名そのまま
	'aria-label="(Star|Plus|X|Trash|Pencil|Settings|Search|Folder|File|Check|Clock|Activity|Clipboard|Menu|MoreHorizontal|MoreVertical|Edit)"'
	# 表示テキストもアイコン名そのまま
	'>\s*(Star|Plus|X|Trash|Pencil|Settings|Search|Folder|File|Check|Clock|Activity|Clipboard|Menu)\s*</'
	# 記号テキスト直
	'>(★|☆|●|○|◯|▼|▲|✕|＋|×)</'
)

VIOLATIONS=0
for p in "${PATTERNS[@]}"; do
	combined=""
	for t in "${TARGETS[@]}"; do
		if [ -e "$t" ]; then
			m=$(grep -rnE "$p" "$t" --include='*.svelte' --include='*.ts' --include='*.tsx' 2>/dev/null || true)
			if [ -n "$m" ]; then
				combined+="$m"$'\n'
			fi
		fi
	done
	if [ -n "$combined" ]; then
		echo "❌ ラベル原則違反候補: $p"
		echo "$combined" | head -5
		count=$(echo "$combined" | grep -c . || true)
		VIOLATIONS=$((VIOLATIONS + count))
		echo ""
	fi
done

if [ "$VIOLATIONS" -eq 0 ]; then
	echo "✔️ ラベル原則違反ゼロ"
	exit 0
else
	echo "❌ 計 $VIOLATIONS 件の違反候補。aria-label / 表示テキストは機能 / 状態 / アクションを書くこと。"
	exit 1
fi
