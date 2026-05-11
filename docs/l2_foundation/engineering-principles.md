# Arcagate エンジニアリング原則

Arcagate 固有の技術判断基準。一般的なベストプラクティスは省略する。

---

## フロント / バックエンド分担（Q-Tree）

新規コードを追加するとき、上から順に判定する:

1. OS レベルアクセス必要？ → **Rust**
2. ファイル / DB に触れる？ → **Rust**
3. 同時 100 件超処理？ → **Rust**
4. 16ms 以上 UI を止める可能性？ → **Rust**
5. アプリ再起動を跨いで状態必要？ → **Rust (DB) + フロント (表示)**
6. 上記すべて No → **フロント**

### 機能・処理の分類（現状）

| 機能                | 実行場所   | 根拠                        |
| ------------------- | ---------- | --------------------------- |
| アイテム起動        | Rust       | OS コマンド実行は Rust 必須 |
| ファイル watch      | Rust       | OS ネイティブ通知が必要     |
| テーマ CSS 変数適用 | フロント   | DOM 操作はフロント最適      |
| 検索フィルタ        | Rust (SQL) | SQL インデックスが有効      |
| タグ統計集計        | Rust (SQL) | GROUP BY は DB 側が効率的   |
| ドラッグ＆ドロップ  | フロント   | UI イベント処理はフロント   |
| アイコン抽出        | Rust       | Windows API / exe パース    |
| 起動履歴記録        | Rust (SQL) | 永続化は DB 側              |
| Git ステータス      | Rust       | CLI 実行は Rust が安全      |
| テーマ変換・編集    | フロント   | CSS var パースはフロント    |

---

## IPC 境界ルール

- 要求/応答 = `invoke`、プッシュ/ストリーム = `event`
- payload **< 10KB** 目安。超えるなら分割 or file-based
- スキーマは `ts-rs` で Rust struct → TS 型を自動生成
- 1 回の invoke で > 1s 見込みなら進捗 event 分割
- バックエンド呼び出しが > 50ms 見込みなら非同期 + ローディング UI 必須
- UI 応答目標: 入力 → 視覚 fb まで **< 100ms**

### IPC コマンド全列挙（58 コマンド）

#### config_commands.rs (8)

| コマンド                  | フロント側関数      |
| ------------------------- | ------------------- |
| `cmd_get_config`          | `getConfig`         |
| `cmd_set_config`          | `setConfig`         |
| `cmd_get_hotkey`          | `getHotkey`         |
| `cmd_set_hotkey`          | `setHotkey`         |
| `cmd_get_autostart`       | `getAutostart`      |
| `cmd_set_autostart`       | `setAutostart`      |
| `cmd_is_setup_complete`   | `isSetupComplete`   |
| `cmd_mark_setup_complete` | `markSetupComplete` |

#### item_commands.rs (18)

`cmd_create_item`, `cmd_list_items`, `cmd_search_items`, `cmd_search_items_in_tag`, `cmd_update_item`, `cmd_delete_item`, `cmd_toggle_star`, `cmd_count_hidden_items`, `cmd_get_library_stats`, `cmd_get_tags`, `cmd_get_tag_counts`, `cmd_get_item_tags`, `cmd_create_tag`, `cmd_update_tag`, `cmd_update_tag_prefix`, `cmd_delete_tag`, `cmd_auto_register_folder_items`, `cmd_extract_item_icon`

#### launch_commands.rs (4)

`cmd_launch_item`, `cmd_get_item_stats`, `cmd_list_recent`, `cmd_list_frequent`

#### theme_commands.rs (9)

`cmd_list_themes`, `cmd_get_theme`, `cmd_create_theme`, `cmd_update_theme`, `cmd_delete_theme`, `cmd_get_active_theme_mode`, `cmd_set_active_theme_mode`, `cmd_export_theme_json`, `cmd_import_theme_json`

#### workspace_commands.rs (13)

`cmd_create_workspace`, `cmd_list_workspaces`, `cmd_update_workspace`, `cmd_delete_workspace`, `cmd_add_widget`, `cmd_list_widgets`, `cmd_update_widget_position`, `cmd_update_widget_config`, `cmd_remove_widget`, `cmd_get_frequent_items`, `cmd_get_recent_items`, `cmd_get_folder_items`, `cmd_git_status`

#### watched_path_commands.rs (3)

`cmd_add_watched_path`, `cmd_get_watched_paths`, `cmd_remove_watched_path`

#### export_commands.rs (2)

`cmd_export_json`, `cmd_import_json`

---

## エラーハンドリング

**AppError 形式（IPC 境界での serialization）:**

```rust
// { code: string, message: string } として frontend に送る
// thiserror で enum、code() メソッドで文字列コードを返す
```

**禁止:**

- `let _ = result;` でエラー握り潰し
- main thread の IPC ハンドラで `unwrap()` / `expect()`
- toast に英語スタックトレース

**Arcagate 固有のパターン:**

- DB lock → 自動 3 回 + exponential backoff、最終失敗で toast
- watch 一時エラー → re-subscribe、上限で disabled 状態
- ファイル I/O 失敗 → アイテム灰色化 / 削除提案

---

## ログ標準

```rust
tracing::error!(
    file = file!(), line = line!(),
    target_id = %item.id,
    error = %e,
    next_action = "check item.path existence",  // ← 必須フィールド
    "launchItem failed"
);
```

- 保存場所: `%LOCALAPPDATA%\com.arcagate.desktop\logs\Arcagate.log`
- 形式: JSON lines（jq / grep しやすい）
- 14 日 daily rotate

---

## 依存 curated list（同役割で 2 つ以上採用しない）

| 役割              | 選定                                                            |
| ----------------- | --------------------------------------------------------------- |
| フロント状態管理  | Svelte 5 runes（`$state` / `$derived`）のみ。redux/zustand 不可 |
| 日付処理          | JS 標準 `Date` / `Intl`                                         |
| UUID              | `uuid` crate v7、フロントは受け取るだけ                         |
| CSS-in-JS         | なし（Tailwind + CSS 変数のみ）                                 |
| Rust HTTP         | 原則使わない（オフライン完結）                                  |
| Rust シリアライズ | `serde` + `serde_json`                                          |
| Rust エラー       | `thiserror` + `AppError` enum（`anyhow` は使わない）            |
| ロガー            | `tracing` + `tracing-subscriber`                                |
| ORM               | 不使用（rusqlite + 生 SQL）                                     |

新規依存追加の判断基準:

1. `std` / 既存依存で足りないか（3 分で書けるなら書く）
2. 最終更新 < 12 ヶ月、週次 downloads > 10k、ライセンス OK
3. exe 20MB / idle 120MB / 起動 2.5 秒の 3 目標を維持できるか

---

## リファクタ発動閾値

| 指標                  | 閾値                        |
| --------------------- | --------------------------- |
| 関数 LoC              | 50 warning / 100 refactor   |
| ファイル LoC          | 500 warning / 1000 refactor |
| Cyclomatic complexity | 10 warning / 20 refactor    |
| Fan-out               | 15 超                       |
| Duplicate code        | 5 行 × 3 箇所以上           |
| Deep nesting          | 4 レベル以上                |
| Parameter count       | 4 warning / 6 refactor      |
| Circular deps         | 存在で即 fail               |

---

## 新規機能ゲート

1. スコープ外に該当しない（クラウド同期 / 他 OS / ターミナル統合 等）
2. パフォーマンス目標を悪化させない
3. UX 仕様整合（`ux-standards.md`）
4. デザインシステム整合（`--ag-*` トークン使用、shadcn 手動編集なし）
5. 依存予算通過
6. 複雑度予算通過（既存 LoC / cyclomatic を悪化させない）
7. 1〜2 Plan で収まる規模

「**なくても毎日使えるか？**」で問う。Yes なら追加しない。

---

## 設計固定枠（変えない判断）

- レイヤー: `commands → services → repositories → DB`（逆禁止）
- Service Layer が全 IPC エントリーポイントの共通経路
- Repository 間の相互参照禁止
- `Mutex<Connection>` + WAL（プールは過剰）
- UUID v7 / `include_str!` でマイグレーション埋め込み
