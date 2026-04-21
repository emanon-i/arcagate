---
status: todo
phase_id: PH-20260422-022
title: LibraryCard にアイコン表示
depends_on:
  - PH-20260422-021
scope_files:
  - src/lib/components/arcagate/library/LibraryCard.svelte
parallel_safe: true
---

# PH-20260422-022: LibraryCard アイコン表示

## 目的

`LibraryCard` がアイコンを表示していないため、同じラベルのアイテムが並ぶと識別しにくい。
`ItemIcon` コンポーネントを使ってアイコンを表示し、視認性を高める。

## 現状

`LibraryCard.svelte` はアイテムの label・target などを表示しているが、
`item.icon_path` を活用していない（アイコン表示なし）。

## 設計判断

- `ItemIcon` を LibraryCard の左側に配置（h-8 w-8 程度）
- `item.icon_path` がある場合は実機アイコン、ない場合は `item.item_type` のフォールバックアイコン
- カードのレイアウトは `flex items-center gap-3` に変更（現状の縦並びから横並びへ）

## 実装ステップ

### Step 1: LibraryCard.svelte を読む

現状のレイアウトを確認してから最小限の変更を加える。

### Step 2: ItemIcon 追加

```svelte
<ItemIcon
    iconSrc={item.icon_path ?? null}
    itemType={item.item_type}
    class="h-8 w-8 shrink-0 rounded"
/>
```

### Step 3: pnpm verify

## コミット規約

`feat(PH-20260422-022): LibraryCard に ItemIcon 表示追加`

## 受け入れ条件

- [ ] `pnpm verify` 通過
- [ ] LibraryCard にアイコンが表示されること
- [ ] icon_path なしのアイテムでも item_type 別フォールバックアイコンが表示されること
- [ ] 既存の LibraryCard テスト（E2E）が壊れないこと

## 停止条件

- LibraryCard の大幅レイアウト変更が必要で E2E テストが 3 本以上失敗 → 停止して報告
