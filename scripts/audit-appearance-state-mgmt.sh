#!/usr/bin/env bash
# audit-appearance-state-mgmt.sh
#
# PH-CF-1100 ②⑤⑥ 機械検出: Library item の「見た目設定 (card_override + icon)」 状態管理が
# 「解除しても画像残る (⑤)」 「解除→復元で位置消える (⑥)」 「即時反映しない (②)」 を再発
# させないための structural gate。
#
# 引用元 guideline:
#   docs/l2_foundation/features/screens/library.md §appearance 設定の状態管理契約
#
# 検出 (= fail):
#   A. card-override.ts に `isCardOverrideActive` / `disabled` / `icon_backup` フィールド定義
#      が存在すること (型契約)
#   B. LibraryCard.svelte が `isCardOverrideActive` を import + 使用していること (disabled
#      respect)
#   C. LibraryCard.svelte が `freshIconMark` を `$effect` で subscribe していること
#      (paint stale 解消、 onMount 一回 check は穴あり)
#   D. LibraryDetailPanel.svelte の toggle OFF 経路が `disabled: true` + `icon_backup` +
#      `icon_path: null` を 1 つの updateItem に詰めていること (中間状態を露出しない)
#   E. LibraryDetailPanel.svelte の toggle ON 経路 (restore 分岐) が `delete restored.disabled`
#      + `delete restored.icon_backup` で旧 backup を消費していること

set -euo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

VIOLATIONS=0

CO=src/lib/utils/card-override.ts
LC=src/lib/components/arcagate/library/LibraryCard.svelte
DP=src/lib/components/arcagate/library/LibraryDetailPanel.svelte

# (A) card-override 型契約
for needle in 'isCardOverrideActive' 'disabled\?:\s*boolean' 'icon_backup\?:\s*string'; do
  if ! grep -qE "$needle" "$CO" 2>/dev/null; then
    echo "ERROR (A): $CO に '$needle' が見つかりません"
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
done

# (B) LibraryCard が isCardOverrideActive を使用 (active check で disabled を respect)
if ! grep -q 'isCardOverrideActive' "$LC" 2>/dev/null; then
  echo "ERROR (B): $LC が isCardOverrideActive を使用していません"
  echo "  → disabled=true override を non-active として扱わないと「⑤ 解除しても画像残る」 が再発"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# (C) LibraryCard で content-visibility: auto を CSS rule として再導入していないこと
# (PH-CF-1100 ②: 仮想化を撤廃して即時反映を最優先、 modal open 中の paint skip を構造的に排除)。
# `freshIconMark` + `onMount` / `$effect` の 2 段 fix を試みたが実 UI 経路で paint stale が
# 残ったため、 PR #564/#570 → 本 PR (PH-CF-1100) で content-visibility そのものを LibraryCard
# から除去。 再び `content-visibility: auto;` を CSS 宣言として書き戻すと「② 画像が即時反映
# しない」 が再発するため、 末尾 `;` (= CSS rule) を含む形を block する (説明 comment 内の
# 言及は許容)。
CV_RE=$(grep -nE 'content-visibility\s*:\s*auto\s*;' "$LC" 2>/dev/null || true)
if [ -n "$CV_RE" ]; then
  echo "ERROR (C): $LC に 'content-visibility: auto;' が CSS 宣言として再導入されています"
  echo "  → PH-CF-1100 ② 修正で意図的に撤廃した仮想化を書き戻すと paint stale が再発"
  echo "  → 再パフォーマンス対策が必要な場合は scroll virtualizer library を別経路で導入し、"
  echo "     CSS-native CV は LibraryCard では使わない"
  echo
  echo "$CV_RE"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# (D) LibraryDetailPanel の toggle OFF 経路で disabled / icon_backup / icon_path:null を 1 IPC に集約
# 順序依存しないよう全部存在するかチェック。
if ! grep -q 'disabled:\s*true' "$DP" 2>/dev/null; then
  echo "ERROR (D-1): $DP に 'disabled: true' (toggle OFF の disabled set) が見つかりません"
  VIOLATIONS=$((VIOLATIONS + 1))
fi
if ! grep -q 'icon_backup' "$DP" 2>/dev/null; then
  echo "ERROR (D-2): $DP に 'icon_backup' (icon path 退避) が見つかりません"
  echo "  → 「⑥ 解除→復元で位置消える」 修正は icon_backup での退避 / 復元が前提"
  VIOLATIONS=$((VIOLATIONS + 1))
fi
if ! grep -qE 'icon_path:\s*null' "$DP" 2>/dev/null; then
  echo "ERROR (D-3): $DP に 'icon_path: null' (toggle OFF で画像を消す) が見つかりません"
  echo "  → 「⑤ 解除しても画像残る」 fix は icon_path を null に倒すのが必須"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# (E) restore 分岐で disabled / icon_backup を delete (旧 backup を消費)
if ! grep -qE 'delete\s+restored\.disabled' "$DP" 2>/dev/null; then
  echo "ERROR (E-1): $DP の restore 分岐で 'delete restored.disabled' が見つかりません"
  VIOLATIONS=$((VIOLATIONS + 1))
fi
if ! grep -qE 'delete\s+restored\.icon_backup' "$DP" 2>/dev/null; then
  echo "ERROR (E-2): $DP の restore 分岐で 'delete restored.icon_backup' が見つかりません"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

if [ "$VIOLATIONS" -gt 0 ]; then
  echo
  echo "audit-appearance-state-mgmt: $VIOLATIONS violation(s)"
  echo "参照: docs/l2_foundation/features/screens/library.md §appearance 設定の状態管理契約"
  exit 1
fi

echo "audit-appearance-state-mgmt: OK (disabled/icon_backup スキーマ + content-visibility 撤廃 維持)"
exit 0
