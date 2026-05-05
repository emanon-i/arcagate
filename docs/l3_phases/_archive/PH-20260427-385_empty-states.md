---
id: PH-20260427-385
status: done
batch: 86
type: 改善
era: Polish Era
---

# PH-385: 空状態デザイン（Library / Workspace / Palette）

## 参照した規約

- `docs/l1_requirements/ux_standards.md` 状態定義: hover / focus / active / **disabled / empty**
- `docs/l0_ideas/arcagate-engineering-principles.md` §9 主観オラクル「わかる」「初回起動〜最初のアイテム登録までの手数 3 操作以内」
- 通常使用時に「何もない」状態は十分に起こりうる UX 観点

## 横展開チェック実施済か

- batch-65 で Library カード仕様を完成、batch-83/84 で widget folder colocation
- 空状態の実装は現状未整備（Library アイテム 0 / Workspace widget 0 / Palette 検索 0 件）

## 仕様

### Library 空状態

`LibraryMainArea.svelte` で `items.length === 0` のとき:

- アイコン (Lucide `PackageOpen` 等)
- 主文言: 「まだアイテムがありません」
- 副文言: 「『+ アイテム追加』ボタン または ファイルを D&D で登録できます」
- CTA ボタン: 「+ アイテム追加」（既存ボタンへスクロール or focus）

### Workspace 空状態

`WorkspaceLayout.svelte` で `widgets.length === 0` のとき:

- アイコン (`LayoutGrid`)
- 主文言: 「ウィジェットを追加しましょう」
- 副文言: 「編集モードに入って『+』からよく使うものを並べてください」
- CTA: 「編集モード開始」（startEdit 呼び出し）

### Palette 空状態

`PaletteSearchResults.svelte`（または該当）で `results.length === 0 && query !== ''` のとき:

- アイコン (`SearchX`)
- 主文言: 「『{query}』に一致するアイテムはありません」
- 副文言: 「タグや別の単語で検索するか、Library から登録してください」

### 共通空状態コンポーネント

`src/lib/components/common/EmptyState.svelte` を新設:

```typescript
interface Props {
  icon: Component;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}
```

## 受け入れ条件

- [x] EmptyState.svelte 共通コンポーネント新設
- [x] Workspace で適用（Library / Palette は batch-87 PH-390 に持越）
- [x] `data-testid="workspace-empty-state"` 付与
- [ ] e2e: batch-87 PH-390 で追加（Workspace 空 → widget 追加 → 通常表示）
- [x] `pnpm verify` 全通過

## 完了ノート（batch-86）

partial 完走として扱い、Library 既存空状態統合と Palette 検索空状態は batch-87 PH-390 に分離。
理由: 1 PR = 1 構造的テーマの維持と差分肥大化の回避。

## SFDIPOT 観点

- **F**unction: 「0 件 → 1 件」遷移の reactivity が即時
- **U**ser expectations: 何もない時に「次に何をすべきか」が明示される
- **I**mage: 業界標準の empty state パターン（icon + title + description + CTA）に合致
