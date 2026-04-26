---
id: PH-20260426-317
status: todo
batch: 72
type: 改善
---

# PH-317: WidgetType 拡張 (clipboard_history / file_search) + Settings + Layout 登録

## 横展開チェック実施済か

- batch-69 / 71 と同じ手順（Rust enum / TS union / WIDGET_LABELS / Settings / Layout）

## 仕様

- WidgetType に `clipboard_history` / `file_search` 追加
- WIDGET_LABELS: 'クリップボード履歴' / 'ファイル検索'
- WidgetSettingsDialog 分岐
- WorkspaceLayout map 登録

## 受け入れ条件

- [ ] cargo test --lib widget_type roundtrip 緑
- [ ] WIDGET_LABELS 同期
- [ ] `pnpm verify` 全通過
