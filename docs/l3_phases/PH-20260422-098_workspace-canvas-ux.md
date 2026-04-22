---
id: PH-20260422-098
title: Workspace 編集モード Canvas 風 UX 再設計
status: wip
batch: 21
priority: high
created: 2026-04-22
---

## 背景/目的

現在の Workspace 編集モードは HTML5 D&D + PointerEvents による実装だが、
視覚フィードバックが乏しく「編集している感」がない。
Obsidian Canvas 風の操作感（ドットグリッド背景、選択アウトライン、コーナーリサイズハンドル）を
取り入れ、編集モードの UX を底上げする。

## 制約

- 既存の `WorkspaceLayout.svelte` のグリッド構造・D&D ロジックは維持
- CSS のみで実現できる部分は CSS で（JSロジックを最小化）
- `src/lib/components/ui/` は編集不可（shadcn-svelte scaffold）

## 実装内容

### 1. ドットグリッド背景（編集モード時のみ表示）

`WorkspaceLayout.svelte` の drop-zone コンテナに `edit-mode` クラスを付与し、
CSS で `radial-gradient` によるドットパターン背景を追加。

```css
/* editMode 時のみ */
.edit-mode {
  background-image: radial-gradient(circle, var(--ag-text-muted) 1px, transparent 1px);
  background-size: calc(var(--widget-w) / 4) calc(var(--widget-h) / 4);
}
```

### 2. ウィジェット選択アウトライン

`contextItemId` でアクティブなウィジェットに `ring-2 ring-[var(--ag-accent)]` を付与。
現在は hover のみのスタイリング → クリック時に選択状態を維持する。

### 3. コーナーリサイズハンドル（4隅）

編集モード時、各ウィジェットの4隅に 8×8px の正方形ハンドルを表示。
現在は右下のみ（GripVertical アイコン） → 4隅に `<div class="resize-handle corner-*">` を追加。
PointerEvents のロジックは既存の `onPointerDown` ハンドラを流用し、
方向（corner）を引数に追加して span の増減方向を切り替え。

### 4. ドラッグ中のゴースト視覚

HTML5 D&D のデフォルトゴースト（半透明コピー）をカスタム DragImage に差し替え。
`dragstart` イベントで `event.dataTransfer.setDragImage(ghostEl, ...)` を使用。

## 受け入れ条件

- [ ] 編集モード ON 時にドットグリッド背景が表示される
- [ ] ウィジェットをクリックすると選択アウトライン（accent カラー ring）が表示される
- [ ] 選択ウィジェットの4隅にリサイズハンドルが表示される
- [ ] ドラッグ中のゴーストがカスタム表示になる（デフォルト半透明コピーより明確）
- [ ] 編集モード OFF 時は上記装飾がすべて非表示
- [ ] `pnpm verify` 全通過
