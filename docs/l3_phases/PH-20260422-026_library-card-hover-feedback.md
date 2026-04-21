---
status: todo
phase_id: PH-20260422-026
title: LibraryCard ホバー/アクティブ ビジュアルフィードバック追加
depends_on: []
scope_files:
  - src/lib/components/arcagate/library/LibraryCard.svelte
parallel_safe: true
---

# PH-20260422-026: LibraryCard ホバー/アクティブ ビジュアルフィードバック追加

## 目的

`LibraryCard` はボタン要素だが `hover:` クラスが設定されておらず、カーソルを乗せても
ビジュアル変化がない。毎日使うランチャーとして「押せる」「今ここにある」感が欠けている。

## 現状

```svelte
<button
    class="w-full overflow-hidden rounded-[var(--ag-radius-card)] border border-[var(--ag-border)]
           bg-[var(--ag-surface-3)] text-left transition-opacity ..."
    <!-- hover: クラスなし -->
>
```

## 設計判断

- `hover:bg-[var(--ag-surface-4)]` を追加（サーフェス1段階上げ）
- `hover:border-[var(--ag-border-hover)]` を追加（枠線の明度を上げる）
- `active:scale-[0.98]` を追加（押下感）
- `transition` を `transition-all` に変更してスムーズに
- `is_enabled = false` のカードにも `cursor-not-allowed` を追加（現在は cursor が変化しない）
- `disabled` 属性は追加しない（item が disabled でもランチャーとして選択・編集できるため）

## 実装ステップ

### Step 1: ホバー/アクティブクラスを追加

```svelte
<button
    type="button"
    class="w-full overflow-hidden rounded-[var(--ag-radius-card)] border border-[var(--ag-border)]
           bg-[var(--ag-surface-3)] text-left transition-all
           hover:bg-[var(--ag-surface-4)] hover:border-[var(--ag-border-hover)]
           active:scale-[0.98]
           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]
           focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ag-surface-0)]
           {item.is_enabled ? '' : 'opacity-40 grayscale'}"
```

### Step 2: pnpm verify

## コミット規約

`feat(PH-20260422-026): LibraryCard にホバー/アクティブ状態のビジュアルフィードバック追加`

## 受け入れ条件

- [ ] `pnpm verify` 通過
- [ ] LibraryCard にカーソルを乗せると背景色・枠線色が変化すること
- [ ] クリック時に微小なスケールダウンアニメーションがあること
- [ ] disabled（is_enabled = false）のカードも同様のホバー状態を持つこと
