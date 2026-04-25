# リファクタリング機会優先度レポート

作成日: 2026-04-25 / batch-59 PH-253

## 優先度 A（即修正対象）

**現時点で該当なし。**

- レイヤー違反: なし ✅
- 循環依存: なし ✅
- 未使用クレート: なし ✅

## 優先度 B（次回バッチで対応推奨）

### B-1: 大型コンポーネントの段階的分割

| ファイル                    | 行数 | 分割案                           |
| --------------------------- | ---- | -------------------------------- |
| `LibraryDetailPanel.svelte` | 333  | アイテムフォームと詳細表示を分離 |
| `WorkspaceLayout.svelte`    | 310  | ズーム操作ロジックを hook に抽出 |
| `LibraryMainArea.svelte`    | 279  | DnD 受け入れロジックを分離       |

**注意**: 現状テスト済みで安定。E2E が壊れないよう慎重に。

### B-2: `paletteStore` の複雑度低減

`paletteStore` は `itemStore`, `toastStore` に依存し、3 つの IPC モジュールを直接使用。
State の依存関係を整理し、IPC 呼び出しを 1 つにまとめることを検討。

## 優先度 C（監視継続）

### C-1: Rust `watcher/mod.rs` の責務（凍結）

現在 watcher が repositories を直接参照（`item_repository`, `watched_path_repository`）。
`services/watched_path_service.rs` が `watcher::WatcherState` を import しているため、
`watcher` → `services` の依存追加は循環依存になる（PH-258 検証済み）。
サービス層経由化は不可。現構造を維持する。

### C-2: `cmd_extract_item_icon` の同期 IPC

現在同期実行。アイテム数が増えると起動時の UI ブロッキング原因になる可能性。
将来的に `async` + spawn_blocking を検討。

## 凍結（変更禁止）

以下は**意図的な設計判断**であり、リファクタ対象外:

| 設計                              | 理由                                                       |
| --------------------------------- | ---------------------------------------------------------- |
| `Mutex<Connection>` 単一 DB 接続  | WAL モードで読み取り並行性を確保。個人アプリにプールは過剰 |
| `include_str!` migration 埋め込み | 実行時の外部ファイル依存なし                               |
| `AppError` 文字列シリアライズ     | フロントで文字列として受信するシンプルな設計               |
| UUID v7 (TEXT型)                  | 時刻ソート可能 + インポート時の衝突回避                    |
| ORM なし（rusqlite + 生SQL）      | ORM 導入は禁止済み                                         |
| shadcn-svelte `ui/` 手動編集禁止  | scaffold 出力のため                                        |

## タグシステム現状 (batch-61 PH-263 調査)

### 結論: Favorites → sys-starred 統合は完了済み

`FavoritesWidget.svelte` はすでに `searchItemsInTag('sys-starred', '')` を使用しており、
追加の統合作業は不要。

### タグ種別一覧

| タグ ID 形式      | is_system | 用途                       | 付与タイミング       |
| ----------------- | --------- | -------------------------- | -------------------- |
| `sys-type-{type}` | 1         | アイテム種別フィルタ       | アイテム作成時に自動 |
| `sys-ws-{ws_id}`  | 1         | ワークスペース別（未活用） | migration 時に生成   |
| `sys-starred`     | 1         | お気に入り                 | `toggle_star` IPC で |
| ユーザー定義タグ  | 0         | 任意分類                   | ユーザー操作         |

### 未活用資産: sys-ws-* タグ

`sys-ws-{workspace_id}` タグは migration で生成済みだが、
アイテムへの付与・フィルタ UI が未実装。
batch-62+ で「ワークスペース別アイテム絞り込み」実装時に活用可能。

## 次バッチへの入力

batch-60 以降の整理系 Plan 候補:

1. `LibraryDetailPanel.svelte` の分割（B-1 上位）
2. `paletteStore` 依存整理（B-2）
3. `watcher/mod.rs` のサービス層経由化（C-1）
4. `sys-ws-*` タグを使ったワークスペース別アイテムフィルタ（batch-62+）
