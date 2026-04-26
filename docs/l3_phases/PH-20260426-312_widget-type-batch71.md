---
id: PH-20260426-312
status: todo
batch: 71
type: 改善
---

# PH-312: WidgetType 拡張 + WidgetSettingsDialog 分岐 + WorkspaceLayout 登録

## 横展開チェック実施済か

- batch-69 の exe_folder 追加と同じパターン（Rust enum / TS union / map / Settings 分岐）
- WIDGET_LABELS ラベル原則準拠（機能ベース）

## 仕様

- WidgetType に 'daily_task' / 'snippet' 追加
- Rust enum + TS union 同期
- WIDGET_LABELS に追加（'デイリータスク' / 'スニペット'）
- WidgetSettingsDialog 分岐追加
- WorkspaceLayout の widgetComponents map 登録

## 受け入れ条件

- [ ] WidgetType roundtrip テスト緑
- [ ] ウィジェット追加 UI に新規 2 種が候補として出る
- [ ] `pnpm verify` 全通過
