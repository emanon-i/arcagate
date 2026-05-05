---
status: done
phase_id: PH-20260423-197
title: モーダル背景修正 + サイドバーボタンサイズ安定化
category: バグ修正
scope_files:
  - src/lib/components/arcagate/workspace/WorkspaceDeleteConfirmDialog.svelte
  - src/lib/components/arcagate/workspace/WorkspaceRenameDialog.svelte
  - src/lib/components/arcagate/workspace/WorkspaceSidebar.svelte
parallel_safe: true
depends_on: []
---

## 目的

1. 削除確認・リネームダイアログの内側カードが `--ag-surface-3`（不透明度 4%）を背景色に使用しており、ほぼ透明になっている。
2. サイドバーの「完了」「戻す」ボタンがラベル変化時にサイズがガタつく。

## 変更方針

### モーダル背景 (`WorkspaceDeleteConfirmDialog.svelte`, `WorkspaceRenameDialog.svelte`)

`bg-[var(--ag-surface-3)]` → `bg-[var(--ag-surface-opaque)]`

| トークン              | 値                                                                  |
| --------------------- | ------------------------------------------------------------------- |
| `--ag-surface-3`      | `rgba(0,0,0,0.04)` (light) / `rgba(255,255,255,0.04)` (dark) ← 問題 |
| `--ag-surface-opaque` | `#f5f5f6` (light) / `#10141b` (dark) ← 正しい                       |

ダイアログの内側カード div の `bg-[...]` クラスを修正。

### サイドバーボタン安定化 (`WorkspaceSidebar.svelte`)

「完了」「戻す」の各ボタンに `min-w-[4rem]` を追加し、テキスト幅差異でのレイアウトシフトを防ぐ。

## 検証

- 削除確認ダイアログを開くとカードに不透明な背景が表示される
- リネームダイアログも同様
- 編集モードでサイドバーの確定/キャンセルボタンのサイズが安定している
