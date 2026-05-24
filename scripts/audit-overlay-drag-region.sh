#!/usr/bin/env bash
# audit-overlay-drag-region.sh
#
# PH-CF-1000 B1 機械検出: `fixed inset-0` のフルスクリーンオーバーレイ component は
# TitleBar の `data-tauri-drag-region` を覆い隠すため、 表示中も window を掴めるよう
# **自身の中に `data-tauri-drag-region` 帯を持つ** ことを要求する。 再発防止 audit。
#
# 引用元 guideline:
#   docs/l3_phases/clean-feedback/PH-CF-1000_overlay-drag-region.md §受け入れ条件
#   docs/l2_foundation/features/cross-cutting/window-drag.md §オーバーレイ window 操作契約
#
# 検出ルール:
#   (a) `src/**/*.svelte` および `src/routes/**/*.svelte` で `fixed inset-0` を含むファイル
#       (= フルスクリーン overlay 候補) は **必ず** 同一ファイル内に `data-tauri-drag-region` を持つ
#   (b) `<button.*data-tauri-drag-region` のように drag region がインタラクティブ要素に
#       誤って付与されていない (= 誤って drag が button 操作を吸わない)
#
# allowlist:
#   - `PaletteOverlay.svelte` は palette 専用 webview window (TitleBar 無し) で使われるため対象外。
#     同一ファイル内 marker `audit-overlay-drag-region:skip palette-window` で明示。
#   - `pointer-events-none` 付きの passive overlay (D&D 視覚 fallback 等) は click も drag も
#     受けないため対象外。 同 marker か `pointer-events-none` を **同 className 内** に持つことで skip。

set -euo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

# 対象 .svelte ファイルを列挙 (build / dist / .svelte-kit 除外)。
TARGETS=$(git ls-files 'src/**/*.svelte' 'src/routes/**/*.svelte' 2>/dev/null || true)

VIOLATIONS=0

# (a) `fixed inset-0` を含むのに `data-tauri-drag-region` を持たないファイル。
for f in $TARGETS; do
  if ! grep -q "fixed inset-0" "$f"; then
    continue
  fi
  # allowlist marker
  if grep -q "audit-overlay-drag-region:skip" "$f"; then
    continue
  fi
  # `fixed inset-0` を含む行が全て `pointer-events-none` を伴うなら overlay は受動的 (skip)。
  # active overlay (= click や drag を受ける可能性) の行が 1 つでもあれば judgement 対象。
  ACTIVE_OVERLAY_LINES=$(grep -nE 'fixed inset-0' "$f" | grep -vE 'pointer-events-none' || true)
  if [ -z "$ACTIVE_OVERLAY_LINES" ]; then
    continue
  fi
  if ! grep -q "data-tauri-drag-region" "$f"; then
    echo "ERROR: $f has active 'fixed inset-0' overlay but no data-tauri-drag-region"
    echo "  対象行:"
    echo "$ACTIVE_OVERLAY_LINES" | sed 's/^/    /'
    echo "  → PH-CF-1000 B1: overlay の最上部に細い data-tauri-drag-region 帯を追加してください"
    echo "  → palette window 等で対象外なら 'audit-overlay-drag-region:skip' marker を file に追記"
    echo
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
done

# (b) インタラクティブ要素 (button / a) に data-tauri-drag-region が付いていないこと。
# 1 line に同居している pattern を grep (multi-line の <button>\n   data-tauri-drag-region> は
# svelte の formatter で 通常同 line にならないため line 単位で十分)。
BUTTON_DRAG=$(grep -rnE '<(button|a)\b[^>]*data-tauri-drag-region' src 2>/dev/null || true)
if [ -n "$BUTTON_DRAG" ]; then
  echo "ERROR: drag region がインタラクティブ要素 (button / a) に付与されています:"
  echo "$BUTTON_DRAG" | sed 's/^/  /'
  echo "  → drag region は thin header 帯 (div) のみに限定してください"
  echo
  VIOLATIONS=$((VIOLATIONS + 1))
fi

if [ "$VIOLATIONS" -gt 0 ]; then
  echo "audit-overlay-drag-region: $VIOLATIONS violation(s)"
  exit 1
fi

echo "✓ audit-overlay-drag-region: 全 fixed inset-0 overlay に drag region が付与されている (PH-CF-1000 B1 契約 OK)"
