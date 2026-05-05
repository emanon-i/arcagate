---
id: PH-20260426-347
status: todo
batch: 78
type: 改善
---

# PH-347: タグ candidate suggest UI 結合（batch-77 PH-341 持越）

## 横展開チェック実施済か

- batch-77 で `filterTagSuggestions` / `isExistingTag` 純粋関数化済（vitest 10 件 pass）
- LibraryItemTagSection.svelte が既にタグ追加 UI を持っているので、そこに candidate dropdown を組み込む

## 仕様

- LibraryItemTagSection に検索 input 追加、入力に応じて `filterTagSuggestions` で suggest を出す
- candidate dropdown 表示、↑↓ で選択、Enter で確定（既存 + 新規両方）
- 「+ 新規作成」option を `isExistingTag(query) === false` のとき表示
- aria-label: 「タグを検索」「タグを追加」「タグを削除」（ラベル原則準拠）
- ItemForm でも同コンポーネント or 同思想を再利用検討

## 受け入れ条件

- [ ] タグ入力時に既存タグが suggest される
- [ ] 重複しない新規タグ作成 affordance（query が既存と一致しないとき）
- [ ] aria-label が機能文言
- [ ] `pnpm verify` 全通過
