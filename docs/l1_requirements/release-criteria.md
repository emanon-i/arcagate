# Release Readiness Criteria

**Status**: definition / audit 前提
**Date**: 2026-05-04
**Scope**: Arcagate を「配布できる完成度」として判定する根拠ベースの基準。各項目で Verification method / Pass criteria / Tooling を必須化、主観判定 (「動くはず」「悪くない」) は禁止。

## 0. 構成

| file                                                          | 範囲                              |
| ------------------------------------------------------------- | --------------------------------- |
| **criteria.md** (本 file)                                     | A 機能完成度 / B UI 一貫性        |
| [criteria-stability-perf.md](./release-criteria-stability.md) | C 安定性 / D パフォーマンス       |
| [criteria-error-distribution.md](./release-criteria-error.md) | E エラー処理 / F 配布要件         |
| [criteria-quality.md](./release-criteria-quality.md)          | G a11y / H i18n / I docs / J test |

## 0.1 判定区分

各 criteria は audit.md で 4 状態のいずれかに判定:

- **PASS**: 数値 / 状態 / 視覚証拠 を伴う合格
- **FAIL**: 不合格 + 再現手順 + 影響範囲
- **部分的**: 合格と不合格が混在 (例: 8 widget 中 6 が pass、2 が fail)
- **N/A**: 適用外 (例: i18n の en 切替えは現 phase 未対応で意図的)

## 0.2 弱い根拠 NG リスト (再発防止)

- 「Codex が PASS と言った」 → ソースの review であって動作保証ではない
- 「DOM 上は問題ない」 → DOM 存在 ≠ 治った (CLAUDE.md `<critical-rule id="dom-not-fixed">`)
- 「pnpm verify pass」 → 機械検証 = 規格通り / 体感品質の保証ではない (lessons.md C-1)
- 「動くはず」「多分大丈夫」 → 主観禁止
- 「悪くない」「大体良い」 → 数値 or 状態 or 視覚証拠 を出す

## A. 機能完成度

### A1. 主要 widget 動作 (12 種)

- **Verification**: 各 widget を Workspace に追加 → 設定 → 主要操作 (起動 / 削除 / config 編集) を実機 dev で実行
- **Pass criteria**: 12 widget 全てで crash 無し、各主要操作が 1 回で完了
- **Tooling**: 手動 dev 検収 + dev console error log 確認 + e2e (`tests/e2e/widget-display.spec.ts`)
- **対象**: ItemWidget / RecentLaunchesWidget / ProjectsWidget / FavoritesWidget / SnippetWidget / SystemMonitorWidget / QuickNoteWidget / DailyTaskWidget / ClipboardHistoryWidget / ExeFolderWatchWidget / FileSearchWidget / WeatherWidget (12 種、`src/lib/widgets/registry.ts` 参照)

### A2. Library 主要 flow

- **Verification**: 1) item 追加 (D&D + URL paste + 手動入力) / 2) 起動 / 3) 編集 / 4) 削除 + undo / 5) 検索 / 6) sort / 7) bulk 選択 / 8) tag CRUD
- **Pass criteria**: 8 flow すべて crash 無し + 即時反映 (instant-feedback rule、CLAUDE.md `<critical-rule id="instant-feedback">`)
- **Tooling**: 手動 dev 検収 + e2e (`tests/e2e/items.spec.ts` / `library-*.spec.ts`)

### A3. Workspace 主要 flow

- **Verification**: 1) workspace 作成 / 2) widget 追加 / 3) 配置 (move / resize) / 4) zoom (Reset / Wheel / Fit) / 5) wallpaper 設定 / 6) workspace 切替え / 7) 削除 + undo
- **Pass criteria**: 7 flow すべて crash 無し + 起動 / 終了 / 切替え 経路で各 dev console に panic / unhandled rejection 出ない
- **Tooling**: 手動 dev 検収 + e2e (`tests/e2e/workspace-*.spec.ts`、`tests/e2e/widget-zoom.spec.ts`)

### A4. Settings + Onboarding flow

- **Verification**: 初回起動 → onboarding 完走 → Settings 全 tab 開閉 + 各設定変更 (theme / hotkey / autostart / library card / kill switch) + reload で永続化確認
- **Pass criteria**: onboarding skip / 完走 両 path で crash 無し、設定変更が即時 + reload 後も保持
- **Tooling**: 手動 dev 検収 + e2e (`tests/e2e/onboarding-*.spec.ts` 等が存在すれば)

### A5. Palette + 起動 hotkey

- **Verification**: Ctrl+Shift+Space で palette 表示 / 検索 / Enter で launch、palette を閉じても再 hotkey で再表示
- **Pass criteria**: palette 表示 P95 ≤ 120ms (ux_standards.md §1)、launch P95 ≤ 200ms、表示中 hotkey で toggle
- **Tooling**: 手動 stopwatch 計測 + perf timeline (CDP) + `tests/e2e/palette*.spec.ts`

### A6. 既知 bug 許容範囲

- **Verification**: `docs/l3_phases/_archive/library-overhaul/` + `docs/lessons.md` で挙がっている既知 bug を全件確認、 release-blocker / blocker でない を仕分け
- **Pass criteria**: blocker = 0、blocker でない既知 bug は changelog に明記
- **Tooling**: doc grep + 手動仕分け、release notes 草案

## B. UI 一貫性

### B1. デザイントークン適用率（全画面）

- **Verification**: 全画面（Library / Workspace / Settings / Palette / Onboarding / Item form）で screenshot 取得 → color hardcode・token 逸脱がないか確認
- **Pass criteria**: 全 6 画面で `--ag-accent` / `--ag-surface-*` / `--ag-text-*` 等の semantic token が一貫して使われている。`scripts/audit-design-tokens.sh` が 0 violations
- **Tooling**: CDP screenshot + 目視評価（Read で screenshot を読み返す）+ design-tokens lefthook

### B2. Widget UX 常識遵守 (12 widget × 5 項目)

- **Verification**: 各 widget で 5 項目 = 1) 削除確認 1 step + 5 sec undo / 2) 半透明 / ぼかし backdrop only / 3) label 機能・状態・アクション (icon 名禁止) / 4) keyboard a11y (Tab / Enter / Esc) / 5) 「普通のアプリならそうしない」回避 (resize で見切れ無し、設定即反映、DOM 存在 ≠ 治った の精神)
- **Pass criteria**: 12 widget × 5 = 60 観測点で違反 0、または各違反に対し fix PR 紐付け
- **Tooling**: `scripts/audit-labels.sh` (label) + `scripts/audit-widget-shell.sh` (shell pattern) + 手動 widget exercise + e2e

### B3. token 一貫性

- **Verification**: `bash scripts/audit-design-tokens.sh` (色 hardcode) + `bash scripts/audit-font-hardcode.sh` + `bash scripts/audit-text-overflow.sh` の 3 audit を実行
- **Pass criteria**: 3 audit すべて 0 violations
- **Tooling**: 既存 lefthook step を CI で再実行、結果を audit.md に貼る

### B4. radius / shadow / spacing token 一貫性

- **Verification**: 主要 component (Button / Card / Dialog / Toast / Palette / Settings panel) を screenshot → ux_standards.md §4 (spacing) / §5 (フィードバック) と照合
- **Pass criteria**: 各 component で `--ag-radius-*` / `--ag-shadow-*` / `gap-*` token のみ採用、ad-hoc px 値 ≤ 5 件 (allow-list 化)
- **Tooling**: rg で `class="[^"]*\b(rounded|shadow)-\[` を検索、ad-hoc 件数を数値化

### B5. empty / loading / error 状態の design 統一

- **Verification**: 各画面の empty / loading / error 状態を意図的に発生させ screenshot 取得 (Library 0 件 / IPC 失敗 / DB 起動失敗 等)
- **Pass criteria**: 全画面で `EmptyState` / `LoadingState` / `ErrorState` 共通 component 採用、デザイントークン（`--ag-*`）でスタイリング
- **Tooling**: dev で意図的に IPC kill → screenshot、`grep -rn "<EmptyState\|<LoadingState\|<ErrorState"` で採用率計測
