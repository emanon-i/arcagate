---
status: done
phase_id: PH-20260423-196
title: ウィンドウリサイズ時レイアウト安定化（ウィジェットオーバーラップ防止）
category: バグ修正
scope_files:
  - src/lib/components/arcagate/workspace/WorkspaceLayout.svelte
parallel_safe: true
depends_on: []
---

## 目的

ウィンドウを狭くすると `dynamicCols` が減少し、ウィジェットの
`position_x` がグリッド列数を超えてオーバーラップする。
`dynamicCols` の下限を既存ウィジェットの最大列占有幅で固定する。

## 変更方針

### `minGridCols` を導入

```ts
// ウィジェットが占める最大列数（position_x + width の最大値）
let minGridCols = $derived(
    workspaceStore.widgets.length > 0
        ? Math.max(1, ...workspaceStore.widgets.map(w => w.position_x + w.width))
        : 1
);

// dynamicCols は minGridCols を下限として計算
let dynamicCols = $derived(
    containerWidth > 0 && widgetW > 0
        ? Math.max(minGridCols, Math.floor(containerWidth / widgetW))
        : Math.max(minGridCols, 4)
);
```

これにより：

- ウィンドウが狭くなっても `dynamicCols >= minGridCols` が保証される
- ウィジェットが画面外にはみ出さず、コンテナの `overflow-auto` でスクロール可能

## 移行方針

- 既存ユーザーへの影響なし（表示修正のみ）
- ウィジェットの DB 値（position_x）は変更しない

## 検証

- ウィジェットを配置した状態でウィンドウを狭くしてもオーバーラップしない
- `svelte-check` でエラーなし
