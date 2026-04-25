---
id: PH-20260425-267
status: todo
batch: 62
type: 改善
---

# PH-267: Quick Note ウィジェット

## 背景・目的

Workspace に短いメモを貼り付ける「Quick Note」ウィジェットを追加する。
アイテム登録不要の軽量メモとして、タスク・URL・コマンドなどの一時記録に使う。

## 仕様

### 表示内容

- `<textarea>` またはプレーンテキストエディタ
- 文字数制限: 500 文字（超過時に警告表示）
- フォントサイズ: `text-sm`、ウィジェット高さに追従してスクロール

### 保存方式

- `widget.config` に `{ note: "..." }` として JSON 保存
- 変更検知: `oninput` → 500ms デバウンスで `updateWidgetConfig` IPC 呼び出し
- 自動保存（明示的な Save ボタンなし）、保存成功時に小アイコン点滅

### WidgetType 追加

- Rust: `WidgetType::QuickNote => "quick_note"`
- TypeScript: `| 'quick_note'`

## 実装ファイル

| ファイル                                                        | 変更内容                           |
| --------------------------------------------------------------- | ---------------------------------- |
| `src/lib/components/arcagate/workspace/QuickNoteWidget.svelte`  | 新規                               |
| `src/lib/types/workspace.ts`                                    | `WidgetType` union に `quick_note` |
| `src-tauri/src/models/workspace.rs`                             | `WidgetType::QuickNote`            |
| `src/lib/components/arcagate/workspace/WorkspaceLayout.svelte`  | quick_note 登録                    |
| `src/lib/components/arcagate/workspace/WorkspaceSidebar.svelte` | quick_note サイドバー追加          |

## 受け入れ条件

- [ ] Workspace に Quick Note ウィジェットを追加できる
- [ ] テキスト入力が 500ms デバウンスで自動保存される
- [ ] ページリロード後もメモ内容が保持される
- [ ] 500 文字を超えたときに残り文字数警告が出る
- [ ] `pnpm verify` 全通過
