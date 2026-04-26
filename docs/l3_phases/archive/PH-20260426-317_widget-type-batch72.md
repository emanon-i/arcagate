---
id: PH-20260426-317
status: done
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

- [x] cargo test --lib widget_type roundtrip 緑（4 件 pass）
- [x] WIDGET_LABELS 同期（'クリップボード履歴' / 'ファイル検索'）
- [x] WorkspaceSidebar palette に追加（横展開で過去の exe_folder/daily_task/snippet も追加）
- [x] `pnpm verify` 全通過
