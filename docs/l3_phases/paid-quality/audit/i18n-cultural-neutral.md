# 文化中立 audit (cultural-neutrality)

> **目的**: 海外 (英語圏) 有料リリース前に、 地域バイアス (絵文字 / 色単独表現 / 日付形式 /
> 週始まり / 地域固有色) を全画面 sweep する (PH-PQ-700 T4)。
> **手法**: sub-agent で `src/lib` / `src/routes` の全 svelte / ts を grep + 実コード確認。
> **status**: 2026-05-22 (PH-PQ-700 T4)。

## 結論

**重大違反 (ジェスチャー絵文字 👍👌✌🙏 の機能 UI 使用) は 0 件。** 国旗絵文字も 0 件。
使用記号 (`✓` `●` `★` `·`) はいずれも文化中立かつテキスト併記済。

件数: HIGH 2 (本 PR で fix) / MED 4 / LOW 6。

## 1. 絵文字・記号

- ジェスチャー絵文字・国旗絵文字: **0 件**。
- `✓` (ThemeEditorHeader / messages の copy_done / save_saved)、 `★` (favorites empty)、
  `●` (未保存 indicator)、 `·` (WorkspaceHintBar 区切り) — すべて文化中立、 テキスト併記済。 問題なし。
- `ExeFolderWatchWidget` の選択中 EXE を `✓` で示す箇所 (med) — 記号は中立だが選択状態が
  `✓` の有無のみ。 lucide `Check` か「現在」ラベル併記が望ましい (後続改善)。

## 2. 日付 / 数値の locale 固定 — HIGH 2 件は本 PR で fix

| file                                                    | 問題                                          | status                                                                |
| ------------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------- |
| `src/lib/utils/format-meta.ts` `formatShortDate`        | 手組み `YYYY-MM-DD` で locale 非追従          | ✅ fixed — `intl-formatter.formatDate(d, {dateStyle:'short'})` へ移行 |
| `src/lib/widgets/file-preview/FilePreviewWidget.svelte` | `toLocaleString('ja')` で locale ハードコード | ✅ fixed — `formatDate()` helper へ移行                               |
| `src/lib/components/settings/UpdaterSettings.svelte`    | `toLocaleString()` (locale 未明示)            | ✅ fixed — `formatDate()` helper へ移行                               |
| `FilePreviewWidget` char count `toLocaleString()`       | 数値桁区切りが locale 未追従                  | ✅ fixed — `formatNumber()` へ移行                                    |

→ 日付 / 数値表示の locale ハードコードは **0 件** になった (T3 と統合実施)。

## 3. 色のみで意味を伝える箇所 (WCAG 2.2 / 1.4.1、 med — 後続)

| file                         | 問題                                                             | 推奨                                                                               |
| ---------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `ToastContainer.svelte`      | toast 種別 (success/error/info) を枠線・色のみで区別、 icon なし | `CheckCircle` / `AlertCircle` / `Info` icon 前置。 PH-PQ-300 a11y と統合で後続対応 |
| `SystemMonitorWidget.svelte` | 使用率の危険域を色変化のみ (数値 % は常時併記)                   | low — 85% 超で `AlertTriangle` 併記が盤石。 任意改善                               |

「赤=危険 / 緑=OK」連想は地域差 + 色覚特性の両面で課題。 icon + 文言の二重伝達が望ましいが、
本 phase スコープ外 (PH-PQ-300 craft sweep / a11y と統合)。

## 4. 週始まり・祝日色

- カレンダー / 日付ピッカー UI は**存在しない** (`DailyTask` は checklist)。 週始まりの前提なし。 該当 0。
- 祝日色・地域固有カラーの使用 0。 theme token (`--ag-*`) で抽象化済。

## 5. 既知の未対応 (本 PR スコープ外)

- `src/lib/utils/library-sort.ts:23` `new Intl.Collator('ja', …)` — sort 照合 locale が `ja` 固定。
  英語環境でも日本語照合順になる (med)。 **本 PR では未移行**: `library-sort.ts` を
  `intl-formatter.svelte.ts` (rune module) に依存させると `library-sort.test.ts` が
  vitest (`environment: 'node'`、 Svelte rune transform なし) で壊れる。 collator の locale 化は
  「vitest が rune module import を扱える test infra 整備」 と同時に行うべき別 issue。
- `ToastContainer` / `SystemMonitor` の色単独表現 — PH-PQ-300 a11y と統合で後続対応。
