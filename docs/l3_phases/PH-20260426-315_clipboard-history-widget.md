---
id: PH-20260426-315
status: todo
batch: 72
type: 改善
---

# PH-315: ClipboardHistoryWidget（クリップボード履歴、最近 N 件）

## 横展開チェック実施済か

- 既存 `tauri-plugin-clipboard-manager` を使う（Cargo.toml にすでにある）
- WidgetShell menuItems = 1「設定」即モーダル原則準拠
- batch-71 SnippetWidget の navigator.clipboard.writeText パターン踏襲

## 仕様

- 履歴 N 件（デフォルト 10）を widget config JSON に保存
- 監視はフロント polling: setInterval で `navigator.clipboard.readText()` を読み、
  前回と異なれば履歴に push（重複は dedupe）
- クリックで履歴項目を再度 clipboard にコピー + toast
- ✕ で個別削除、設定で max_items / 履歴クリア

## 受け入れ条件

- [ ] WidgetType 'clipboard_history' 追加
- [ ] 履歴 polling + dedupe + max_items 上限
- [ ] クリックで再コピー + toast
- [ ] menuItems = 1 即モーダル
- [ ] `pnpm verify` 全通過
