---
id: PH-20260427-387
status: done
batch: 86
type: 改善
era: Polish Era
---

# PH-387: ツールチップ統一 + マイクロインタラクション

## 参照した規約

- `docs/l1_requirements/ux_standards.md` 状態定義（hover / focus / active / disabled）
- batch-83/84 で shadcn Button の variant 体系が確立、Tooltip も `src/lib/components/ui/tooltip/` に scaffold 済

## 横展開チェック実施済か

- 既存 Tooltip 利用箇所を grep（多くの `title="..."` 属性 + 一部 shadcn Tooltip）
- アイコンボタンの hover state は一部一貫しない（active:scale / hover:bg の差）

## 仕様

### Tooltip 統一

`title="..."` HTML 属性で済ませている箇所（特にアイコンボタン）を shadcn Tooltip に置換:

- WorkspaceSidebar の widget palette（既に label 表示で重複だが、ホットキーや説明があれば追加）
- LibraryMainArea のソート / フィルタアイコンボタン
- WorkspaceLayout の編集モード切替ボタン
- Palette ヘッダのモードアイコン

### マイクロインタラクション統一

すべてのインタラクティブ要素で:

- **hover**: `hover:bg-[var(--ag-surface-hover)]` または同等
- **focus-visible**: `focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]`
- **active**: `active:scale-[0.98]` （motion-reduce 時は抑制）

`ux_standards.md` 違反があれば lint or e2e で機械検出する仕組みを検討（深追いしない、batch-86 では存在チェックまで）。

### 評価範囲

batch-86 では「ツールチップ 5 箇所統一 + マイクロインタラクション 主要 10 箇所 review」までを最低ライン。深追いはしない。

## 受け入れ条件

- [x] `title=` 属性 review 結果: hover tooltip としての利用は 0 件（Dialog/Component の prop のみ）→ shadcn Tooltip 化対象なし
- [ ] hover / focus-visible / active state の主要 10 箇所 review は batch-87 PH-394 に持越
- [x] e2e リグレッション 0
- [x] `pnpm verify` 全通過

## 完了ノート（batch-86）

Grep 結果の `title="..."` は全て Dialog/Component の prop（中身ラベル）であり、HTML title 属性としての hover tooltip は実質ゼロだった。
shadcn Tooltip の体系的導入は Polish Era の後続バッチで判断（必要性が顕在化したタイミングで）。

## SFDIPOT 観点

- **U**ser expectations: ホバー時の挙動が一貫
- **P**roduct internal consistency: 異なるコンポーネント間で hover / focus の演出が同じ
