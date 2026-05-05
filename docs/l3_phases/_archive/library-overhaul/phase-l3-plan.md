# Phase L3 Plan: Library 機能追加 + 性能 + Industrial polish

**Status**: Plan / 実装着手 OK (連続 mode L2 → L3)
**Scope**: 性能 (virtualization) / 高度機能 (bulk / dynamic / grouping / frecency) / icon system 強化 / L2 で持ち越した polish
**Date**: 2026-05-04
**Predecessor**: [phase-l2-plan.md](./phase-l2-plan.md) / [phase-plan.md §6.3](./phase-plan.md) / [design-direction.md](./design-direction.md) / [industrial-yellow-spec.md](../design/industrial-yellow-spec.md)

## 0. 引用元 guideline

- [phase-plan.md §6.3](./phase-plan.md) — L3 範囲 / PR 構成
- [industry-comparison.md](./industry-comparison.md) — Playnite / Notion ターゲット
- [ux_standards.md §12](../ux_standards.md) — Library 操作 UX 規約
- [industrial-yellow-spec.md §3-6](../design/industrial-yellow-spec.md) — token / state / migration
- CLAUDE.md `<critical-rule id="instant-feedback">` / `<critical-rule id="dom-not-fixed">`

## 1. PR / commit 構造 (4 PR、phase-plan §6.3 を踏襲)

### PR L3-A: virtualization (~6 h、独立 PR、大改修)

**目標**: 200+ item でも frame drop / GC pressure 解消、Playnite 同等の応答性。

| #  | 種別          | 内容                                                                                         |
| -- | ------------- | -------------------------------------------------------------------------------------------- |
| A1 | feat(library) | @tanstack/svelte-virtual で grid / list virtualization (visible window のみ render)          |
| A2 | feat(library) | scroll position 維持 (mount 復元 + 200ms debounce save、既存 LibraryLayout pattern を流用)   |
| A3 | feat(library) | virtualization 互換に keyboard nav 調整 (focus index → DOM mount 待ち、IntersectionObserver) |
| A4 | test          | 500 item / 1000 item で frame rate 計測 + e2e (rubber-band scroll、focus 維持)               |

**design**: card visual 変更なし、virtualization は内部 implementation detail。
**退行 risk**: **高** (focus / a11y / drag-drop matrix が広い、Codex 二次レビュー必須)。

### PR L3-B: bulk + grouping + dynamic collection (~10 h)

| #  | 種別          | 内容                                                                                       |
| -- | ------------- | ------------------------------------------------------------------------------------------ |
| B1 | feat(library) | rubber-band selection (drag で範囲選択、card hit-test)                                     |
| B2 | feat(library) | floating bulk bar (Notion ライク、上部 sticky)、existing bulk handlers と合流              |
| B3 | feat(library) | bulk move (collection 移動)、bulk export (JSON)                                            |
| B4 | feat(library) | grouping by tag / type / 起動頻度、sticky section header + collapse + per-tag persist      |
| B5 | feat(dynamic) | rule-based dynamic collection (sidebar に section 追加、SQL query で生成) + rule editor UI |
| B6 | test          | unit (selection logic / group reducer) + e2e                                               |

**design**: bulk bar は Industrial Yellow、ピル型物理 button、L 字 bracket で 選択 highlighting。
**退行 risk**: **中** (dynamic collection は SQL query パフォーマンス注意、500+ item でベンチ必須)。

### PR L3-C: frecency + icon system 強化 (~8 h)

| #  | 種別         | 内容                                                                                                   |
| -- | ------------ | ------------------------------------------------------------------------------------------------------ |
| C1 | feat(search) | frecency / smart ranking (search 結果を usage × recency で sort、launch_log + item_stats 活用)         |
| C2 | feat(icon)   | icon variants (thumbnail / cover / hero) — Playnite 3-slot 同等                                        |
| C3 | feat(icon)   | extraction failure fallback UI (「再 extract」 button)、cache invalidation (target file の mtime 比較) |
| C4 | perf(icon)   | drop-shadow GPU compositing 最適化 (large grid で paint cost 削減)                                     |
| C5 | test         | unit (frecency calc / icon variant select) + e2e (launch 後の frecency 反映)                           |

### PR L3-D: L2 持ち越し polish (Industrial 全面適用 + multi-tag chip + filter preset + kana 正規化) (~6 h)

| #  | 種別              | 内容                                                                                                                                                         |
| -- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1 | refactor(library) | LibraryCard / sidebar / search bar / sort dropdown / EmptyState を **Industrial Yellow token に全面移行** (--ag-il-* 全面採用、旧 --ag-* は他画面のため維持) |
| D2 | feat(library)     | multi-tag filter chip + AND/OR toggle + 複数 type filter (L2 C2 持ち越し)                                                                                    |
| D3 | feat(library)     | filter preset 4 slot 保存 (localStorage、L2 C3 持ち越し)                                                                                                     |
| D4 | feat(search)      | 日本語 kana-katakana-romaji 正規化 (kuroshiro vs 軽量代替を bundle-size 計測してから採用判断、L2 C5 持ち越し)                                                |
| D5 | feat(library)     | 3-view toggle Category mode 完成 (L2 D3 持ち越し、L3-B grouping と統合)                                                                                      |
| D6 | refactor(loading) | LoadingState を Industrial 風 skeleton に書き直し (hatching + 菱形、L2 D4 持ち越し)                                                                          |

## 2. design checklist (L3 全 PR 共通、design-direction.md §0.2 / §0.3 を全項目 verify)

### Industrial Yellow 適用箇所

- [ ] **配色 / shape / state / empty-loading-error** — L3-D で全面適用、L3-A/B/C はその場で必要な component のみ
- [ ] L 字 bracket: 選択 / focus 強調を多用 (Library card、bulk bar、filter chip)
- [ ] ハーフトーン / 斜線ハッチ: skeleton / loading だけでなく、bulk bar の background / dynamic collection rule editor header にも適用検討

### widget UX 常識

- [ ] 削除確認 1 step + 5 sec undo: bulk delete でも undo 可能に (L2-B history を bulk 拡張)
- [ ] 半透明 / ぼかし: backdrop だけ、bulk bar 背景は不透明 paper
- [ ] label: 全 button / tooltip が機能 / 状態 / アクション、icon 名禁止
- [ ] keyboard a11y: virtualization 後も keyboard nav / focus が壊れない
- [ ] 「普通のアプリならそうしない」: 200+ item で滑る、500+ で遅延がない、drag selection で誤操作しない

## 3. verification matrix

### unit (vitest)

- L3-A: virtualizer 設定 (visible window 計算) を pure func 化 → unit test
- L3-B: rubber-band hit-test / group reducer / dynamic collection rule eval は pure func test
- L3-C: frecency 計算 (decay 関数) / icon variant 選択は pure func test
- L3-D: kana 正規化 / multi-tag AND/OR predicate は pure func test

### e2e (Playwright)

- L3-A: 500 item で scroll → frame rate 計測 / focus 維持確認
- L3-B: rubber-band drag → 複数選択 → bulk export
- L3-C: launch を繰り返して search 上位に上がる
- L3-D: 各 PR で Industrial token 適用後の Library 全画面 screenshot

### 実機 CDP screenshot

- 各 PR で before/after 画面、design checklist 全項目 verify
- Codex 二次レビューで機械的退行検出 (token mismatch / dead code / a11y)

## 4. branch / PR 戦略

- 各 PR は **main から派生** (L2 全 PR merge 後の clean main を base)
- L3-A → L3-B → L3-C → L3-D の順次 (互いに独立 + L3-D が他に依存)
- 連続 mode: L3-A merge → L3-B branch、L3-D merge → release 検討

## 5. rollback

各 PR 単位で `git revert <merge-commit>`。virtualization は最も大きな変更だが既存 grid layout を完全置換せず toggle で残す案も検討 (defense in depth)。

## 6. 残課題 (L3 後)

- **distribution era**: code signing / installer 改善 / app store 配布
- **performance era**: indexedDB cache / IPC stream / WebWorker offload (L3 で足りなければ次 phase)
- **collaboration era**: workspace export / cloud sync — 現 scope 外、需要が出たら別 phase

## 7. 連続 mode 規律

- L3-A PR → 即 L3-B plan → 即 L3-B branch (user 待ちなし)
- 退行検出時のみ user に止めて報告
- design checklist (§2) を各 PR description に必ず転記
- L3 完了後は user に「Library overhaul 全 phase 完了」 milestone 報告 + distribution era 提案
