# PH-PQ-300 T1 — 全画面 craft audit checklist

5 screen × 全 widget を fresh-eye で「毎日使えるか」 再判定した記録。 各観測点を
EmptyState / LoadingState / ErrorState / animation / spacing / 文言 / hotkey / focus /
aria-label / color-contrast の軸で評価し、 本 PR (feat/craft-sweep) で入れた fix を紐付ける。

- 評価方法: 実コード read + axe-core 機械検証 (`tests/e2e/a11y.spec.ts`) + keyboard 経路 e2e
  (`tests/e2e/keyboard-paths.spec.ts`)。
- 凡例: ✅ pass / 🔧 本 PR で fix / ➖ 該当なし

---

## 共通 component (foundation)

| component             | 役割         | a11y                                                                  | 備考                                       |
| --------------------- | ------------ | --------------------------------------------------------------------- | ------------------------------------------ |
| `EmptyState.svelte`   | 空状態統一   | icon + title + description + actions                                  | 全 widget 空状態の SoT                     |
| `LoadingState.svelte` | loading 統一 | `role="status"` `aria-live="polite"` + `motion-reduce:hidden` spinner | ✅                                         |
| `ErrorState.svelte`   | error 統一   | `role="alert"` `aria-live="assertive"`                                | 🔧 `text-red-500` → `var(--ag-error-text)` |

---

## Screen 1 — Library

| 観測点                            | EmptyState | Loading         | Error | 文言 | focus           | 結果 |
| --------------------------------- | ---------- | --------------- | ----- | ---- | --------------- | ---- |
| LibraryView (list/grid)           | ✅ 既存    | ✅ LoadingState | ✅    | ✅   | ✅ ring-2       | pass |
| LibraryCard                       | ➖         | ➖              | ➖    | ✅   | ✅ ring-2 inset | pass |
| LibrarySearchBar                  | ➖         | ➖              | ➖    | ✅   | ✅              | pass |
| LibrarySortControls               | ➖         | ➖              | ➖    | ✅   | ✅              | pass |
| LibraryDetailActions / TagSection | ➖         | ➖              | ➖    | ✅   | ✅              | pass |

axe gate: `a11y.spec.ts` → `Library — 空状態` / `Library — item 投入後`。

## Screen 2 — Workspace

| 観測点                        | EmptyState | Loading | Error | 文言 | focus                                 | 結果                                                                    |
| ----------------------------- | ---------- | ------- | ----- | ---- | ------------------------------------- | ----------------------------------------------------------------------- |
| WorkspaceLayout / canvas      | ➖         | ➖      | ➖    | ✅   | ✅                                    | 🔧 drag ghost の `transition: 80ms` を `--ag-duration-instant` token 化 |
| WorkspaceSidebar / PageTabBar | ➖         | ➖      | ➖    | ✅   | ✅                                    | pass                                                                    |
| WidgetShell (全 widget 外殻)  | ➖         | ➖      | ➖    | ✅   | 🔧 header button に `focus-ring` 付与 | header の歯車/menu button が focus 不可視だった                         |
| WidgetHandles                 | ➖         | ➖      | ➖    | ✅   | ✅ global `:focus-visible` fallback   | pass                                                                    |

axe gate: `a11y.spec.ts` → `Workspace — 空状態` / `Workspace — widget 配置後`。

## Screen 3 — Palette

| 観測点           | EmptyState                                                         | Loading | Error | 文言 | focus                                        | 結果                                                                                                        |
| ---------------- | ------------------------------------------------------------------ | ------- | ----- | ---- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| PaletteOverlay   | コマンドパレット規約に従い compact inline (大型 EmptyState 不使用) | ➖      | ➖    | ✅   | ✅                                           | 判断: VSCode/Raycast 等と同じく "No results" は compact text。big illustrated empty state は palette に不適 |
| PaletteResultRow | ➖                                                                 | ➖      | ➖    | ✅   | ✅ active row が accent border + glow で可視 | pass                                                                                                        |
| PaletteSearchBar | ➖                                                                 | ➖      | ➖    | ✅   | ✅                                           | pass                                                                                                        |

axe gate: `a11y.spec.ts` → `Palette — 初期表示` (palette window が CDP attach されている場合)。

## Screen 4 — Settings

| 観測点                               | EmptyState | Loading                                   | Error           | 文言 | focus | 結果                                                                                                  |
| ------------------------------------ | ---------- | ----------------------------------------- | --------------- | ---- | ----- | ----------------------------------------------------------------------------------------------------- |
| SettingsPanel (tablist)              | ➖         | ✅ LoadingState                           | ✅ error banner | ✅   | ✅    | 🔧 tab に `id`、 各 pane に `role="tabpanel"`+`aria-labelledby` (壊れた `aria-labelledby` 参照を修正) |
| SettingsGeneralPane                  | ➖         | ➖                                        | ➖              | ✅   | ✅    | pass                                                                                                  |
| SettingsLibraryPane / OpenerSettings | ➖         | 🔧 ad-hoc `<p>loading</p>` → LoadingState | ➖              | ✅   | ✅    | pass                                                                                                  |
| SettingsAppearancePane / ThemeEditor | ➖         | ➖                                        | ➖              | ✅   | ✅    | pass                                                                                                  |
| SettingsDataPane                     | ➖         | ➖                                        | ➖              | ✅   | ✅    | pass                                                                                                  |
| AboutSection / UpdaterSettings       | ➖         | ➖                                        | ➖              | ✅   | ✅    | 🔧 `text-green-500` → `var(--ag-success-text)`                                                        |

axe gate: `a11y.spec.ts` → `Settings — {general,library,appearance,data,about} pane` (5 件)。

## Screen 5 — SetupWizard (初回体験)

| 観測点                                   | EmptyState | Loading | Error | 文言 | focus | 結果 |
| ---------------------------------------- | ---------- | ------- | ----- | ---- | ----- | ---- |
| SetupWizard Welcome / Hotkey / Autostart | ➖         | ➖      | ➖    | ✅   | ✅    | pass |
| OnboardingTour                           | ➖         | ➖      | ➖    | ✅   | ✅    | pass |

axe gate: `a11y.spec.ts` → `SetupWizard — 全 step` (3 step を個別 analyze)。
keyboard gate: `keyboard-paths.spec.ts` → `F5. SetupWizard: Tab + Enter のみで完走`。

---

## T2 EmptyState / LoadingState / ErrorState 統一 sweep — 適用一覧

ad-hoc な `<p>何もありません</p>` / `<p>loading…</p>` / 生 error div を共通 component へ移行:

| widget                  | 変更前                            | 変更後                                                                           |
| ----------------------- | --------------------------------- | -------------------------------------------------------------------------------- |
| ProjectsWidget          | `<p>` scanning/error/empty        | LoadingState / ErrorState / EmptyState                                           |
| ExeFolderWatchWidget    | `<p>` scanning/error/empty        | LoadingState / ErrorState / EmptyState                                           |
| ScriptFolderWatchWidget | `<p>` scanning/error/empty        | LoadingState / ErrorState / EmptyState                                           |
| FilePreviewWidget       | `<p>` loading/error               | LoadingState / ErrorState                                                        |
| FileSearchWidget        | `<p>` error/empty                 | ErrorState / EmptyState (loading は cancel button 同居のため inline 維持)        |
| ImageScrapWidget        | 生 error div                      | ErrorState                                                                       |
| DailyTaskWidget         | `<p>` empty                       | EmptyState (`no_pending` は完了 section と共存する sub-state のため inline 維持) |
| ClipboardHistoryWidget  | dashed div empty / `<p>` no-match | EmptyState ×2                                                                    |
| StatsWidget             | `<div>` empty                     | EmptyState                                                                       |
| SnippetWidget           | 巨大 `<button>` empty             | EmptyState + action                                                              |
| OpenerSettings          | `<p>loading</p>`                  | LoadingState                                                                     |

新規 i18n key: `widgets.common.load_failed` / `workspace.canvas_aria` (ja/en)。

## T3 一貫性 sweep

- color hardcode: `ErrorState text-red-500` / `TitleBar hover:bg-red-500/80` / `UpdaterSettings text-green-500`
  の 3 件を theme token (`--ag-error-text` / `--c-error` / `--ag-success-text`) へ。
- motion hardcode: `WorkspaceLayout` drag ghost の inline `transition: transform 80ms ease` を
  `var(--ag-duration-instant) var(--ag-ease-out)` へ。
- hotkey: `audit-hotkey-consistency.sh` / `audit-keyboard-traps.sh` 0 violation 維持。 矢印キー nav は
  context 別に妥当な意味論 (Palette = wrap-around / list = clamp / grid = `grid-keyboard.ts` 共有 util)
  を持つため強制統一はせず現状維持。

## T5 Focus Appearance (WCAG 2.4.11)

- `app.css` に global `:focus-visible { outline: 2px solid var(--ag-accent); outline-offset: 2px }`
  fallback を追加。 ring を明示しない focusable 要素 (tabindex div / drag handle / palette row) も
  2px + 3:1 contrast の focus 指標を全 5 テーマで得る。
- `.focus-ring` alias / shadcn ui は `focus-visible:outline-none` で ring 表現に上書きされ二重指標化しない。
- WidgetShell header button に `focus-ring` を付与。
