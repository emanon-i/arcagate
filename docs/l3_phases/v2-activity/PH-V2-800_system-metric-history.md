---
id: PH-V2-800
status: planning
batch: v2-activity
type: 新機能
era: Post-v1 (v2)
parent: README.md
---

# PH-V2-800: (第 2 段) system metric 履歴 + 原因候補ビュー

## 目的

V2 core (M4) 完成後の第 2 段。既存 SystemMonitor widget の in-memory・揮発な現在値を、100 の永続時系列
(`system_metric`) に統合し、「過去 1 週間の CPU 推移」等の履歴を可能にする。加えて「マシンが重い時、何が
食っているか」を逆引きする原因候補ビューを Activity 画面に足す。core 出荷をブロックしない後追い phase。

## スコープ

### やること

- **system metric 時系列化**: CPU / RAM / disk / network を `system_metric` (100 で追加済) に timestamp 付き
  蓄積。retention / downsampling は 100 (正本 activity-store.md) の既定ジョブに相乗り (第 2 段専用の別窓を作らない)
- **SystemMonitor widget 履歴化**: 既存 in-memory sparkline buffer (`src/lib/utils/history-buffer.ts`) を
  永続時系列に置き換え。「過去 1 週間」等の時間レンジ切替を widget config に追加。現在値スナップショット
  表示は維持しつつ履歴グラフへ拡張
- **プロセス別リソース消費**: アプリ別 CPU / RAM をプロセス性能カウンタから取得 (recorder の poll に相乗り)
- **原因候補ビュー** (Activity 画面 (6) に追加): 相関を「グラフ 2 つ並べる」で終わらせず、`CPU ピーク時刻 →
  その時の前面アプリ → 同時刻の上位プロセス → 各プロセスの実行時間` を 1 パネルにまとめ「なぜ重かったか」の
  候補を提示。「見るだけ」で終わらず「次に何をすればいいか」(重いプロセスを止める等) まで分かる画面にする

### やらないこと (stretch / scope 外)

- **GPU プロセス別 / 発熱 (温度) / 電力** — 取得 API が不安定・ハードウェア/ベンダ依存。本フェーズの必達に
  含めず「取れたら入れる」stretch (T3-stretch 相当)
- **エンタープライズ observability** — アラート / 閾値通知 / 異常検知をしない (Datadog 沼回避)
- **新パラダイム追加** — 既存 widget / 画面システムに乗せる

## 依存

- 先行: PH-V2-050 (システムメトリクス全体 + プロセス別リソースの採用取得方式を確定表から受ける) /
  PH-V2-100 (`system_metric` テーブル + retention) / PH-V2-200 (recorder poll に相乗り) /
  PH-V2-600 (原因候補ビューを載せる Activity 画面)。**着手は M5 (700 の低負荷ゲート確定) 後** —
  プロセスカウンタ取得を相乗りさせるため 700 のゲートを基準に再計測する
- 関連: `system-monitor-service` / 既存 SystemMonitor widget (`src/lib/widgets/system-monitor/`)
- 後続: なし (core 完成後の後追い、v2.x で回せる)

## 受け入れ条件 (機械検出)

- [ ] system metric (CPU/RAM/disk/net) が `system_metric` に時系列蓄積され、100 の downsampling に相乗りする
- [ ] SystemMonitor widget が永続時系列ベースの履歴表示に移行 (in-memory buffer 置換)、時間レンジ切替が動作、
      現在値スナップショット表示を維持
- [ ] アプリ別 CPU/RAM が取得・表示される
- [ ] 原因候補ビューが「CPU ピーク時刻 → 前面アプリ → 同時刻の上位プロセス → 実行時間」を 1 パネルで表示。
      **機械検証**: 既知のピークを埋めた seed に対し逆引きクエリが期待した前面アプリ / 上位プロセス行を返す
      ことを自動テストで確認 (「次アクションにつながる」の定性判定はその上に乗せる)
- [ ] GPU/熱/電力は stretch 扱いで、未達でも本フェーズ完了可
- [ ] 稼働中 CPU 増分が引き続き平均 1% 未満 (プロセスカウンタ取得を相乗りさせても超えない)

## 検証方針

- 履歴化は seed した system_metric で時間レンジ切替 → グラフ描画を agent dev で screenshot 目視 (`dom-not-fixed`)
- 原因候補ビューは高負荷を実機で起こし、逆引きパネルがピーク時刻の前面アプリ / 上位プロセスを出すか検証
- 低負荷は 700 のゲートを再計測 (相乗り取得で 1% を割らないこと)

## リスク

- **プロセスカウンタで重くなる**: 相乗り取得が負荷制約を割る → poll 低頻度・相乗りに限定、700 ゲート再計測
- **GPU/熱/電力の沼**: 不安定 API に引きずられる → stretch に隔離し必達から外す
- **相関の見せ方**: グラフ 2 枚並べで終わると「なぜ重いか」が伝わらない → 逆引き 1 パネルを要件に固定

## 横展開

- `system_metric` は 100 の retention / downsampling を共有 (第 2 段専用の別 retention を作らない)
- 原因候補ビューは Activity 画面 (600) の (6) に載せる (別画面を新設しない)
- 低負荷ゲート (700) を再適用 (相乗り取得後も CPU 増分 < 1%)

## 参照

- 正本: [`activity-store.md`](../../l2_foundation/features/backend/activity-store.md) (`system_metric` / retention 共有)
- 構想: [`PH-PQ-800 §スコープ 2/3 / T3 / T7`](../paid-quality/PH-PQ-800_personal-observability.md)
- 既存: `src/lib/widgets/system-monitor/` / `src/lib/utils/history-buffer.ts` / `system-monitor-service`
- 過去検討: `docs/l3_phases/_archive/PH-20260426-322_system-monitor-history-disk.md`
- 低負荷ゲート: [`PH-V2-700`](./PH-V2-700_privacy-nonfunctional-gate.md)
