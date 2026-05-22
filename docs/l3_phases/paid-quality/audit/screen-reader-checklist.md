# PH-PQ-300 T7 — screen reader 動作 checklist

paid product の足切り条件として、 主要 flow が screen reader で読み上げ可能であることを
確認する記録。 WAI-ARIA Authoring Practices (https://www.w3.org/WAI/ARIA/apg/) に準拠。

## 検証手段の制約と方針

agent dev (CDP) は screen reader の audio 出力を直接テストできない。 そのため:

1. **axe-core 機械検証** (`tests/e2e/a11y.spec.ts`) — role / aria-label / name 計算 /
   landmark の規格違反を WCAG 2.2 AA tag で全 5 screen 検出。 違反 0 を CI gate 化。
2. **accessibility tree 検証** — 下表の各要素が「accessible name + role」 を持つことを
   実コード + axe の name 計算で確認。
3. **NVDA / Windows Narrator 実機** — ja release では努力義務、 EN release (PH-PQ-700) で
   必須。 本 phase では accessibility tree の構造保証までを scope とする。

## accessibility tree 観測点

| flow         | 要素         | 期待される announce      | 実装根拠                                                                       | 結果 |
| ------------ | ------------ | ------------------------ | ------------------------------------------------------------------------------ | ---- |
| 起動         | main window  | `<main>` landmark        | root layout `<main>`                                                           | ✅   |
| Library      | 領域         | "ライブラリ" region      | `role="region"` `aria-label`                                                   | ✅   |
| Library card | card         | label + type             | LibraryCard `aria-label`                                                       | ✅   |
| Palette      | overlay      | dialog + label           | PaletteOverlay `role` + `aria-label`                                           | ✅   |
| Palette      | 結果リスト   | listbox / option         | `role="listbox"` + `role="option"`                                             | ✅   |
| Workspace    | widget 外殻  | widget title             | WidgetShell header title                                                       | ✅   |
| Settings     | カテゴリ nav | tablist / tab / tabpanel | 🔧 tab に `id`、 pane に `role="tabpanel"`+`aria-labelledby` を本 PR で wiring |      |
| Settings     | 各 input     | label 関連付け           | settings pane の `<label for>`                                                 | ✅   |
| Toast        | 通知         | status / alert           | ToastContainer `role`                                                          | ✅   |
| Loading      | spinner      | "読み込み中" polite      | LoadingState `role="status"` `aria-live="polite"`                              | ✅   |
| Error        | エラー       | assertive alert          | ErrorState `role="alert"` `aria-live="assertive"`                              | ✅   |
| EmptyState   | 空状態       | title + description text | EmptyState の text node                                                        | ✅   |

## 本 PR で修正した SR 関連欠陥

- **Settings tablist の壊れた ARIA 参照**: tab button に `id` が無く、 about pane の
  `aria-labelledby="tab-about"` が存在しない要素を指していた。 全 tab に `id="tab-{id}"`、
  全 pane に `role="tabpanel"` + `id="settings-panel-{id}"` + `aria-labelledby` を付与し、
  SR が「タブ N/5、 タブパネル」 を正しく announce できるようにした。
- **focusable 要素の focus 不可視**: WidgetShell header の歯車/menu button、 および ring を
  明示しない tabindex 要素が SR + キーボード利用者に focus 位置を示せていなかった。
  global `:focus-visible` outline fallback + `focus-ring` 付与で解消。

## 本 PR で修正した SR 関連欠陥 (続き)

- **FileSearchWidget 結果行の不正 ARIA**: `<button aria-selected>` は role=button に
  `aria-selected` 非対応 (svelte-check warning + axe `aria-allowed-attr` 違反)。
  キーボード選択行を示す意図のため `aria-current="true"` へ置換した。

## 残課題 (PH-PQ-700 EN release で対応)

- NVDA / Narrator 実機での読み上げ順序・冗長性の人手チェック。
