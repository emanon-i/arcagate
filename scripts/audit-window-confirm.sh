#!/usr/bin/env bash
# audit-window-confirm.sh
#
# 破壊的操作の確認パターン統一 (PH-CF-300、2026-05-23 確定) の機械検出 audit。
#
# src/ 配下で `window.confirm` / `window.alert` / `window.prompt` が使われていないか確認する。
# 破壊的操作は必ず ConfirmDialog (専用 confirm modal) または undo-toast 経路を通すという機能契約
# (docs/l2_foundation/features/screens/library.md / workspace.md §破壊的操作の確認契約)。
#
# 不可な理由:
#   - チェックボックス等の拡張ができない (E6 の「アイテムも消す」 を出せない)
#   - OS / browser ごとに見た目が違い、 ag-glass theme と整合しない
#   - 文言 wrap / accent color / focus trap が theme tokens に従わない
#   - i18n locale が OS 規定に引きずられる
#
# 違反例:
#   if (!window.confirm('really delete?')) return;
#   window.alert('done');
#
# OK な代替:
#   - ConfirmDialog (src/lib/components/common/ConfirmDialog.svelte) を開く
#   - toastStore + libraryHistory (= undo-toast 経路)
#   - Tauri ask() (OS dialog、 破壊的操作の最終確認に限り可)
#
# 除外:
#   - src/lib/components/ui/ (shadcn-svelte scaffold、 手動編集禁止)
#   - src/lib/bindings/ (auto generated)
#   - tests/ (test 内で OS dialog を測りたいケースは別)
#   - docs/ コードブロック

set -euo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

pattern='window\.(confirm|alert|prompt)[[:space:]]*\('

# find は portable。 src/ 配下の .ts / .svelte を対象、 ui/ と bindings/ を除外。
files=$(
  find src -type f \( -name '*.ts' -o -name '*.svelte' \) \
    -not -path 'src/lib/components/ui/*' \
    -not -path 'src/lib/bindings/*' \
    2>/dev/null
)

hits=""
count=0

for f in $files; do
  matched=$(grep -nE "$pattern" "$f" 2>/dev/null || true)
  if [[ -n "$matched" ]]; then
    while IFS= read -r line; do
      hits+="${f}:${line}"$'\n'
      count=$((count + 1))
    done <<< "$matched"
  fi
done

if [[ "$count" -gt 0 ]]; then
  echo "✗ window.confirm/alert/prompt が src/ に ${count} 件残っています。"
  echo ""
  printf '%s' "$hits" | sed 's/^/  /'
  echo ""
  echo "→ ConfirmDialog (src/lib/components/common/ConfirmDialog.svelte) または undo-toast 経路へ置換してください。"
  echo "  参照: docs/l3_phases/clean-feedback/PH-CF-300_destructive-action-confirm.md"
  exit 1
fi

echo "✓ window.confirm/alert/prompt: 0 件 (PH-CF-300 契約 OK)"
