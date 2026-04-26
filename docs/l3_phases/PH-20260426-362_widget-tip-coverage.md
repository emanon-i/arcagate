---
id: PH-20260426-362
status: todo
batch: 81
type: 改善
---

# PH-362: 各ウィジェットの空状態 hint 強化

## 横展開チェック実施済か

- ClipboardHistory / FileSearch / ExeFolder の「未設定」状態の文言が薄く、初見で何をすべきか分からない可能性
- `Tip` コンポーネントが既存（library / workspace で使用中）

## 仕様

- ClipboardHistory: 履歴 0 件時に「コピーすると ここに溜まります」+ ↑ アイコン付き Tip 化
- FileSearch: root 未設定時の「ルートを選択」ボタンを `Tip` でラップして説明追加
- ExeFolder: `watch_path` 未設定時に「監視フォルダを設定 → exe が自動で表示されます」の Tip
- 既存の薄い `<p class="text-xs text-muted">` を accent 強めの Tip に置き換え

## 受け入れ条件

- [ ] 3 widget の空状態 Tip 化
- [ ] 文言が action-oriented（次のステップが明確）
- [ ] `pnpm verify` 全通過
