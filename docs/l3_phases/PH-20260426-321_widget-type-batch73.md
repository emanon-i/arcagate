---
id: PH-20260426-321
status: todo
batch: 73
type: 改善
---

# PH-321: WidgetType 拡張 (system_monitor) + Sidebar / Settings / Layout 4 箇所同期

## 横展開チェック実施済か

- batch-72 で「Sidebar palette・WidgetSettingsDialog 分岐・WorkspaceLayout map・WIDGET_LABELS の 4 箇所同期が必須」を学習済み
- 全 4 箇所を本 Plan で同時更新する

## 仕様

- WidgetType 'system_monitor' を Rust enum + TS union に追加
- WIDGET_LABELS: 'システムモニタ'
- WorkspaceSidebar palette に Activity アイコンで追加
- WidgetSettingsDialog: refresh_interval_ms / show_cpu / show_memory / title 設定
- WorkspaceLayout widgetComponents map に SystemMonitorWidget 登録

## 受け入れ条件

- [ ] cargo test --lib widget_type roundtrip（5 件、新エントリ 1 件追加）
- [ ] WIDGET_LABELS 同期
- [ ] Sidebar palette 表示
- [ ] WidgetSettingsDialog 分岐
- [ ] `pnpm verify` 全通過
