---
id: PH-20260422-112
title: clampWidget 関数の重複排除（共通ユーティリティへ移動）
status: todo
batch: 24
priority: low
created: 2026-04-23
scope_files:
  - src/lib/utils/widget-grid.ts
  - src/lib/components/arcagate/workspace/WorkspaceLayout.svelte
  - src/lib/components/arcagate/workspace/WorkspaceWidgetGrid.svelte
parallel_safe: false
depends_on: []
---

## 背景/目的

`clampWidget` 関数が 2 箇所に重複定義されている（DRY 違反）。

- `WorkspaceLayout.svelte:181`
- `WorkspaceWidgetGrid.svelte:45`

どちらも全く同じ実装:

```typescript
function clampWidget(widget: { position_x: number; width: number }, cols: number) {
  const x = Math.min(widget.position_x, Math.max(0, cols - 1));
  const span = Math.max(1, Math.min(widget.width, cols - x));
  return { x, span };
}
```

## 実装内容

1. `src/lib/utils/widget-grid.ts` を新規作成して `clampWidget` をエクスポート
2. `WorkspaceLayout.svelte` と `WorkspaceWidgetGrid.svelte` でローカル定義を削除し、import に置き換え

### `src/lib/utils/widget-grid.ts`

```typescript
export function clampWidget(
  widget: { position_x: number; width: number },
  cols: number,
): { x: number; span: number } {
  const x = Math.min(widget.position_x, Math.max(0, cols - 1));
  const span = Math.max(1, Math.min(widget.width, cols - x));
  return { x, span };
}
```

## 注意事項

- `parallel_safe: false`: 3 ファイルを変更するため、他の並列 Plan と scope_files が重複しないよう注意
- リファクタなので動作変更ゼロ。`pnpm verify` で同一動作を確認する

## 受け入れ条件

- [ ] `src/lib/utils/widget-grid.ts` が新規作成され `clampWidget` がエクスポートされていること
- [ ] `WorkspaceLayout.svelte` がローカル定義を削除して import を使っていること
- [ ] `WorkspaceWidgetGrid.svelte` がローカル定義を削除して import を使っていること
- [ ] biome / svelte-check 0 errors
