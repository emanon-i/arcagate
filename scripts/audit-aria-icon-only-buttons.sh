#!/usr/bin/env bash
# audit-aria-icon-only-buttons.sh
#
# icon-only button (text content 無しで <Icon /> だけ含む button) が aria-label / title /
# aria-labelledby を持つことを強制する。
#
# scope: src/lib/**/*.svelte
# 除外: src/lib/components/ui/ (shadcn-svelte scaffold、手動編集禁止)

set -euo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

# 1 行 icon-only button を grep -E (一括処理、line-loop は遅い)
# pattern: <button ...><Component .../></button> 同一行
pattern='<button[^>]*>[[:space:]]*<[A-Z][a-zA-Z0-9]+[^>]*/>[[:space:]]*</button>'

violations=$(grep -rEn --include="*.svelte" "$pattern" src/lib 2>/dev/null \
	| grep -v "src/lib/components/ui/" \
	| grep -vE 'aria-label[a-z]*=|title=' \
	|| true)

if [ -n "$violations" ]; then
	count=$(echo "$violations" | wc -l)
	echo "ERROR: $count icon-only button(s) without aria-label / aria-labelledby / title:"
	echo "$violations"
	exit 1
fi

echo "✓ audit-aria-icon-only-buttons: 0 violations"
