---
id: PH-20260424-210
title: パレット UX polish（自動フォーカス・Esc 挙動・表示位置）
status: done
priority: medium
parallel_safe: true
scope_files:
  - src/lib/components/arcagate/PaletteOverlay.svelte
  - src/routes/+page.svelte
depends_on: []
---

## 目的

batch-46 でパレットを常時フローティング化した。
実機確認後の想定追加 polish:

1. パレット開時に検索 input が自動フォーカスされる（現状確認）
2. パレット内で Esc を押すと閉じる（現状確認）
3. パレットウィンドウの表示位置（画面中央上部）が適切か

## 実装ステップ

### Step 1: PaletteOverlay の onMount/onShow で input.focus() を確認

batch-46 で実装済みの可能性があるが、コードを読んで確認。
問題があれば `onMount(() => { inputEl?.focus(); })` を追加。

### Step 2: Esc キーイベントの確認

`palette-window.svelte` や `+page.svelte` の keyboard handler で Esc → `appWindow.hide()` が繋がっているか確認。

### Step 3: パレットウィンドウ位置の調整

`tauri.conf.json` の palette window の `x`, `y` を確認し、画面中央上部（画面幅の 1/2 - ウィンドウ幅/2、Y=100〜200px）が適切か調整。

## 受け入れ条件

- [ ] パレット起動直後に検索フィールドがアクティブ状態（キー入力可能）
- [ ] パレット内で Esc を押すとパレットが閉じる
- [ ] パレットが画面中央上部（目視確認）に表示される
- [ ] `pnpm verify` 全通過
