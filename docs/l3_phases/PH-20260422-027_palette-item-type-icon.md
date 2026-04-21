---
status: wip
phase_id: PH-20260422-027
title: PaletteResultRow の itemType 渡し + WorkspaceLayout Safe mode 除去
depends_on: []
scope_files:
  - src/lib/components/arcagate/palette/PaletteResultRow.svelte
  - src/routes/+page.svelte
parallel_safe: true
---

# PH-20260422-027: PaletteResultRow の itemType 渡し + Safe mode ボタン除去

## 目的

1. `PaletteResultRow` の `ItemIcon` に `itemType` を渡していないため、アイコン読み込み失敗時に
   すべて `AppWindow` フォールバックになる。item_type 別の適切なアイコンにする。

2. `+page.svelte` の Workspace ビューで表示される "Safe mode" ボタン（TitleAction）が
   `onclick` なしの dead code になっており、ユーザーが押しても何も起きない。
   Library ビューと同じ「非表示アイテム表示切替」ボタンに統一する。

## 現状

```svelte
<!-- PaletteResultRow.svelte: itemType を渡していない -->
<ItemIcon iconPath={entry.item.icon_path} alt="" class="h-6 w-6 object-contain" />

<!-- +page.svelte: workspace ビューで dead button -->
{:else}
    <TitleAction icon={EyeOff} label="Safe mode" tone="warm" />
{/if}
```

## 設計判断

- `PaletteResultRow`: `itemType={entry.item.item_type}` を追加するのみ（1行変更）
- `+page.svelte`: workspace ビューでも Library と同じ `hiddenStore.toggleDirect()` ボタンを使う
  （workspace はアイテムを直接表示しないが、将来の一貫性のため統一する）

## 実装ステップ

### Step 1: PaletteResultRow に itemType を渡す

```svelte
<ItemIcon
    iconPath={entry.item.icon_path}
    itemType={entry.item.item_type}
    alt=""
    class="h-6 w-6 object-contain"
/>
```

### Step 2: +page.svelte の Safe mode ボタンを修正

```svelte
<!-- workspace ビューでも Library と同じトグルボタンを使う -->
{:else}
    <TitleAction
        icon={hiddenStore.isHiddenVisible ? Eye : EyeOff}
        label={hiddenStore.isHiddenVisible ? '非表示アイテム: 表示中' : '非表示アイテム: 非表示'}
        tone={hiddenStore.isHiddenVisible ? 'warm' : 'default'}
        onclick={() => hiddenStore.toggleDirect()}
    />
{/if}
```

`import { hiddenStore }` が `+page.svelte` に既にある（Library ビュー側で使用済み）ことを確認済み。

### Step 3: pnpm verify

## コミット規約

`feat(PH-20260422-027): PaletteResultRow itemType 渡し + Workspace Safe mode ボタン修正`

## 受け入れ条件

- [ ] `pnpm verify` 通過
- [ ] パレットで folder/url/command アイテムのアイコン読み込み失敗時に適切なフォールバックアイコンが表示されること
- [ ] Workspace ビューの「Safe mode」が機能するトグルボタンになること
- [ ] Library ビューの動作に影響がないこと
