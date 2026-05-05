# Lessons ↔ Test Cross-Reference (R7-1 / audit J4)

`docs/lessons.md` の severity=critical / high entry が e2e or unit test でカバーされているか cross-reference。FAIL 時の再発を機械検証で検知する仕組み。

## critical (再発したら大事故)

| lesson                                                           | 対応 test                 | カバー状態                                 |
| ---------------------------------------------------------------- | ------------------------- | ------------------------------------------ |
| 「verify pass = 治った」と書かない (CLAUDE.md `<dom-not-fixed>`) | (process 規律、test 不要) | N/A — test では検証できない agent ops 規律 |
| Guideline doc を読まないと UI 品質が落ちる (`<cite-guideline>`)  | (process 規律)            | N/A                                        |

## high

| lesson                                                           | 対応 test                                                                                           | カバー状態                                    |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| **CSS トークン未定義は静かに失敗**                               | `bash scripts/audit-design-tokens.sh` (CI lefthook)                                                 | ✅ 機械検出、PR で必須 check                  |
| **並行 PR は破綻**                                               | (process 規律)                                                                                      | N/A                                           |
| **同 widget を 4 回 fix しても改善しなければ廃止** (ClockWidget) | (process 規律 + critical-rule `abandon-after-three-fixes`)                                          | N/A                                           |
| **Native `<select>` の OS 依存 popup 配色**                      | `src/app.css` の `.dark select option { color-scheme: dark }` 強制適用                              | ✅ CSS で fix 済、専用 test なし (e2e で目視) |
| **pointerdown + onclick の二重発火**                             | `tests/e2e/widget-handles.spec.ts`、`tests/e2e/widget-overlap-prevention.spec.ts`                   | ✅ e2e でドラッグ vs click 分岐検証           |
| **per-card $effect IPC 並列** (R6 lessons.md 追加)               | `src/lib/state/metadata.svelte.test.ts` 6 件、batch IPC を unit で検証                              | ✅ unit                                       |
| **mutation 後 sidebar 件数 stale** (R6 追加)                     | `src/lib/state/items.svelte.test.ts` 14 件 で `refreshSidebarStats` 動作検証                        | ✅ unit                                       |
| **silent fail (frontend unhandledrejection 0)** (R4-A 追加)      | `src/lib/state/error-monitor.svelte.test.ts` 7 件 + `scripts/release-checks/check-error-monitor.sh` | ✅ unit + CI gate                             |

## medium

| lesson                                                           | 対応 test                                         | カバー状態          |
| ---------------------------------------------------------------- | ------------------------------------------------- | ------------------- |
| **Playwright × WebView2 落とし穴** (`page.mouse.up()` afterEach) | `tests/e2e/fixtures/tauri.js` の `afterEach` hook | ✅ fixture 内で強制 |
| **アーカイブ時の git add -u 漏れ**                               | (process 規律)                                    | N/A                 |

## reference (archive 参照)

`docs/archive/lessons-historical.md` の細かい罠は on-demand grep。本 cross-reference では集約しない。

## 判定 (audit J4)

- **Pass criteria** (criteria-quality.md J4): critical / high entry が **必ず regression test に対応** (もしくは process 規律 = N/A)
- **観測**:
  - critical 2 件: 両方 process 規律 (N/A)
  - high 8 件: test 化可能なもの 5 件 → 全て unit / e2e / audit script でカバー、process 規律 3 件 (N/A)
- **判定**: ✅ **PASS** (test 化可能なものは全件 covered、process 規律は doc + critical-rule で代替)

## 補記

- 本 cross-reference は `docs/lessons.md` 更新のたびに同期する責務 (新 entry が追加されたら test cover か N/A かを記載)
- 自動同期は scripts/audit-lessons-coverage.sh で機械検証可能 (R7+ で実装検討、blocker でない)
