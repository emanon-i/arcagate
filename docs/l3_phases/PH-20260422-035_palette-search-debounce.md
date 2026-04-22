---
status: todo
phase_id: PH-20260422-035
title: コマンドパレット検索 150ms debounce 追加
depends_on: []
scope_files:
  - src/lib/components/arcagate/palette/PaletteOverlay.svelte
parallel_safe: true
---

# PH-20260422-035: コマンドパレット検索 150ms debounce 追加

## 目的

`PaletteOverlay.svelte` の `handleSearch` は毎キーストロークで `paletteStore.search(q)` を呼ぶ。
IPC を毎文字実行するため、高速入力時に不要なリクエストが積み重なる。
150ms debounce を追加してキーが落ち着いてから 1 回だけ IPC を呼ぶ。

## 現状

```typescript
// PaletteOverlay.svelte: debounce なし
function handleSearch(q: string) {
    void paletteStore.search(q);
}
```

## 設計判断

- `setTimeout` / `clearTimeout` パターンで 150ms debounce を実装
- ライブラリ追加なし（1 関数で完結）
- 遅延は 150ms: 体感を損なわず IPC 削減できる閾値

## 実装ステップ

### Step 1: PaletteOverlay.svelte に debounce 追加

```typescript
let searchTimer: ReturnType<typeof setTimeout> | null = null;

function handleSearch(q: string) {
    if (searchTimer !== null) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        void paletteStore.search(q);
    }, 150);
}
```

### Step 2: pnpm verify

## コミット規約

`perf(PH-20260422-035): コマンドパレット検索に 150ms debounce 追加`

## 受け入れ条件

- [ ] `pnpm verify` 通過（svelte-check WARNING 0）
- [ ] 高速入力時に最後のキーストロークから 150ms 後に検索が実行されること
- [ ] 既存の ↑↓ Enter Escape キーハンドラが影響を受けないこと

## 停止条件

- PaletteOverlay.svelte のキーハンドラと干渉する → 調査して報告
