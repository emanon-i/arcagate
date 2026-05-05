# Foundation §3: 非機能要求

[foundation.md](./foundation.md) §3 詳細。

## 3. 非機能要求

| 要求           | 目標値                        | 技術的アプローチ                                                                                                             |
| -------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 常駐メモリ     | Idle時 Working Set 100MB以下  | Tauri v2（Electron比で大幅に軽量）+ rusqlite bundled                                                                         |
| 起動レイテンシ | ホットキー→UI表示 P95 2秒以内 | Tauri IPC (custom protocol) + SQLite WALモード + インデックス最適化                                                          |
| バイナリサイズ | 単体exe 20MB以下              | Tauri v2 + bundled SQLite。SvelteKitの小さいバンドルサイズ                                                                   |
| データ保存     | ローカル完結                  | SQLite（クラウド同期なし）                                                                                                   |
| CSP            | Tauri v2デフォルトCSP準拠     | `ipc:` / `asset:` スキームのみ許可。`unsafe-inline` / `unsafe-eval` 禁止。外部通信はM1では不要（発生時に個別ホワイトリスト） |

### SQLite PRAGMAs

```sql
PRAGMA journal_mode = WAL;       -- Write-Ahead Logging: 読み書き並行性向上
PRAGMA foreign_keys = ON;        -- 外部キー制約を有効化
PRAGMA busy_timeout = 5000;      -- ロック競合時 最大5秒待機
PRAGMA synchronous = NORMAL;     -- WALモードでの安全性とパフォーマンスのバランス
PRAGMA cache_size = -8000;       -- 8MB ページキャッシュ
```
