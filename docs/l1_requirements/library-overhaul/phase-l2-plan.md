# Phase L2 Plan: Library 基礎 UX (Industrial Yellow 全面適用)

**Status**: Plan / 実装着手 OK (L1 PR #284 提出後の連続 mode)
**Scope**: Playnite + Notion ベースの「日常使う user が当たり前と感じる」基礎 UX を Library 全体で確立。Industrial Yellow design 軸を **default として全面適用**。
**Date**: 2026-05-04
**Predecessor**: [phase-l1-plan.md](./phase-l1-plan.md) (PR #284) / [phase-plan.md §6.2](./phase-plan.md) / [design-direction.md](./design-direction.md)
**触らない**: virtualization / 高度 bulk / dynamic collection / grouping / frecency (L3)

## 0. 引用元 guideline

- [design-direction.md](./design-direction.md) §0.2 (Industrial Yellow checklist) / §0.3 (widget UX 常識)
- [ux_standards.md §12](../ux_standards.md) (Library 操作 UX 規約) — L1 で追記済 3 規約継承
- [design_system_architecture.md](../design_system_architecture.md) — token 階層 (primitive → semantic → component)
- CLAUDE.md `<critical-rule id="label-content">` / `<critical-rule id="instant-feedback">`
- [industry-comparison.md](./industry-comparison.md) — Playnite 3-view + Notion bulk bar + Raycast keyboard

## 1. 着手前 task (D9): Industrial Yellow spec

L2 着手前に **`docs/l1_requirements/design/industrial-yellow-spec.md`** を起こす。design-direction.md §0.2 を実装可能 spec に展開。

### 内容

- 配色 token: 蛍光イエロー (`#FFE600`) / 白パネル (`#F1F1EB`) / 黒地 (`#050605`) / オレンジ菱形 (`#FF7A00`) を semantic token (`--ag-il-yellow` / `--ag-il-paper` / `--ag-il-ink` / `--ag-il-orange`) として定義、既存 `--ag-accent` 等との対応表
- shape token: ピル型 button (`shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]` 等)、L 字ブラケット border、ハーフトーンドット背景、斜線ハッチ
- state token: focus-visible ring / selected fill / hover elevation / disabled opacity / error orange
- empty/loading/error の Industrial 風表現 (skeleton + hatching、orange 菱形 marker)

### 成果物

- `docs/l1_requirements/design/industrial-yellow-spec.md` (~150 行)
- `src/lib/styles/arcagate-theme.css` に Industrial 系 semantic token 追加 (旧 token は維持、まず追加だけ)
- `src/lib/components/arcagate/common/IndustrialPanel.svelte` (panel + L 字 + ハッチ の prefab、~80 行)
- `src/lib/components/arcagate/common/IndustrialButton.svelte` (ピル型物理 button prefab、~60 行)

## 2. PR / commit 構造

### PR L2-A: Industrial Yellow spec + token + prefab (3-4 commit、~5 h)

| #  | 種別         | 内容                                                                                                        |
| -- | ------------ | ----------------------------------------------------------------------------------------------------------- |
| A1 | docs         | industrial-yellow-spec.md 作成                                                                              |
| A2 | feat(theme)  | semantic token (`--ag-il-*`) を arcagate-theme.css に追加 (旧 token 維持)                                   |
| A3 | feat(common) | IndustrialPanel / IndustrialButton 共通 component + Storybook 風 demo route                                 |
| A4 | refactor     | LibraryDetailPanel / StatCard / sidebar の **可視部 3 component** だけ Industrial token に切替 (smoke test) |

**verify**: pnpm verify pass + 実機 CDP screenshot (Library trip 全画面 before/after)。

### PR L2-B: keyboard nav + undo (4-5 commit、~5 h) — phase-plan §6.2 L2-1 + L2-2

| #  | 種別          | 内容                                                                       |
| -- | ------------- | -------------------------------------------------------------------------- |
| B1 | feat(library) | grid 矢印 nav (上下左右) + Enter 起動 + Esc deselect + tabindex 整備       |
| B2 | feat(library) | `F2` rename inline / `F3` edit dialog / `Cmd+A` / `Del` delete (with undo) |
| B3 | feat(library) | `Ctrl+F` focus search / type-to-jump (1 文字で先頭一致 jump)               |
| B4 | feat(undo)    | delete 時 5 sec undo toast (workspaceHistory pattern を Library 用に拡張)  |
| B5 | test          | unit (focus state / keyboard handler) + e2e (keyboard で全操作)            |

**Industrial 適用**: focus-visible ring を蛍光イエロー、selected を fill ピル型に。

### PR L2-C: filter / sort / search 強化 (4-5 commit、~6 h) — L2-3 + L2-4

| #  | 種別          | 内容                                                                                                             |
| -- | ------------- | ---------------------------------------------------------------------------------------------------------------- |
| C1 | feat(library) | sort dropdown (name / 追加日 / 最終起動 / launch count / size) + 永続化                                          |
| C2 | feat(library) | multi-tag filter chip + AND/OR toggle + 複数 type filter                                                         |
| C3 | feat(library) | filter preset 保存 (localStorage)、4 preset slot                                                                 |
| C4 | feat(search)  | fuzzy match (subsequence + 大小区別なし) を fts-mini util で実装                                                 |
| C5 | feat(search)  | 日本語 kana-katakana-romaji 正規化 (依存最小: @marmooo/kuroshiro-jp 等の比較選定 → 入れる場合は別 commit で分離) |
| C6 | feat(search)  | alias / target / tag 横断 search、`compositionend` debounce で IME 対応                                          |

**Industrial 適用**: filter chip は L 字 bracket、active chip は蛍光イエロー fill。kuroshiro 採否は bundle-size 計測してから判断 (1.5 MB の重み)。

### PR L2-D: empty / loading / error + view toggle (3-4 commit、~4 h) — L2-5 + L2-6

| #  | 種別          | 内容                                                                                    |
| -- | ------------- | --------------------------------------------------------------------------------------- |
| D1 | feat(library) | 全 0 item: 「フォルダを scan / URL paste / drag-drop」 prominent CTA + 例 item template |
| D2 | feat(library) | filter 0 件: 「filter を解除」 button + 「全件表示に戻す」                              |
| D3 | feat(library) | 3-view toggle (Grid / List / Category)、segmented control + 永続化                      |
| D4 | refactor      | loading skeleton を Industrial 風 (hatching + 菱形) に統一                              |

## 3. design checklist (L2 全 PR 共通、design-direction.md §0.2 / §0.3 の checklist 全項目を verify)

### Industrial Yellow 適用箇所 (PR ごとに転記)

- [ ] **配色**: 蛍光イエロー / 白パネル / 黒地 / オレンジ菱形が L1 で挙げた 4 色 default で適用
- [ ] **shape**: ピル型物理 button / L 字 bracket / ハーフトーン / 斜線ハッチ
- [ ] **state**: focus-visible 蛍光イエロー / selected fill / hover 軽 elevation / disabled opacity 0.4 / error orange
- [ ] **empty/loading/error**: Industrial 風 (skeleton hatching + orange 菱形 marker)

### widget UX 常識 (各 PR で本 PR 範囲に対し verify)

- [ ] 削除確認 1 step + 5 sec undo (B4 で実装)
- [ ] 半透明 / ぼかしは backdrop だけ
- [ ] label は機能 / 状態 / アクション (icon 名禁止)
- [ ] keyboard a11y (focus-visible / tab order / Esc / Enter)
- [ ] 「普通のアプリならそうしない」回避 (B/C/D PR で具体 self-check)

## 4. verification matrix

### unit (vitest)

- A2 token: `arcagate-theme.css` に追加した変数が CSS variable として読める test
- B1-B3 keyboard handler: focus state / 矢印 / Esc の純関数 test
- C1-C2 filter / sort: pure function に切り出して unit test (sort comparator / filter predicate)
- C4-C6 fuzzy / kana 正規化: pure function unit (jp / en / mixed input)

### e2e (Playwright)

- B5: keyboard で grid 矢印 → Enter → 起動 / `F2` rename / `Del` undo の一連
- C: filter chip 操作で結果絞り込み + permalink 維持
- D: empty state CTA 動作

### 実機 CDP screenshot

- A4 / B / C / D 各 PR で Library 全画面 before/after を撮影、design checklist と照合
- Codex 二次レビュー で機械的退行検出

## 5. branch / PR 戦略

- **branch**: 各 PR ごとに `fix/library-l2-{a-design,b-keyboard,c-search,d-empty}` を main から切る
- **squash merge**、各 PR title に Phase / scope を明示
- 連続 mode: L2-A merge → L2-B branch、L2-D merge → L3 plan へ

## 6. rollback

各 PR 単位で `git revert <merge-commit>`。L2-A の token 追加は旧 `--ag-*` を維持しているので戻しても旧画面は壊れない。

## 7. 残課題 (L3 持ち越し)

- virtualization / 高度 bulk / icon variants / dynamic collection / grouping / frecency
- kuroshiro が bundle 増過大なら C5 を skip し L3 で軽量代替検討
- D10 の「default Industrial vs opt-in theme」は L2-A で **default 適用 + 旧 theme 切替えで戻れる退路**として実装

## 8. 連続 mode 規律

- L2-A PR → 即 L2-B plan → 即 L2-B branch (user 待ちなし)
- 退行検出時のみ user に止めて報告
- design checklist (§3) を各 PR description に必ず転記
