---
id: PH-20260422-039
title: "D&D完全性強化: dragend + cursor-grabbing + drop zone視認性"
status: wip
priority: P0
batch: 8
created: 2026-04-22
---

## 背景・目的

WorkspaceLayout.svelte の D&D 実装に 3 件の欠落がある。

1. `dragMoveWidget` action に dragend ハンドラがない → ドラッグキャンセル時 `movingWidget` が残存
2. ドラッグ中カーソルが `cursor-grab` のまま → `cursor-grabbing` に切り替わらない
3. drop zone highlight が dashed border + 薄い背景のみ → 視認性が低い

## 制約

- WorkspaceLayout.svelte のみ変更
- Tailwind JIT で使用可能なクラスのみ
- 既存の `dragMoveWidget` action パターンを維持

## 実装仕様

### 1. dragend ハンドラ追加（`dragMoveWidget` action 内）

```ts
let endHandler = () => { movingWidget = null; };
node.addEventListener('dragend', endHandler);
// update() / destroy() でも同様に付け外し
```

### 2. cursor-grabbing CSS

```svelte
class:cursor-grabbing={movingWidget === widget.id}
```

ドラッグハンドルの `div` に追加。

### 3. drop zone highlight 強化

既存クラスに追加:

- `shadow-[0_0_0_2px_var(--ag-accent)]` → accent 色の外枠グロー

## 受け入れ条件

- ドラッグ中: ハンドルのカーソルが grabbing になること
- ドラッグキャンセル（Escape）時: `movingWidget` が null に戻ること（opacity が 60% のまま残らない）
- drop zone: 視覚的に目立つこと
