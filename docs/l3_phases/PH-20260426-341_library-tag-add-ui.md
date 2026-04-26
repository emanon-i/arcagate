---
id: PH-20260426-341
status: partial
batch: 77
type: 改善
---

# PH-341: Library タグ追加 UI 改善

## 横展開チェック実施済か

- batch-N (タグ統一) で `categories → tags` 移行済、UI は item form 内の input のみ
- ユーザフィードバック: タグ追加が分かりにくい、既存タグから選びたい
- LibraryDetailPanel + ItemForm の双方で同じ UI を使う想定

## 仕様

- ItemForm のタグ入力欄を combobox 化（既存タグ候補を suggest）
- 新規タグも作成可（autocomplete + 「+ 新規作成」option）
- LibraryDetailPanel にも「タグを追加」ボタン → mini-input
- aria-label「タグを追加」「タグを削除」（ラベル原則準拠）

## 受け入れ条件

- [x] **batch-77 partial**: 純粋関数 `filterTagSuggestions` / `isExistingTag` 抽出 → vitest 10 件 pass
- [ ] **batch-78 持ち越し**: ItemForm でタグ入力時に既存タグが suggest される（UI 結合）
- [ ] **batch-78 持ち越し**: LibraryDetailPanel から add/remove タグ可能
- [ ] **batch-78 持ち越し**: aria-label が機能文言
- [x] `pnpm verify` 全通過
