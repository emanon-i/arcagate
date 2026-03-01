---
status: pending
sub_phase: PH-003-D
feature_id: F-20260226-013
priority: 4
---

# PH-003-D: ファイルシステム監視・パス自動追跡

**対応REQ**: REQ-20260226-009
**元機能**: F-20260226-013

登録済みアイテムのパス変更を自動追跡し、リンク切れを防止する。
`notify` クレートを使ってバックグラウンドスレッドでリアルタイム監視を行う。

## 技術要素

- `notify = "7"` クレート（`notify::recommended_watcher`）
- `watched_paths` テーブルで監視対象フォルダを管理
- Tauri アプリ内バックグラウンドスレッドとして常駐
- パス消失時: IPC イベント（`item://path-not-found`）→ フロントエンドで警告バッジ表示

## DB マイグレーション

`src-tauri/migrations/003_watched_paths.sql`:

```sql
CREATE TABLE IF NOT EXISTS watched_paths (
    id TEXT PRIMARY KEY,
    path TEXT NOT NULL UNIQUE,
    label TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

## アーキテクチャ

```
AppState
└── FileWatcher (バックグラウンドスレッド)
    ├── watched_paths テーブルから監視対象を読み込み
    ├── notify::recommended_watcher でイベント受信
    └── パス変更検知 → ItemService.update_path() 呼び出し
                    → IPC イベント発火
```

## 受け入れ条件

- [ ] 登録済みアイテムの exe パスが移動・リネームされた場合、同一ドライブ内で自動追跡できる
- [ ] パスが見つからないアイテムに警告マーク（⚠）が表示される
- [ ] ユーザーに手動でのパス修正を促す通知（トースト）が出る
- [ ] 設定画面から監視対象フォルダを追加・削除できる
- [ ] `pnpm verify` が全通過する
