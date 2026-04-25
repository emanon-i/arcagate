---
id: PH-20260425-266
status: done
batch: 62
type: 改善
---

# PH-266: Stats ウィジェット

## 背景・目的

`launch_log` テーブルはすでに存在し、`cmd_get_frequent_items` IPC も実装済み。
これを活用して「よく使うアイテム Top N」を Workspace に表示するウィジェットを追加する。

## 仕様

### 表示内容

- よく起動するアイテム Top N（デフォルト 5 件）
- 各行: `[icon] [label] × [launch_count]回`
- クリックで起動（既存の `launchItem` IPC を使用）

### データソース

- `cmd_get_frequent_items(limit: i64) → Item[]` 既存 IPC を流用
- フロント: `src/lib/ipc/workspace.ts` の `getFrequentItems` を使用

### ウィジェット設定

- widget.config: `{ max_items: 5 }`
- WidgetSettingsDialog の `max_items` 設定を共用

### WidgetType 追加

- Rust: `WidgetType::Stats => "stats"`
- TypeScript: `| 'stats'`

## 実装ファイル

| ファイル                                                        | 変更内容                      |
| --------------------------------------------------------------- | ----------------------------- |
| `src/lib/components/arcagate/workspace/StatsWidget.svelte`      | 新規                          |
| `src/lib/types/workspace.ts`                                    | `WidgetType` union に `stats` |
| `src-tauri/src/models/workspace.rs`                             | `WidgetType::Stats`           |
| `src/lib/components/arcagate/workspace/WorkspaceLayout.svelte`  | stats 登録                    |
| `src/lib/components/arcagate/workspace/WorkspaceSidebar.svelte` | stats サイドバー追加          |

## 受け入れ条件

- [ ] Workspace に Stats ウィジェットを追加できる
- [ ] よく起動するアイテム Top N が表示される
- [ ] クリックでアイテムを起動できる
- [ ] max_items を設定で変更できる
- [ ] `pnpm verify` 全通過
