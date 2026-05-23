#!/usr/bin/env bash
# audit-sticky-bar-occlusion.sh
#
# PH-CF-500 D1 機械検出: card (= 不透明背景の item) を持つ widget の sort/filter sticky bar は
# 不透明 fill を持ち、 スクロール内容が透けてはならない (= 「sticky bar 契約」)。
#
# 設計:
#   `.ag-sticky-bar` の塗りは `--ag-sticky-bar-bg` token を経由する (arcagate-theme.css)。
#   blur theme (Dark/Light) も含めて 不透明 fill (`--ag-surface-opaque` / `--surface-glass-regular`) に
#   差し替え済 (PH-CF-500)。 token が再び `transparent` に戻ると D1 が再発する。
#
# 検出対象 (= fail):
#   - `--ag-sticky-bar-bg: transparent;` が arcagate-theme.css に出現
#   - `.ag-sticky-bar` を使用しながら、 同要素に `bg-transparent` を Tailwind で重ね打ちしている

set -euo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

THEME_FILE='src/lib/styles/arcagate-theme.css'
VIOLATIONS=0

# Pattern A: theme css で sticky bar token が transparent に戻っている
TOKEN_VIOLATIONS=$(
  grep -nE '^\s*--ag-sticky-bar-bg\s*:\s*transparent\s*;' "$THEME_FILE" 2>/dev/null || true
)
if [ -n "$TOKEN_VIOLATIONS" ]; then
  echo "ERROR: --ag-sticky-bar-bg が transparent に設定されています"
  echo "  → 全 theme で不透明 fill (ag-surface-opaque 等) を使うこと"
  echo "  → blur theme で transparent に戻すと PH-CF-500 D1 (card 透け) が再発"
  echo
  echo "$TOKEN_VIOLATIONS"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# Pattern B: 個別要素で ag-sticky-bar に bg-transparent を上書きしている
CLASS_VIOLATIONS=$(
  grep -rnE --include='*.svelte' \
    'ag-sticky-bar[^"]*\bbg-transparent\b' \
    src/ 2>/dev/null || true
)
if [ -n "$CLASS_VIOLATIONS" ]; then
  echo "ERROR: ag-sticky-bar 要素に bg-transparent を重ね打ちしています"
  echo "  → token (--ag-sticky-bar-bg) を上書きせず、 そのまま使うこと"
  echo
  echo "$CLASS_VIOLATIONS"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

if [ "$VIOLATIONS" -gt 0 ]; then
  echo
  echo "audit-sticky-bar-occlusion: FAIL"
  echo "参照: docs/l2_foundation/features/widgets/_chrome-consistency.md"
  echo "       「sticky bar 契約」"
  exit 1
fi

echo "audit-sticky-bar-occlusion: OK (sticky bar uses opaque fill across themes)"
exit 0
