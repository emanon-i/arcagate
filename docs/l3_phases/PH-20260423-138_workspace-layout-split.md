---
id: PH-20260423-138
title: WorkspaceLayout コンポーネント分割（削除確認・名前変更・ヒントバー）
status: todo
batch: 30
priority: medium
created: 2026-04-23
scope_files:
  - src/lib/components/arcagate/workspace/WorkspaceLayout.svelte
  - src/lib/components/arcagate/workspace/WorkspaceDeleteConfirmDialog.svelte
  - src/lib/components/arcagate/workspace/WorkspaceRenameDialog.svelte
  - src/lib/components/arcagate/workspace/WorkspaceHintBar.svelte
parallel_safe: false
depends_on: []
---

## 背景/目的

`WorkspaceLayout.svelte` は 387 行に達しており、削除確認ダイアログ・名前変更ダイアログ・
キーボードヒントバーなど独立した UI ロジックが混在している。
PH-107（batch-23 で次バッチ送り）の実施タイミングであり、PH-104（ヒントバー）が
完了した今が分割の好機。

## 実装ステップ

### Step 1: WorkspaceDeleteConfirmDialog.svelte 切り出し

削除確認ダイアログ（WorkspaceLayout.svelte の deleteConfirmId 関連 30 行程度）を
新規コンポーネントに切り出す。

props:

- `widgetId: string | null`
- `onConfirm: () => void`
- `onCancel: () => void`

### Step 2: WorkspaceRenameDialog.svelte 切り出し

名前変更ダイアログ（renameOpen / pendingName 関連 25 行程度）を切り出す。

props:

- `open: boolean`
- `currentName: string`
- `onConfirm: (name: string) => void`
- `onCancel: () => void`

### Step 3: WorkspaceHintBar.svelte 切り出し

キーボードヒントバー（editMode 時の fixed bottom バー 15 行程度）を切り出す。

props:

- `editMode: boolean`
- `selectedWidgetId: string | null`

### Step 4: WorkspaceLayout.svelte を更新

各サブコンポーネントを import して置き換える。
状態管理（deleteConfirmId / renameOpen / pendingName / selectedWidgetId）は
WorkspaceLayout に残し、サブコンポーネントに props として渡す。

## 受け入れ条件

- [ ] `pnpm verify` 全通過（ビルドエラーなし・svelte-check 0 errors/warnings）
- [ ] WorkspaceLayout.svelte が 300 行以下になること
- [ ] 削除確認ダイアログ、名前変更ダイアログ、ヒントバーが従来通り動作すること（実機確認）
- [ ] 既存 E2E テストが全通過すること（workspace-editing.spec.ts 等）
