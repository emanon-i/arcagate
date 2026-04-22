---
id: PH-20260423-125
title: WorkspaceLayout 選択ウィジェットの視覚フィードバック改善
status: todo
batch: 27
priority: medium
created: 2026-04-23
scope_files:
  - src/lib/components/arcagate/workspace/WorkspaceLayout.svelte
parallel_safe: true
depends_on: []
---

## 背景/目的

編集モード中に選択されているウィジェットの outline が細く（`outline-offset-3`）、
ダークテーマでは視認しにくい。UX フィードバックとして `ring` ユーティリティを使い、
より明確な選択状態を示す。

## 実装内容

選択ウィジェットのスタイルを:

```html
<!-- Before -->
class="... outline outline-2 outline-[var(--ag-accent)]"

<!-- After -->
class="... ring-2 ring-[var(--ag-accent)] ring-offset-2 ring-offset-[var(--ag-surface)]"
```

Tailwind の `ring` ユーティリティは outline より厚みがあり、
`ring-offset` でウィジェット本体との間隔を確保できる。

## 注意事項

- 選択状態クラスは `WorkspaceLayout.svelte` で条件的に付与されている
- 編集モード以外では選択状態にならない（既存ロジックを維持）
- svelte-check 0 errors を維持

## 受け入れ条件

- [ ] 選択ウィジェットに ring スタイルが適用されていること（手動確認）
- [ ] 非選択ウィジェットには ring が表示されないこと
- [ ] svelte-check 0 errors
