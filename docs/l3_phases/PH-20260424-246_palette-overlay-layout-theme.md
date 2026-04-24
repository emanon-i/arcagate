# PH-20260424-246 Palette Overlay レイアウト修正 + テーマ追従

- **フェーズ**: batch-58 Plan C（改善 3）
- **status**: todo
- **開始日**: -

## 目的

実機フィードバック 3 件をまとめて解消:

1. Palette overlay が下で切れる（window height 620px を超えるコンテンツ）
2. PaletteKeyGuide が下に隠れる
3. Palette overlay がテーマ変更を反映しない（クロスウィンドウ CSS var 同期なし）

## 技術分析

### 問題 1 & 2: レイアウト切れ

`PaletteOverlay.svelte` の現構造:

```
div.fixed.inset-0
  div.mx-auto.mt-[5vh].max-w-5xl   ← max-height 未設定
    (header bar)
    div.overflow-hidden              ← overflow: hidden だが高さ制約なし
      div.nested (p-5 p-8)
        PaletteSearchBar
        div.grid (results + context)
          results list               ← 件数次第で無限成長
          PaletteKeyGuide variant=chips
        PaletteKeyGuide variant=bar  ← 最下部に押し出される
```

**修正方針**: 3 段固定 flex column

```svelte
<!-- Palette card -->
<div class="... flex flex-col max-h-[calc(100vh-10vh)]">
  <!-- Header: fixed -->
  <div class="flex-shrink-0 ..."> ... </div>
  <!-- Content: scrollable -->
  <div class="flex-1 min-h-0 overflow-y-auto p-4 md:p-8">
    <PaletteSearchBar ... />
    <div class="mt-5 grid ...">
      <div id="palette-results" ...>
        {#each ...}
        {/each}
        <PaletteKeyGuide variant="chips" />
      </div>
      <PaletteQuickContext />
    </div>
  </div>
  <!-- Footer: fixed -->
  <div class="flex-shrink-0 border-t border-[var(--ag-border)] px-5 py-3">
    <PaletteKeyGuide variant="bar" />
  </div>
</div>
```

- `max-h-[calc(100vh-10vh)]` = 90vh で下切れを防ぐ
- `flex-1 min-h-0 overflow-y-auto` でスクロール領域を確保（`min-h-0` は flex child での overflow に必須）
- KeyGuide variant="bar" をカード外のフッターに移動し `flex-shrink-0`

### 問題 3: テーマ追従

**原因**: `setThemeMode()` が DB 保存のみでテーマ変更イベントを emit しない。\
Palette ウィンドウは `loadTheme()` を mount 時のみ呼ぶため、その後の変更を検知しない。

**修正方針**:

- Rust 側 `set_active_theme_mode` コマンドハンドラで `app.emit("theme-changed", &mode)` を追加
- `src/lib/state/theme.svelte.ts` に Tauri listen 追加:
  ```ts
  listen('theme-changed', () => { void loadTheme(); });
  ```
- Palette の `+page.svelte` は既に `themeStore.loadTheme()` を呼ぶので listen が追加されれば自動反映

**対象ファイル**:

- `src-tauri/src/commands/theme.rs` — emit 追加
- `src/lib/state/theme.svelte.ts` — listen 追加 + cleanup
- `src/routes/palette/+page.svelte` — 変更不要（themeStore 経由で自動反映）

## 受け入れ条件

- [ ] Palette overlay で検索結果が多くても KeyGuide bar が常に画面下部に見える
- [ ] 検索結果リストのみがスクロールする
- [ ] メインウィンドウでテーマ変更後 → Palette を開くと新テーマが反映されている
- [ ] Palette overlay を開いたまま（リッスン中）メインウィンドウでテーマ変更 → 即時反映
- [ ] `pnpm verify` 全通過
