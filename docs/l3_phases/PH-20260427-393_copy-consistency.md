---
id: PH-20260427-393
status: todo
batch: 87
type: 改善
era: Polish Era
---

# PH-393: コピー（言い回し）統一 + マイクロインタラクション残

## 参照した規約

- `docs/l1_requirements/ux_standards.md` 言語ポリシー
- batch-86 PH-387 で深追いせず deferred したマイクロインタラクション 主要 10 箇所 review

## 横展開チェック実施済か

- 全画面のボタンラベル / トースト文言 / エラーメッセージ / placeholder の言い回しを統一
- 「保存した」「保存しました」「保存完了」等のばらつきを 1 つに収束

## 仕様

### コピー統一ルール（候補）

- **完了動詞**: 「〜した」（カジュアル） vs 「〜しました」（丁寧） → **「〜しました」** に統一
- **エラー**: 「失敗」「エラー」 → コンテキスト次第で使い分け（業務不能=エラー、一時失敗=失敗）
- **削除確認**: 「〜を削除しますか？」「〜を削除？」 → 「〜を削除しますか？」に統一
- **空状態**: 「〜がありません」「〜なし」 → 「〜がありません」に統一

### マイクロインタラクション主要箇所 review

batch-86 PH-387 の deferred 残:

- WorkspaceLayout（編集モード切替、widget add ボタン）
- LibraryMainArea（ソート / ビュー切替 / + アイテム追加）
- Palette（モード切替、検索）
- Settings（カテゴリナビ、保存ボタン）

各箇所で:

- hover: surface change 1 段
- focus-visible: ring-2 ring-accent
- active: scale-[0.98] (motion-reduce 抑制)

不一致は同コミットで修正、すでに揃っていたら確認のみ。

## 受け入れ条件

- [ ] コピー統一ルール 4 件を全画面で適用（grep + 個別 review）
- [ ] マイクロインタラクション主要 10 箇所 review、不一致 ≤ 2
- [ ] e2e リグレッション 0
- [ ] `pnpm verify` 全通過

## SFDIPOT 観点

- **C**laims: 言い回しの一貫性 = アプリの主張一貫性
- **U**ser expectations: 同じ動作には同じ言葉
- **P**roduct internal consistency: 画面間の調和
