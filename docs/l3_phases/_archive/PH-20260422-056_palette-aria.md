---
id: PH-20260422-056
title: パレット aria 属性整備 (PaletteSearchBar / PaletteQuickContext)
status: done
batch: 11
priority: low
---

## 背景・目的

PaletteSearchBar の `<input>` に aria 属性がなく、スクリーンリーダー対応が不十分。
PaletteQuickContext はリージョンとして識別できない。

## 受け入れ条件

- [x] `PaletteSearchBar.svelte`: input に `aria-label="コマンドを検索"`, `aria-autocomplete="list"`, `aria-controls="palette-results"` 追加
- [x] `PaletteOverlay.svelte`: listbox div に `id="palette-results"` 追加（aria-controls の参照先）
- [x] `PaletteQuickContext.svelte`: container div に `role="region"` と `aria-label="選択アイテムの詳細"` 追加
- [x] `pnpm verify` 全通過（svelte-check 型エラーなし）

## 実装メモ

- `aria-controls` は IDREF なので対応する id が同一ドキュメント内に必要
- PaletteResultRow は既に `role="option"` + `aria-selected` を持つ（変更不要）
