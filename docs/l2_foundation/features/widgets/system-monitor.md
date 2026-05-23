# System Monitor Widget (システムモニタ)

> widgetType: `system_monitor` / category: info / 配置画面: [Workspace](../screens/workspace.md)

## 目的

CPU / メモリ / ディスク / ネットワークのリソース使用状況を定期取得し、sparkline / bar / gauge で表示する widget。

## やること (必要処理)

- `refresh_interval_ms` 間隔 (default 2000ms) で `cmd_get_system_stats` / `cmd_get_disk_stats` / `cmd_get_network_stats` を呼ぶ
- metric ごとに表示 ON/OFF と chart type を切替
- history buffer (60 point) で sparkline を生成
- 3 回連続失敗で degraded UI 表示、in-flight guard で多重 fetch 防止

## やらないこと (禁止 / scope 外)

- プロセス別のリソース / CPU 温度 / バッテリ状態を表示しない
- refresh 間隔を 500ms 未満にしない
- 取得失敗を silent skip しない (連続失敗を track して劣化表示)
- 履歴を永続化しない (60 point の in-memory buffer のみ)

## 性能予算

- polling default 2000ms。複数 widget 配置時は backend 負荷が累積するため間隔に注意
- history buffer は 60 point 固定でメモリ有界

## 副作用 (state 変化 / persistence)

- widget config (`refresh_interval_ms` / `show_cpu` / `show_memory` / `show_disk` / `show_network` / 各 `*_chart_type` / `title`) を保存
- 読み取り専用

## 依存

- IPC: `cmd_get_system_stats` / `cmd_get_disk_stats` / `cmd_get_network_stats`
- config schema: `refresh_interval_ms` (500-10000, default 2000) / `show_cpu` / `show_memory` / `show_disk` / `show_network` / `cpu_chart_type` / `memory_chart_type` / `disk_chart_type` / `network_chart_type` ('sparkline' | 'bar' | 'gauge') / `title`
- backend: [System Monitor Service](../backend/system-monitor-service.md)

## 機能契約

### 設定デフォルト単一情報源 (PH-CF-500 D7)

config default は `src/lib/widgets/system-monitor/index.ts` の `SYSTEM_MONITOR_DEFAULTS`
const を **唯一の出所** とする。 widget 本体は `parseWidgetConfig(widget?.config,
SYSTEM_MONITOR_DEFAULTS)` で defaults を merge、 settings dialog は
`?? SYSTEM_MONITOR_DEFAULTS.<field>` で同 const を参照する (リテラル fallback 禁止)。

旧実装で widget が `disk_chart_type ?? 'bar'`、 settings が `?? 'gauge'` と乖離していた
ことが D7 真因 (クリーン config では widget が bar 表示、 設定を開くと gauge 表示で初回保存
で gauge に切り替わるという 「設定を開く前後で見た目が変わる」 instant-feedback rule 違反)。

機械検出: `scripts/audit-widget-default-config.sh` が widget body と settings dialog の
`?? <リテラル>` 不一致を fail-closed gate ([`_chrome-consistency.md`](./_chrome-consistency.md) §A7)。

## 既知の判断

- backend は `sysinfo` の `System` を Mutex で再利用 (CPU 差分計算のため。毎回 new は heavy)
- PH-CF-500 D7 (2026-05-23) で `SYSTEM_MONITOR_DEFAULTS` を一本化、 widget / settings の
  literal fallback を撤廃
