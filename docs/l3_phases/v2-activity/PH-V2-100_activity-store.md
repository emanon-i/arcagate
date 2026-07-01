---
id: PH-V2-100
status: planning
batch: v2-activity
type: 新機能
era: Post-v1 (v2)
parent: README.md
---

# PH-V2-100: 統合時系列ストア基盤

## 目的

収集した全信号 (窓 / 実操作 / メディア / ファイル操作) を **単一の時間軸モデル**に合流させる基盤を先に
立てる。ActivityWatch の「bucket が watcher ごとに分断され統合像が無い」弱点を、収集側を書く前に
schema で潰す。以後の recorder (200) / collector (300) / 照合 (400) / CLI (500) / 画面 (600) は全て
この store の上に乗る。retention を最初から組み込み、DB 肥大での破綻を設計時に排除する。

## スコープ

### やること

- 時系列専用テーブルを migration で追加 (既存 item/workspace テーブルと分離、`include_str!` 埋め込み・
  forward-only)。テーブル構成・列・index の正本は
  [`activity-store.md`](../../l2_foundation/features/backend/activity-store.md):
  `activity_event` (source/event_type 横断) / `file_event` (1 級) / `system_metric` /
  `activity_category_rule` / 集約 `sessionized_activity`
- **source-agnostic schema**: `source` / `event_type` を持つ横断スキーマにし、将来 ActivityWatch や
  `activity-summary` skill 由来のデータも同じ表に食える形にする (乗り換え・併存を初期から想定)
- **セッション集約 `sessionized_activity`**: 生イベントを畳み、タイムラインを点列でなく連続帯で描ける
  集約テーブルを生成する。境界は「前面アプリ / カテゴリ切替」と「AFK 区間」。**生イベントから常に
  再生成可能**に保つ (集約結果を唯一の真実にしない)
- **retention / downsampling ジョブ** (recorder とは別の低頻度定期タスク): 縮約窓・prune の数値正本は
  activity-store.md / vision.md §4。指標ごとに `sum` / `max` / `p95` を使い分ける (平均だけだとピーク・
  カテゴリ比率が潰れる) — この集約関数の使い分けが本フェーズの設計判断
- レイヤーは既存固定枠 `commands → services → repositories → DB`。既存 `Mutex<Connection>` + WAL に
  乗せる (Pool / 外部時系列 DB を導入しない)
- read/集約 API を service 層に用意し、照合 (400) / CLI (500) / 画面 (600) が repository 直呼びせず使える

### やらないこと

- watcher ごとに別 DB / 別 schema に分けない (統合モデルが本 feature の存在理由)
- 集約結果を唯一の真実にしない — 生イベントから再生成できること
- naive INSERT の垂れ流し (retention 無し) をしない
- カテゴリを生イベント列に固定書き込みしない — 分類は `activity_category_rule` から集計時に決定論的に
  解決する (ルール変更で過去分も即反映)。ルールの投入・再適用ロジック自体は PH-V2-400
- 収集そのもの (recorder / collector) は本フェーズ外 (200 / 300)

## 依存

- 先行: なし (V2 の最下層基盤)
- 後続: 200 / 300 が write、400 / 500 / 600 が read。全 V2 フェーズがこの store に乗る

## 受け入れ条件 (機械検出)

- [ ] migration で時系列 5 テーブル + index が追加され、既存 item/workspace migration と分離、
      forward-only で `cargo test` の migration テストが pass
- [ ] `activity_event` / `file_event` が source-agnostic 列 (`source` / `event_type`) を持ち、
      複数 source 由来のイベントを同一表で時間順に引ける unit test が pass
- [ ] `sessionized_activity` が生イベントからセッション帯を生成し、**生イベントから再生成しても
      同一結果**になる unit test が pass (再生成冪等性)
- [ ] downsampling + prune ジョブが動作し、生成した高頻度ダミーデータで長期運用を模しても
      DB サイズが上限内に収まる (retention の実効性を検証)
- [ ] **縮約の可視化品質**: 縮約後の日次合計の誤差 < 2% / カテゴリ比率の誤差 < 3% を自動テストで検証
      (指標別に `sum` / `max` / `p95` を使い分けていることを含む)
- [ ] service 層に read/集約 API があり、repository 直呼び・repository 間相互参照が無いことを
      レイヤー audit で確認

## 検証方針

- 高頻度 INSERT の耐性は、実想定サンプリング間隔で N 日分のダミーイベントを流す fixture で計測
  (fixture warm ではなく実 disk・実 DB scale で。`perf-audit-before-measure` の教訓)
- 縮約品質は、縮約前後で同一クエリ (日次合計 / カテゴリ比率) を突き合わせる自動テストで数値担保
- retention は「生成 → 経過模擬 → prune → サイズ / 誤差確認」を 1 テストで通す

## リスク

- **縮約で可視化が劣化**: 平均一本での縮約はピーク・カテゴリ比率を潰す → 指標別集約関数を必須化し、
  誤差基準を自動テストで常設 (回帰で崩れたら fail)
- **集約が真実化**: 集約テーブルにしか無いデータが生まれると集約ロジック変更時に過去を作り直せない →
  生イベント保持窓内は常に再生成可能、集約は導出物という不変条件をテストで固定
- **schema が source 固有に寄る**: 窓信号に最適化しすぎると file_event / 将来 AW が乗らない →
  横断スキーマ + file_event 1 級独立を維持 (activity-store.md 既知の判断)

## 横展開

- 新規時系列テーブルを `PERSONAL_DATA_LEAK_AUDIT` 系の観点で点検 (追跡データが telemetry / crash /
  外部送信経路に混入しないこと) — 実検証は PH-V2-700 に集約するが、schema 設計時に leak 面を作らない
- 既存 `Mutex<Connection>` + WAL 固定枠を守り、Pool / 別 DB を持ち込まない (backend rule)

## 参照

- 正本: [`activity-store.md`](../../l2_foundation/features/backend/activity-store.md) (schema / retention / 集約)
- 非機能: [`vision.md`](../../l1_requirements/vision.md) §4 (retention / downsampling 数値)
- backend 固定枠: [`.claude/rules/backend.md`](../../../.claude/rules/backend.md)
- 過去 audit: `docs/l3_phases/audit/PERSONAL_DATA_LEAK_AUDIT_2026-05-20.md`
