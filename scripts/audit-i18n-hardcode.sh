#!/usr/bin/env bash
# audit-i18n-hardcode.sh
#
# 多言語化準備 (i18n readiness) 用 audit。日本語 hard-code 文字列の数を計測 + i18n key parity check。
#
# Phase 1 (R7-4): informational のみ
# Phase 2 (R9-C): **budget gate** — 現 baseline ≤ MAX_HARDCODE で regression 防止
# Phase 3 (2026-05-14〜): 統合戦略 area 1-9 で 大量 callsite を t() 化、 MAX を段階的に引下げ
# Phase 4 (2026-05-15 本 PR): + messages_{ja,en}.json key parity check 追加
# Phase 5 (今後): hardcoded 0 を目指す (全文字列 t() 経由)
#
# 計測対象:
#   - svelte / ts のうち user-facing 文字列に該当する行
#   - aria-label="..." / title="..." / placeholder="..." / >...</tag> 内の日本語
#   - import / class / data-* 等は除外
#
# key parity check:
#   - messages_ja.json と messages_en.json で key 一致を機械的に検証
#   - どちらかにしか存在しない key を検出 (= 翻訳漏れ / stale key)

set -euo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

# budget 推移: R7-4 = 295 → R9-C = 299 → R10-B = 301 → 2026-05-07 = 330 → 2026-05-12 = 350 → 2026-05-14 = 360
# 2026-05-14: rank 3 i18n Phase 1+2 で Settings Language selector + i18n.svelte.ts 等で +3 件。
# 2026-05-15: 統合戦略 area 1-9 で大量 callsite t() 化、 実測 ~328-347 範囲で安定。
# 2026-05-17 (K i18n 完遂): 全 callsite t() 化完了、 実測 13。 残 13 は全て非対象:
#   (a) byte 単位 grep の誤検出 (`·` / `↑↓` / `…` / `✓` 等の非日本語 multibyte 文字)
#   (b) (A) literal keep (`<option>日本語</option>` = locale 自己表記、 font preview の `あ`)
#   (c) comment 内文字列。 → 実 UI 文字列の未訳は 0 件。 budget を 360 → 15 に厳格化。
MAX_HARDCODE=15

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

# grep -c 各 pattern を一括 (file ごとループより速い)、結果を集約。
# 注: grep -c は 0 一致時 exit 1 → xargs exit 123 → pipefail で abort するため `|| true` で吸収。
ariaCount=$(printf '%s\n' $src_targets | { xargs -r grep -cE "aria-label=\"[^\"]*$ja_pattern" 2>/dev/null || true; } | awk -F: '{s+=$NF} END {print s+0}')
titleCount=$(printf '%s\n' $src_targets | { xargs -r grep -cE "title=\"[^\"]*$ja_pattern" 2>/dev/null || true; } | awk -F: '{s+=$NF} END {print s+0}')
placeholderCount=$(printf '%s\n' $src_targets | { xargs -r grep -cE "placeholder=\"[^\"]*$ja_pattern" 2>/dev/null || true; } | awk -F: '{s+=$NF} END {print s+0}')
visibleCount=$(printf '%s\n' $src_targets | { xargs -r grep -cE ">[^<>]*$ja_pattern[^<>]*<" 2>/dev/null || true; } | awk -F: '{s+=$NF} END {print s+0}')

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
echo ""

# Phase 4 (2026-05-15): messages_{ja,en}.json key parity check。
# どちらかにしか存在しない key (= 翻訳漏れ / stale) を機械的に検出。
ja_file="src/lib/i18n/messages_ja.json"
en_file="src/lib/i18n/messages_en.json"

if [ ! -f "$ja_file" ]; then
	echo "(messages_ja.json not found — key parity check skipped)"
elif [ ! -f "$en_file" ]; then
	echo "(messages_en.json not found — key parity check skipped、 Phase 3 完了後に活性化)"
else
	# jq でフラット化した dot-notation key 一覧を比較。 $schema / $comment は除外。
	if command -v jq >/dev/null 2>&1; then
		# 注: Windows 版 jq は stdout を text mode で開き出力行末に \r を付ける。
		# tr -d '\r' で除去しないと shell literal (ALLOWED_JA_EQ_EN) との comm が全件不一致になる。
		ja_keys=$(jq -r 'paths(strings) | select(.[0] | startswith("$") | not) | join(".")' "$ja_file" 2>/dev/null | tr -d '\r' | sort -u)
		en_keys=$(jq -r 'paths(strings) | select(.[0] | startswith("$") | not) | join(".")' "$en_file" 2>/dev/null | tr -d '\r' | sort -u)

		only_ja=$(comm -23 <(echo "$ja_keys") <(echo "$en_keys"))
		only_en=$(comm -13 <(echo "$ja_keys") <(echo "$en_keys"))

		ja_count=$(echo "$ja_keys" | grep -c .)
		en_count=$(echo "$en_keys" | grep -c .)

		echo "i18n key parity (Phase 4):"
		echo "  messages_ja.json keys:  $ja_count"
		echo "  messages_en.json keys:  $en_count"

		parity_fail=0
		if [ -n "$only_ja" ]; then
			echo ""
			echo "  ERROR: ja のみに存在する key (= en 翻訳漏れ):"
			echo "$only_ja" | sed 's/^/    /'
			parity_fail=1
		fi
		if [ -n "$only_en" ]; then
			echo ""
			echo "  ERROR: en のみに存在する key (= stale / ja 同期漏れ):"
			echo "$only_en" | sed 's/^/    /'
			parity_fail=1
		fi

		if [ -z "$only_ja" ] && [ -z "$only_en" ]; then
			echo "  ✓ key parity OK (ja / en 完全一致)"
		fi

		# Phase 5 (PH-PQ-700): ja === en な未翻訳 key の機械検出。
		# (B) ja===en (nav / status 短文) と (A) literal keep (brand / 略語 / pure format)
		# は i18n-policy.md §0 で意図的に同値。 これらを allowlist し、 それ以外の ja===en は
		# 「翻訳漏れ」 として検出して fail させる。 新規 string で ja を en から copy したまま
		# 放置する regression を防ぐ。 allowlist 追加時は i18n-policy.md の category 根拠を伴うこと。
		ALLOWED_JA_EQ_EN="app.name
common.confirm
common.loading
common.no_match
item.appearance_settings.rotation_deg
library.empty_title
nav.help
nav.library
nav.settings
nav.workspace
palette.no_recent
settings.appearance.theme_hud
widgets.exe_folder.empty_title
widgets.image_scrap.img_alt
widgets.projects.empty_title
widgets.script_folder.empty_title
widgets.system_monitor.loading
workspace.empty_title"

		# jq 出力 (\r 除去済) と allowlist を同一 (shell) sort に揃えてから comm する。
		ja_eq_en=$(jq -rn --slurpfile ja "$ja_file" --slurpfile en "$en_file" '
			($ja[0]) as $j | ($en[0]) as $e
			| [ $j | paths(strings) | select(.[0] | startswith("$") | not) ]
			| map(. as $p | select(($j | getpath($p)) == ($e | getpath($p))) | $p | join("."))
			| .[]
		' 2>/dev/null | tr -d '\r' | sort -u)

		allowed_sorted=$(echo "$ALLOWED_JA_EQ_EN" | sort -u)
		untranslated=$(comm -23 <(echo "$ja_eq_en") <(echo "$allowed_sorted"))

		echo ""
		echo "i18n untranslated check (Phase 5 — ja === en non-allowlisted):"
		if [ -n "$untranslated" ]; then
			echo "  ERROR: ja と en が同値の未翻訳 key (allowlist 外):"
			echo "$untranslated" | sed 's/^/    /'
			echo ""
			echo "  → en を翻訳するか、 意図的 (A)/(B) なら i18n-policy.md 根拠付きで"
			echo "    scripts/audit-i18n-hardcode.sh の ALLOWED_JA_EQ_EN に追記してください。"
			parity_fail=1
		else
			echo "  ✓ 未翻訳 key なし (ja === en は allowlist 済みの意図的同値のみ)"
		fi

		if [ "$parity_fail" -ne 0 ]; then
			exit 1
		fi
	else
		echo "(jq not installed — key parity check skipped)"
	fi
fi

exit 0
