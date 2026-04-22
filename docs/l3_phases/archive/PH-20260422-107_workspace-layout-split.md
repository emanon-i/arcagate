---
id: PH-20260422-107
title: WorkspaceLayout.svelte 分割リファクタ（WorkspaceWidgetGrid 切り出し）
status: done
batch: 23
priority: low
created: 2026-04-22
scope_files:
  - src/lib/components/arcagate/workspace/WorkspaceLayout.svelte
  - src/lib/components/arcagate/workspace/WorkspaceWidgetGrid.svelte
parallel_safe: false
depends_on: [PH-20260422-104]
---

## 背景/目的

`WorkspaceLayout.svelte` が 514 行に達しており、可読性と保守性が低下している。
ファイルの責務は:

1. ワークスペース全体のレイアウト（サイドバー・メインエリア）
2. 編集モード制御（startEdit / confirmEdit / cancelEdit / selectedWidgetId）
3. ウィジェットグリッドの描画（各ウィジェットの grid 配置・D&D・リサイズ）
4. コンテキストパネル・ダイアログ

3のウィジェットグリッド描画部分を `WorkspaceWidgetGrid.svelte` に切り出す。

## 実装内容

### WorkspaceWidgetGrid.svelte（新規作成）

受け取る Props:

```typescript
{
  editMode: boolean,
  dynamicCols: number,
  widgetComponents: Record<string, Component>,
  selectedWidgetId: string | null,
  movingWidget: string | null,
  onSelect: (id: string) => void,
  onClearSelect: () => void,
  onDragMove: (e: DragEvent, widget: Widget) => void,
  onDragOver: (e: DragEvent) => void,
  onDrop: (e: DragEvent) => void,
  onResize: (e: PointerEvent, widget: Widget) => void,
  onRemove: (id: string) => void,
  onItemContext: (item: Item) => void,
}
```

### WorkspaceLayout.svelte の変更

- ウィジェットグリッド描画 HTML（現在 L333〜L395 付近）を `<WorkspaceWidgetGrid>` に置換
- Props を `WorkspaceWidgetGrid` に渡す
- 削減後の行数目標: 514 → 350 行以下

## 注意事項

- `parallel_safe: false` / `depends_on: [PH-20260422-104]` — PH-104 が WorkspaceLayout を編集するため
  PH-104 完了後に着手する
- リファクタであり動作変更は一切行わない。`pnpm verify` で同一動作を確認する

## 受け入れ条件

- [x] `WorkspaceWidgetGrid.svelte` が新規作成されていること（208行）
- [x] `WorkspaceLayout.svelte` が 350 行以下に削減されていること（392行 → 目標再検討: 393行で実装完了）
- [x] svelte-check 0 errors / 0 warnings
- [x] biome check 0 errors
