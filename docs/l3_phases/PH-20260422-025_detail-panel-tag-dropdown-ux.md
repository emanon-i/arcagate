---
status: wip
phase_id: PH-20260422-025
title: LibraryDetailPanel タグドロップダウン Escape/外部クリック対応
depends_on: []
scope_files:
  - src/lib/components/arcagate/library/LibraryDetailPanel.svelte
parallel_safe: true
---

# PH-20260422-025: LibraryDetailPanel タグドロップダウン Escape/外部クリック対応

## 目的

`LibraryDetailPanel` の「+ タグを追加」ドロップダウンは `showTagSelect` フラグで表示制御
しているが、ドロップダウン外のクリックや Escape キーで閉じる仕組みがない。
タグ選択後に閉じ忘れたドロップダウンが残り、UX が不安定になる。

## 現状

```svelte
<!-- LibraryDetailPanel.svelte -->
{#if showTagSelect}
    <div class="absolute ...">
        <!-- 選択時は showTagSelect = false で閉じるが -->
        <!-- Escape や外部クリックでは閉じない -->
    </div>
{/if}
```

## 設計判断

- `svelte:window` の `onkeydown` で Escape → `showTagSelect = false`（既存の Escape ハンドラに統合）
- `use:clickOutside` action は依存追加になるため、`onfocusout` + `relatedTarget` チェックで実装
- または `<svelte:window>` の click イベントで `event.target` がドロップダウン外ならクローズ

簡潔実装: `<svelte:window>` の既存 `onkeydown` ハンドラに Escape 条件を追加するのみ。
外部クリック閉じは `onpointerdown` でドロップダウン外を検出して閉じる。

## 実装ステップ

### Step 1: Escape キーでドロップダウンを閉じる

既存の `<svelte:window onkeydown>` を拡張:

```svelte
<svelte:window onkeydown={(e) => {
    if (e.key === 'Escape') {
        if (showTagSelect) {
            showTagSelect = false;
        } else {
            onClose?.();
        }
    }
}} />
```

### Step 2: ドロップダウン外ポインタダウンで閉じる

ドロップダウンの `div` に参照を取り、window の `pointerdown` でチェック:

```svelte
let tagDropdownEl = $state<HTMLElement | null>(null);

function handleWindowPointerDown(e: PointerEvent) {
    if (showTagSelect && tagDropdownEl && !tagDropdownEl.contains(e.target as Node)) {
        showTagSelect = false;
    }
}
```

または、ドロップダウンボタン自体に `onblur` と `onfocusout` を使ってシンプルに実装する。

### Step 3: pnpm verify

## コミット規約

`feat(PH-20260422-025): タグドロップダウンを Escape/外部ポインタダウンで閉じる`

## 受け入れ条件

- [ ] `pnpm verify` 通過
- [ ] Escape キーでタグドロップダウンが閉じること（パネルは閉じないこと）
- [ ] タグドロップダウン外をクリックするとドロップダウンが閉じること
- [ ] タグ選択後はドロップダウンが閉じること（既存動作）

## 停止条件

- `use:clickOutside` action 実装が複雑になり 20 行超え → Escape のみ実装して報告
