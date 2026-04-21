---
status: wip
phase_id: PH-20260422-021
title: ItemIcon フォールバック（item_type 別デフォルトアイコン）
depends_on:
  - PH-20260422-001
scope_files:
  - src/lib/components/arcagate/common/ItemIcon.svelte
parallel_safe: true
---

# PH-20260422-021: ItemIcon フォールバック改善

## 目的

`ItemIcon.svelte` は `iconSrc` が null/空の場合に何も表示しない（空白）。
item_type に応じたデフォルトアイコンを表示することで、
アイコン未設定アイテムの視認性を向上させる。

## 現状

```svelte
<!-- ItemIcon.svelte（推定）-->
{#if iconSrc}
    <img src={iconSrc} ... />
{/if}
```

アイコンなし → 空白のまま。

## 設計判断

- Lucide アイコンを item_type 別に割り当て（`lucide-svelte` は既存依存）
- フォールバックマッピング:
  - `url` → `Globe`
  - `folder` → `Folder`
  - `file` → `FileText`
  - `app` → `AppWindow`
  - `command` → `Terminal`
  - unknown / undefined → `Box`
- アイコンサイズは `class` prop で制御（既存インターフェース維持）
- 実機アイコン（`iconSrc`）がある場合は引き続き `<img>` を優先

## 実装ステップ

### Step 1: ItemIcon.svelte を読む

現在の実装を確認してから変更する。

### Step 2: フォールバック実装

`iconSrc` がない場合に Lucide コンポーネントを表示する分岐を追加。
`item_type` prop を追加（既存の呼び出し元との互換性は optional で保持）。

### Step 3: pnpm verify + svelte-check WARNING 0 確認

## コミット規約

`feat(PH-20260422-021): ItemIcon に item_type 別フォールバックアイコン追加`

## 受け入れ条件

- [ ] `pnpm verify` 通過（svelte-check WARNING 0）
- [ ] iconSrc なし + item_type 指定時に対応アイコンが表示されること
- [ ] iconSrc あり時は img が優先されること
- [ ] 既存の ItemIcon 利用箇所（FavoritesWidget 等）が壊れないこと

## 停止条件

- ItemIcon の呼び出し元が 20 ファイル以上あり一括変更が必要 → 停止して報告
