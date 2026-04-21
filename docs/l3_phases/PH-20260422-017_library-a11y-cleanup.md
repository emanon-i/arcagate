---
status: done
phase_id: PH-20260422-017
title: 整理：LibraryMainArea a11y 解消 + svelte-check WARNING 一掃
depends_on:
  - PH-20260422-001
scope_files:
  - src/lib/components/arcagate/library/LibraryMainArea.svelte
parallel_safe: true
---

# PH-20260422-017: a11y 整理・警告解消

## 目的

`pnpm verify` の svelte-check に毎回出る WARNING を解消する。\
`LibraryMainArea.svelte` の `<main>` 要素に `onclick` ハンドラがあり、\
`Non-interactive element should not be assigned mouse or keyboard event listeners` 警告が出ている。\
`svelte-ignore` コメントによる抑制ではなく、適切な a11y 対応で根本解消する。

## 現状

```svelte
<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
<main
  class="min-h-full p-5"
  onclick={(e: MouseEvent) => { ... deselect card ... }}
>
```

`<main>` はランドマーク要素であり、インタラクション想定外。\
`onclick` の目的は「カード外クリックで選択解除」なので、\
`role` と `tabindex` を付与するか、別要素で実装する。

## 設計判断

- `<main>` は `role="main"` 相当（暗黙ロール）。`tabindex` と `keydown` を追加し、
  `interactive` な要素として扱えるようにする（WAI-ARIA の keyboard operability 要件を満たす）
- キーボード操作: Escape で deselect（LibraryDetailPanel の Esc 動作と統一）
- `svelte-ignore` コメントを削除する

## 実装ステップ

### Step 1: 現状の `<main>` を修正

```svelte
<main
  class="min-h-full p-5"
  role="main"
  tabindex="-1"
  onclick={(e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-testid^="library-card-"]')) {
          selectedItemId = null;
      }
  }}
  onkeydown={(e: KeyboardEvent) => {
      if (e.key === 'Escape') selectedItemId = null;
  }}
>
```

`tabindex="-1"` はプログラムでフォーカス可能にするが、Tab キーのフォーカス順には入らない。\
`role="main"` を明示することで svelte の a11y ルール（interactive role 要件）を満たす。

### Step 2: svelte-ignore コメント削除

### Step 3: svelte-check が WARNING 0 になることを確認

```bash
pnpm check 2>&1 | grep -E "WARNING|ERRORS"
```

### Step 4: pnpm verify

## コミット規約

`fix(PH-20260422-017): LibraryMainArea <main> a11y 修正（svelte-check WARNING 解消）`

## 受け入れ条件

- [x] `pnpm check` の WARNING が 0 になる
- [x] `svelte-ignore` コメントが LibraryMainArea.svelte から削除されている
- [x] カード外クリックで選択解除が引き続き動作する
- [x] `pnpm verify` 通過

## 停止条件

- `role="main"` + `tabindex="-1"` では svelte-check の WARNING が解消しない → 代替案を検討して報告
