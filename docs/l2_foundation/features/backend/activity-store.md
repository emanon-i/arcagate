# Activity Store Service

> backend feature (V2) / レイヤー: commands → service → repository → SQLite
> 統合データモデル: watcher 縦割りを否定し、時間軸で全信号を 1 つに合流させる

## 目的

活動ログの **統合時系列ストア**。 [Activity Recorder](./activity-recorder.md) が集めた窓 / 実操作 / メディア / ファイル操作を、 **単一の時間軸モデル**に蓄積・集約する backend feature。 ActivityWatch の「bucket が watcher ごとに分断され、 統合像が無い」 弱点を構造で潰す — 収集源が違っても「その時何をしていたか」 を横断で引ける 1 つのモデルにする。 DB 肥大を防ぐ retention を最初から組み込む。

## やること (必要処理)

- 時系列専用テーブルを migration で追加 (`include_str!` 埋め込み、 forward-only、 既存 item/workspace テーブルとは分離):
  - `activity_event` — 汎用イベント (source / event_type を持つ横断スキーマ)
  - `file_event` — ファイル操作 (path / 変更種別)
  - `system_metric` — CPU/RAM/disk/net の時系列 (第 2 段の SystemMonitor 履歴化と共有)
- `activity-summary` skill と同型の **source-agnostic schema** を採る (将来 AW も同じ表に食える):

```sql
CREATE TABLE activity_event (
  id           INTEGER PRIMARY KEY,
  ts           INTEGER NOT NULL,          -- unix ms
  duration_ms  INTEGER NOT NULL DEFAULT 0,
  source       TEXT NOT NULL,             -- 'window' | 'input' | 'media' | 'file' | (将来 'activitywatch')
  event_type   TEXT NOT NULL,             -- 'app_focus' | 'afk' | 'media_play' | 'file_*'
  app          TEXT,                      -- プロセス名
  exe_path     TEXT,                      -- 実行イメージパス (item 照合キー)
  title        TEXT,                      -- 窓タイトル / 曲名 (mask 可)
  url_domain   TEXT,                      -- ドメイン粒度のみ (候補信号)
  confidence   TEXT,                      -- item 照合の 'high'|'medium'|'low'
  match_reason TEXT                       -- 'exe_path_exact' | 'domain_exact' | 'title_heuristic'
);
CREATE INDEX idx_activity_event_ts ON activity_event(ts);

CREATE TABLE file_event (
  id       INTEGER PRIMARY KEY,
  ts       INTEGER NOT NULL,
  path     TEXT NOT NULL,
  kind     TEXT NOT NULL,                 -- 'create' | 'edit' | 'delete' | 'rename'
  old_path TEXT,                          -- rename の旧 path
  ext      TEXT,                          -- 拡張子 (分布集計用)
  source   TEXT NOT NULL                  -- 'usn' | 'rdcw'
);
CREATE INDEX idx_file_event_ts ON file_event(ts);
CREATE INDEX idx_file_event_path ON file_event(path);
```

- **セッション集約 `sessionized_activity`**: 生イベントを畳んで表示用の帯 (連続する同種イベント) にする。 1 行 = 1 セッション (`started_at` / `ended_at` / `primary_app` / `primary_category` / `active_seconds`)。 タイムラインを点列でなく連続帯で描くため。 セッション境界は「前面アプリ/カテゴリ切替」 と「AFK 区間」 で切る。 生イベントから常に再生成可能に保つ
- **retention / downsampling ジョブ** (recorder とは別の定期タスク): 生 1 日 → 1 分平均 1 週 → 1 時間平均 1 年。 古い生データを prune。 縮約は指標ごとに `sum` (合計時間) / `max` (ピーク) / `p95` (負荷分布) を使い分ける
- item 照合 (真の利用頻度 / 未登録レコメンド / tag 自動カテゴリ) の集計経路を提供 (PH-PQ-800 §item model 連携)

## やらないこと (禁止 / scope 外)

- watcher ごとに別 DB / 別 schema に分けない (統合モデルが本 feature の存在理由)
- 集約結果を唯一の真実にしない — 生イベントから常に再生成できること (集約ロジック変更時に過去分を作り直せる)
- naive に INSERT し続けない — retention 無しは SQLite 肥大で破綻する (最初から downsampling 前提)
- 縮約で可視化品質を落とさない — 縮約後の **日次合計の誤差 < 2% / カテゴリ比率の誤差 < 3%** を自動テストで担保
- 外部 DB / 時系列 DB (InfluxDB 等) を導入しない — 既存 `Mutex<Connection>` + WAL に乗せる (設計の固定枠)

## 性能予算

- timestamp index 専用テーブル。 高頻度 INSERT に耐える軽量 write
- downsampling / prune は低頻度の定期ジョブで、 recorder の収集をブロックしない
- 長期運用で DB サイズが上限内に収まることを検証 (retention の実効性)

## 副作用 (state 変化 / persistence)

- `activity_event` / `file_event` / `system_metric` / `sessionized_activity` への write
- downsampling ジョブによる集約テーブル生成 + 生データ prune

## 依存

- crate: `rusqlite` (`bundled`) / `rusqlite_migration`
- feature: [Activity Recorder](./activity-recorder.md) (書き込み元) / [Activity CLI](./activity-cli.md) (読み出し・export) / [Activity 画面](../../screens/activity.md) (表示) / [System Monitor Service](./system-monitor-service.md) (第 2 段で履歴を統合)
- 過去 audit: `docs/l3_phases/audit/PERSONAL_DATA_LEAK_AUDIT_2026-05-20.md` (新規時系列テーブルを点検)

## 既知の判断

- **source-agnostic schema** を採り、 `activity-summary` skill / 将来 ActivityWatch と同型にする (乗り換え・併存を初期から想定)
- **file_event を 1 級テーブルに独立**させる (V2 差別化の芯。 path/kind/ext を明示列に持ち、 「フォルダ別件数」「拡張子分布」 を後から引ける)
- item 照合は `confidence` + `match_reason` を保存し、 低信頼は UI で修正可能にする (誤マッチを黙って集計に混ぜない)
