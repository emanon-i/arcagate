---
id: PH-20260422-054
title: パレット Tab キー → 選択アイテム名でクエリ補完
status: done
batch: 11
priority: medium
---

## 背景・目的

PaletteKeyGuide に "Tab → 詳細" のヒントが表示されているが未実装。
Tab キーで選択中のアイテム名をクエリに補完することで、ユーザーが手動入力を省ける。

## 受け入れ条件

- [x] `palette.svelte.ts` に `tabComplete(): string | null` 追加
  - item エントリ: `entry.item.label` を返す
  - calc / clipboard / 空: `null` を返す
- [x] `PaletteOverlay.svelte` の `handleKeydown` に Tab ケース追加
  - `e.preventDefault()` して `tabComplete()` を呼び
  - 非 null なら `searchQuery` と `paletteStore.search()` を更新
- [x] vitest: item 返す / calc は null / 空結果は null (3 テスト)

## 実装メモ

- `tabComplete()` はロジックのみ担い、クエリ更新は PaletteOverlay 側で行う（関心の分離）
- Tab キーのデフォルト動作（フォーカス移動）を preventDefault で抑制
