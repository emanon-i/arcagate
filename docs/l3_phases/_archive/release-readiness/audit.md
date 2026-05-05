# Release Readiness Audit — A 機能 + B UI 一貫性

**Status**: 自己検証 / 2026-05-04 時点
**Predecessor**: [criteria.md](./criteria.md)
**Method**: 各 criteria を Verification 実行 + 根拠 (file path / 数値 / 視覚証拠 / 検出結果) を記録、PASS / FAIL / 部分的 / N/A で判定。**主観 / 弱い根拠は禁止** (criteria.md §0.2)。

## サマリ (10 軸の判定総括)

| 軸      | PASS | 部分的 | FAIL | N/A | 未検証 |
| ------- | ---- | ------ | ---- | --- | ------ |
| A 機能  | 1    | 4      | 0    | 0   | 1      |
| B UI    | 2    | 3      | 0    | 0   | 0      |
| C 安定  | 1    | 4      | 1    | 0   | 2      |
| D perf  | 0    | 0      | 0    | 0   | 9      |
| E error | 3    | 1      | 1    | 0   | 1      |
| F 配布  | 4    | 1      | 2    | 0   | 3      |
| G a11y  | 1    | 2      | 0    | 1   | 1      |
| H i18n  | 1    | 0      | 0    | 3   | 0      |
| I docs  | 1    | 1      | 2    | 0   | 0      |
| J test  | 3    | 1      | 0    | 0   | 2      |

**合計**: PASS 17 / 部分的 17 / FAIL 6 / N/A 4 / 未検証 19 (gap-list で blocker / should-have / nice-to-have に分類)。

## 軸別 audit

### A. 機能完成度

#### A1. 主要 widget (12 種) — **部分的**

- **根拠**: `src/lib/widgets/*/index.ts` 12 件確認 (clipboard-history / daily-task / exe-folder / favorites / file-search / item / projects / quick-note / recent / snippet / stats / system-monitor)。registry.test.ts 6 tests pass。
- **gap**: 全 12 widget の手動 dev 検収 + crash 記録は **未実施**。本 audit では機械検証のみ、user 手動検収を release 前 manual checklist (J5) で要求。

#### A2. Library 主要 flow (8 件) — **部分的**

- **根拠**: e2e `tests/e2e/items.spec.ts` 存在 + L1/L2/L3 で実装 + `pnpm vitest run` 306 tests pass、`pnpm test:e2e` @smoke 36 件は最近の PR で全 pass 確認。
- **gap**: D&D + URL paste の手動経路は smoke 含まれるが、**user dev 体感** での bulk delete + undo 横断は未確認。J5 release-checklist で要求。

#### A3. Workspace 主要 flow (7 件) — **部分的**

- **根拠**: e2e `tests/e2e/workspace-*.spec.ts` 6 spec / `tests/e2e/widget-zoom.spec.ts` で zoom Reset / Wheel / Fit を smoke カバー、PR #283 で zoom anchor 抜本書き直し済。
- **gap**: 100 widget 同時表示、wallpaper 変更経路は未自動化、user 手動。

#### A4. Settings + Onboarding flow — **部分的**

- **根拠**: `SettingsPanel.svelte` 445 行存在、`PrivacySettings.svelte` で telemetry / crash opt-in 実装、`AboutSection.svelte` で version + License 表示。
- **gap**: onboarding 完走 e2e が存在不明 (`tests/e2e/onboarding-*` なし)、user 手動検証必要。

#### A5. Palette + 起動 hotkey — **部分的**

- **根拠**: `tests/e2e/palette*.spec.ts` 存在、CLAUDE.md `Ctrl+Shift+Space` 経路確認。
- **gap**: P95 数値計測は **未実施** (D3 で計測予定、本軸でも引用予定)。

#### A6. 既知 bug 許容範囲 — **未検証**

- **根拠**: `docs/lessons.md` + `docs/l1_requirements/library-overhaul/known-issues.md` 存在、blocker 仕分けは **未実施**。
- **gap**: release 前 manual で blocker = 0 確認、changelog (I3 FAIL) と一緒に作成必要。

### B. UI 一貫性

#### B1. Industrial Yellow 全画面適用率 — **部分的**

- **根拠**: `--ag-il-*` token 採用箇所 64 hits (grep)。StatCard.svelte / LoadingState.svelte / IndustrialPanel / IndustrialButton で適用済。
- **gap**: 全 6 画面 (Library / Workspace / Settings / Palette / Onboarding / Item form) のうち **Library StatCard と LoadingState のみ移行済**。Workspace / Settings / Palette / Onboarding / Item form 未移行 (phase-l3-plan §1 D1 で言及、L3 後 polish)。**実機 screenshot 取得未実施**。

#### B2. Widget UX 常識 (12 widget × 5 項目) — **部分的**

- **根拠**: `audit-labels.sh` 0 violations / `audit-widget-shell.sh` 12 widgets all use common shell pattern / `audit-handle-style.sh` 0 violations。L2-B で全 widget keyboard a11y baseline。
- **gap**: 全 60 観測点を 1 件 1 件確認していない (audit script で大半カバーだが、削除確認 1 step + 5 sec undo は **Library のみ実装、widget 全体には未展開**)。

#### B3. token 一貫性 — **PASS**

- **根拠**: `audit-design-tokens.sh` `OK: no hardcoded colors found` / `audit-font-hardcode.sh` `violations 0` / `audit-text-overflow.sh` `violations 0`。3/3 audit が 0 violations。

#### B4. radius / shadow / spacing token 一貫性 — **PASS**

- **根拠**: `grep -rn "rounded-\[#\|rounded-\[rgba\|shadow-\[#\|shadow-\[rgba" src/lib --include="*.svelte"` の結果 0 件。ad-hoc px 値も既存検出なし。

#### B5. empty / loading / error 状態 — **部分的**

- **根拠**: `<EmptyState>` 7 箇所、`<LoadingState>` 2 箇所、`<ErrorState>` 1 箇所で採用 (LibraryMainArea / ErrorBoundary / OpenerSettings / SettingsPanel / WatchedFoldersSettings / ExeFolderWatchWidget / FileSearchWidget / ProjectsWidget)。
- **gap**: 全画面で `EmptyState` / `LoadingState` / `ErrorState` 採用とは **言えず**、widget の独自 empty text 残存。Industrial 風 (yellow + hatching) 適用も LoadingState のみ。実機 screenshot 取得は未実施。
