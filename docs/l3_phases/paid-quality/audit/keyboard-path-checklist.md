# PH-PQ-300 T6 — 完全キーボード経路 checklist

主要 flow を「キーボード操作のみ」で完走できることの記録。 機械検証は
`tests/e2e/keyboard-paths.spec.ts` で行い、 CI gate に組み込む。

凡例: ✅ e2e 自動検証あり / 📝 手動確認のみ (e2e harness 制約)

| #   | Flow                                  | keyboard 経路                                                               | 検証                                                                                                                                                                                              |
| --- | ------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | Library 検索 → 絞り込み               | 検索 input focus → type → Esc clear                                         | ✅ `F1`                                                                                                                                                                                           |
| F2  | トップナビ Library ⇄ Workspace 切替   | tab button focus → Enter                                                    | ✅ `F2`                                                                                                                                                                                           |
| F3  | Settings 開く → カテゴリ移動 → 閉じる | Settings button Enter → ↑↓ で tab 移動 → Esc                                | ✅ `F3`                                                                                                                                                                                           |
| F4  | Workspace canvas zoom/undo hotkey     | Ctrl+0 (reset) / Ctrl+Z (undo)                                              | ✅ `F4`                                                                                                                                                                                           |
| F5  | SetupWizard 完走                      | 各 step の action button focus → Enter ×3                                   | ✅ `F5`                                                                                                                                                                                           |
| F6  | キーボードトラップ無し                | Tab 連打で focus が進む (張り付かない)                                      | ✅ `F6`                                                                                                                                                                                           |
| F7  | Palette: 矢印 nav + Enter launch      | Palette 内 ↑↓ で result 移動 → Enter                                        | 📝 OS global hotkey が e2e で `ARCAGATE_SKIP_HOTKEY=1` 無効化のため自動化外。 PaletteOverlay.svelte `handleKeydown` で ArrowUp/Down=selectPrev/Next、 Enter=launch、 Esc=close、 Tab=補完を実装済 |
| F8  | Library grid 矢印 nav                 | `grid-keyboard.ts` `gridKeyboardNav()` で ↑↓←→/Home/End/Enter/Delete/F3/Esc | 📝 pure fn の unit test でカバー。 e2e は grid 列数が viewport 依存のため F1 検索で代替                                                                                                           |
| F9  | Library 複数選択 (Space)              | selection mode で Space toggle                                              | 📝 `gridKeyboardNav` の `toggleSelect` action でカバー                                                                                                                                            |
| F10 | Workspace widget 追加                 | sidebar add button focus → Enter                                            | 📝 WorkspaceSidebar add button は `focus-ring` 付き、 click handler = keyboard Enter で発火                                                                                                       |

## 注記

- e2e harness は OS グローバル hotkey を無効化する (dev instance との競合回避)。 そのため
  F7 の「Ctrl+Shift+Space で Palette 起動」 は自動化対象外。 Palette window 内部の
  キーボード操作 (矢印 nav) は実コード上は完備しており、 SR checklist で実機確認する。
- F8/F9 の grid 矢印 nav は `gridKeyboardNav()` という pure function に集約済で、
  viewport 非依存に unit test 可能。 e2e で grid 列数を固定するのは脆いため検索 flow (F1) で代替。
- すべての対話要素は `audit-keyboard-traps.sh` (role/tabindex 欠如検出) で 0 violation。
