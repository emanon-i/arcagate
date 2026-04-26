# リファクタリング機会優先度レポート

作成日: 2026-04-25 / batch-59 PH-253

## 優先度 A（即修正対象）

**現時点で該当なし。**

- レイヤー違反: なし ✅
- 循環依存: なし ✅
- 未使用クレート: なし ✅

## 優先度 B（次回バッチで対応推奨）

### B-1: 大型コンポーネントの段階的分割

batch-63 計測（complexity-baseline.md）による最新値:

| ファイル                    | 行数（batch-59） | 行数（batch-63） | 状態                         |
| --------------------------- | ---------------- | ---------------- | ---------------------------- |
| `LibraryDetailPanel.svelte` | 333              | ~140             | ✅ batch-60 で分割済み       |
| `WorkspaceLayout.svelte`    | 310              | 156              | ✅ batch-60 で hook 抽出済み |
| `LibraryMainArea.svelte`    | 279              | 199              | ⬜ 未整理（次の整理系候補）  |
| `SettingsPanel.svelte`      | 新規             | 345              | ⚠️ 300 超（成長注視）         |
| `workspace_repository.rs`   | 新規             | 466              | ⚠️ 500 warning 接近           |

**SettingsPanel.svelte** (345 行): 次の大型コンポーネント候補。機能別パネルへの分割を検討。

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

## batch-63 計測ベースライン追記（2026-04-25）

### バンドルサイズ（bundle-baseline.md 参照）

- フロントバンドル: 556KB (gzip 150KB) — vision 制約クリア ✅
- Rust バイナリ: 16.4MB (debuginfo 込み) — 20MB 制約クリア ✅

### 依存品質（dependency-quality.md 参照）

- 本番 npm: 脆弱性ゼロ ✅
- dev npm: 17 件（すべて devDep、本番影響なし）
- Rust: cargo-audit 未確認（cargo-deny 導入予定）

### 未使用 export（削除候補 batch-64 向け）

- IPC: exportJson/importJson, updateTagPrefix, getTheme, addWatchedPath/removeWatchedPath
- types: WIDGET_LABELS, types/index.ts バレルファイル
- file: docs/l0_ideas/arcagate_mockup_board.jsx

## 次バッチへの入力

batch-64 以降の整理系 Plan 候補（優先度順）:

1. `LibraryMainArea.svelte` の DnD ロジック分離（B-1 残件、199 行）
2. `SettingsPanel.svelte` の機能別コンポーネント分割（345 行、成長中）
3. `workspace_repository.rs` の監視（466 行、500 warning 接近）
4. 未使用 IPC export 6 件の削除（dependency-quality.md 参照）
5. `paletteStore` 依存整理（B-2、未着手）
6. cargo-deny 導入（Rust セキュリティ体系化）
7. `sys-ws-*` タグを使ったワークスペース別アイテムフィルタ（機能追加、ゲート確認要）

---

## batch-82 PH-367 計測更新（2026-04-26 / Refactor Era 計測フェーズ）

batch-63 から ~3 週間で 12 バッチ（69-81）が経過、肥大化が進行。**最新 baseline**:

### LoC top 10 推移（フロント）

| ファイル                      | batch-63   | batch-82 | 差分                              | 状態            |
| ----------------------------- | ---------- | -------- | --------------------------------- | --------------- |
| `WidgetSettingsDialog.svelte` | (新規)     | **583**  | 新規 + 9 widget 分岐肥大          | ⚠️ refactor 候補 |
| `WorkspaceLayout.svelte`      | 156        | **487**  | +331（pan / Del / dialog 等追加） | ⚠️               |
| `SettingsPanel.svelte`        | 345        | **455**  | +110                              | ⚠️               |
| `LibraryDetailPanel.svelte`   | ~140       | **381**  | +241（per-card override 等）      | ⚠️               |
| `ItemForm.svelte`             | (該当なし) | 347      |                                   | △               |
| `state/workspace.svelte.ts`   | 新規       | 338      |                                   | △               |
| `ThemeEditor.svelte`          | (該当なし) | 332      |                                   | △               |
| `WorkspaceWidgetGrid.svelte`  | 新規       | 318      | 8 ハンドル resize で増            | △               |
| `LibraryMainArea.svelte`      | 199        | 278      | +79                               | △               |
| `state/palette.svelte.ts`     | (該当なし) | 241      |                                   | △               |

### LoC top 10（Rust）

| ファイル                               | LoC       | コメント                                 |
| -------------------------------------- | --------- | ---------------------------------------- |
| `bin/arcagate_cli.rs`                  | **1,438** | 単一ファイル、サブコマンド単位で分割推奨 |
| `repositories/item_repository.rs`      | 685       | tag 関連を tag_repository.rs に分離検討  |
| `repositories/workspace_repository.rs` | 548       | 引き続き 500 warning 圏内                |
| `services/item_service.rs`             | 513       | 妥当（business logic）                   |
| `services/workspace_service.rs`        | 456       |                                          |
| `services/theme_service.rs`            | 384       |                                          |
| `repositories/tag_repository.rs`       | 372       |                                          |

### Refactor Era 4 フェーズへの振り分け

| ホットスポット                                              | 振り分け            |
| ----------------------------------------------------------- | ------------------- |
| `WidgetSettingsDialog` 解体（PH-351 deferred 着手）         | **batch-83 構造**   |
| widget folder-per-widget colocation（PH-350 deferred 着手） | **batch-83 構造**   |
| `WorkspaceLayout` 責務分離（pan / Del / context panel）     | **batch-83 構造**   |
| `SettingsPanel` カテゴリ別分割                              | **batch-83 構造**   |
| `LibraryCardSettings` を library/ 配下へ移動                | **batch-83 構造**   |
| `lib/utils/format-meta.ts` を items/ 配下へ移動             | **batch-83 構造**   |
| 確認ダイアログ重複（3 箇所 ~90 行）                         | **batch-84 簡素化** |
| `arcagate_cli.rs` 1,438 行 サブコマンド分割                 | **batch-84 簡素化** |
| `item_repository.rs` 685 行 tag 関連分離                    | **batch-84 簡素化** |
| 未使用 IPC export 6 件の削除（dependency-quality 参照）     | **batch-84 簡素化** |
| exe size 17.2 MB / 20MB 制約                                | **batch-85 性能**   |
| cargo bloat 上位 review                                     | **batch-85 性能**   |
| バンドル treemap                                            | **batch-85 性能**   |

### 計測ツール導入の判断

cargo bloat / madge / jscpd / cargo-udeps は構造フェーズで必要に応じて導入。
**計測フェーズではバッシュ + 既存ツールで baseline 取得、追加ツール導入は最小限**。
