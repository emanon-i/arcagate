---
id: PH-20260426-336
status: todo
batch: 76
type: 改善
---

# PH-336: ウィジェット `role="group"` 周辺の追加 a11y 改善

## 横展開チェック実施済か

- batch-75 で WIDGET_LABELS を単一情報源化、aria-label に渡す経路は完成
- 残り: ウィジェット内の主要ボタン（移動 / 削除）の aria 関連改善 + キーボード操作 hint

## 仕様

- WorkspaceWidgetGrid の `role="group"` div に `aria-label`（既存）+ `tabindex="0"` を追加してフォーカス可能化
- 選択中ウィジェットを Tab でフォーカスできるようにする
- 削除確認ダイアログの open 時に `aria-describedby` を持たせ、説明文を screenreader に通知
- 移動ハンドルは `role="button"` を明示し、Enter / Space 押下で move modal 起動（任意、scope 大なら遅延）

## 受け入れ条件

- [ ] role="group" が tabindex 持ち、Tab 移動可能
- [ ] aria-describedby で説明が紐づく
- [ ] svelte-check + biome 全通過
