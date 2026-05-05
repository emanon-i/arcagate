# Vitest Coverage — 2026-05-04

**Method**: `pnpm vitest run --coverage --coverage.reporter=text --coverage.include='src/lib/utils/**' --coverage.include='src/lib/state/**'`、依存修正 (vitest 4.0.18 → 4.1.5 で `@vitest/coverage-v8 ^4.1.5` と揃える) 後の実行。

## 全体 (32 test files / 313 tests pass)

| metric     | value              |
| ---------- | ------------------ |
| Statements | 38.88 % (535/1376) |
| Branches   | 44.52 % (313/703)  |
| Functions  | 28.27 % (82/290)   |
| Lines      | 38.12 % (467/1225) |

## 領域別 (utils + state scoped)

| 領域                    | Lines  | 判定                   |
| ----------------------- | ------ | ---------------------- |
| `src/lib/utils/**` 全体 | 82.46% | ✅ ≥ 80% threshold     |
| `src/lib/state/**` 全体 | 19.30% | (参考、DOM-coupled 多) |

### state 個別 (Lines 降順)

| file                                         | Lines % | 備考                     |
| -------------------------------------------- | ------- | ------------------------ |
| metadata.svelte.ts                           | 96.96   | ✅                       |
| library-history.svelte.ts                    | 93.10   | ✅                       |
| error-monitor.svelte.ts                      | 88.09   | ✅ (R4-A 新規)           |
| help.svelte.ts                               | 83.33   | ✅                       |
| updater.svelte.ts                            | 43.33   | (test 一部)              |
| toast.svelte.ts                              | 40.00   |                          |
| hidden.svelte.ts                             | 37.50   |                          |
| config.svelte.ts                             | 24.67   | (load/save 多)           |
| workspace-history.svelte.ts                  | 21.05   |                          |
| items.svelte.ts                              | 14.94   | (mutation 多、test 不足) |
| workspace.svelte.ts                          | 3.86    | (DOM 結合)               |
| pointer-drag / theme / palette / widget-zoom | 0       | (DOM 結合、e2e 担保)     |

### utils 個別 (Lines 降順)

| file                                                                                  | Lines % |
| ------------------------------------------------------------------------------------- | ------- |
| format-error.ts / format-target.ts / library-sort.ts / resize-delta.ts / zoom-math.ts | 100     |
| grid-keyboard.ts                                                                      | 84.37   |
| ipc-error.ts                                                                          | 73.33   |
| local-storage.ts                                                                      | 21.05   |
| format-meta.ts                                                                        | 0       |

## 判定 (audit J1、R5-1 新 criteria)

- **Pass criteria** (criteria-quality.md J1):
  1. `src/lib/utils/**` 全体 Lines ≥ 80%
  2. business-critical state stores 5 以上で Lines ≥ 80%
- **観測**:
  1. utils Lines = 82.46% ≥ 80% ✅
  2. ≥ 80% の store: metadata (97) / library-history (93) / error-monitor (88) / help (83) → **4 store**、target 5 に **1 不足**
- **判定**: 🟡 **部分的** (utils PASS、state は 4/5 quasi-pass)
- **gap**: state 5 個目を ≥ 80% にするため、`items.svelte.ts` の load/create/update/toggleStar/deleteItem 関数の unit test を追加 (R5+ で実施)
