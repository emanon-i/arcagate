#!/usr/bin/env bash
# audit-hotkey-consistency.sh
#
# Source of truth: src-tauri/src/models/config.rs DEFAULT_HOTKEY
# 「公開水準」ドキュメント (README, CLAUDE.md, docs/l1_*, docs/l2_*) と active source code のホットキー
# 表記が source of truth と一致するか検証。表記揺れを検出したら exit 1。
#
# 除外:
#   - docs/l3_phases/archive/ (履歴は不変)
#   - docs/dispatch-log.md (append-only ログ、過去履歴)
#   - docs/l3_phases/ (Plan 文書は SoT 確定後に追従、本 audit 範囲外)
#   - docs/l2_architecture/use-case-friction.md (v1 履歴)
#   - docs/l0_ideas/arcagate_mockup_board.jsx (UI モック、参考資料)
#   - src/lib/bindings/ (auto generated)
#   - src-tauri テストファイル (機能テストの set/get 値、任意でよい)

set -euo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

sot_file="src-tauri/src/models/config.rs"
sot_line=$(grep -E '^pub const DEFAULT_HOTKEY' "$sot_file" || true)
sot_hotkey=$(echo "$sot_line" | sed -E 's/.*"([^"]+)".*/\1/')

if [ -z "$sot_hotkey" ]; then
	echo "ERROR: Could not extract DEFAULT_HOTKEY from $sot_file" >&2
	exit 1
fi

echo "Source of truth hotkey: $sot_hotkey"

# 検査対象ファイル群
targets=(
	"README.md"
	"CLAUDE.md"
)
docs_targets=$(find docs/l1_requirements docs/l2_architecture -type f -name "*.md" \
	! -path "*/use-case-friction.md" 2>/dev/null || true)
src_targets=$(find src -type f \( -name "*.svelte" -o -name "*.ts" \) \
	! -path "*/bindings/*" 2>/dev/null || true)

violations=0
violations_log=$(mktemp)

# Ctrl+Space (without Shift) and Alt+Space を 表記揺れとして検出
# ただし正規 SoT (Ctrl+Shift+Space) は除外
patterns_to_check='(Ctrl[[:space:]]*\+[[:space:]]*Space|Alt[[:space:]]*\+[[:space:]]*Space|Cmd[[:space:]]*\+[[:space:]]*Space)'

check_file() {
	local f="$1"
	[ -f "$f" ] || return 0
	# Ctrl+Shift+Space は OK、それ以外は違反
	# grep で全件 → Shift を含まないものだけ違反
	local found
	found=$(grep -nE "$patterns_to_check" "$f" 2>/dev/null | grep -vE "Ctrl[[:space:]]*\+[[:space:]]*Shift[[:space:]]*\+[[:space:]]*Space" || true)
	if [ -n "$found" ]; then
		echo "$f:" >> "$violations_log"
		echo "$found" >> "$violations_log"
		echo "---" >> "$violations_log"
		violations=$((violations + 1))
	fi
}

for f in "${targets[@]}"; do
	check_file "$f"
done

for f in $docs_targets; do
	check_file "$f"
done

for f in $src_targets; do
	check_file "$f"
done

if [ "$violations" -gt 0 ]; then
	echo "ERROR: $violations file(s) have hotkey notation inconsistent with SoT '$sot_hotkey':"
	cat "$violations_log"
	rm -f "$violations_log"
	exit 1
fi

rm -f "$violations_log"
echo "OK: hotkey notation consistent across active sources."
