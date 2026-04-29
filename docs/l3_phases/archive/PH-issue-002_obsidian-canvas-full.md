---
id: PH-issue-002
title: Obsidian Canvas 完全実装 — 編集モード撤廃 / 即時保存 / Undo・Redo / Fit to content / 拡大率リセット / 入力マッピング全部
status: planning
parent_l1: REQ-006_workspace-widgets
related: 旧 PH-494 MVP (rollback で revert)、user 「MVP 禁止、ちゃんと実装しろ」指示
---

# Issue 2: Obsidian Canvas 完全実装

## 元 user fb (検収項目 #19/19-2/22)

> Obsidian Canvas のほぼコピー。編集モード切替撤廃 + 即時保存 + Undo/Redo + Fit to content + 拡大率リセット + Obsidian 入力マッピング全部
> **MVP は禁止、ちゃんと実装しろ**
> 入力マッピング: マウススクロール (上下 pan) / Shift+wheel (左右 pan) / Middle drag (自由 pan) / Ctrl+wheel (zoom)

## 引用元 guideline doc (新運用 §11 必須)

| Doc                                                  | Section                                                 | 採用判断への寄与                                                                        |
| ---------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `docs/l1_requirements/ux_standards.md`               | **§13 Workspace Canvas 編集 UX (batch-70)**             | 中ボタン drag / Space+左 drag / 編集モード scrollbar 非表示 (旧規格、本 plan で update) |
| `docs/l1_requirements/ux_design_vision.md`           | §2-3 モーション 3 原則 / §2-1 Juice                     | Responsive 100ms / `--ag-ease-in-out` 統一 / マイクロインタラクション                   |
| `docs/desktop_ui_ux_agent_rules.md`                  | **P5 OS / アプリの文脈** / P3 主要操作 / P10 熟練者効率 | Obsidian 慣習 (DTP / Notion / Figma) と OS 文脈 + ショートカット                        |
| `docs/l1_requirements/design_system_architecture.md` | §3 モーション設計言語 / §4 背景レイヤ                   | dotted grid 背景仕様                                                                    |
| `docs/l0_ideas/arcagate-visual-language.md`          | 「よく磨かれた工具」                                    | 過度な装飾 NG、操作性優先                                                               |
| `CLAUDE.md`                                          | 「設定変えたら即見た目が変わる、遅延反映は欠陥」        | 即時保存方針の根拠                                                                      |

## Fact 確認 phase (Goal A 時点 e36836c の現状)

### 既存実装 (`WorkspaceLayout.svelte:55-130` + `widget-zoom.svelte.ts`)

| 機能                                  | 現状                                                                                                     | 完成度                                                              |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **編集モード**                        | `editMode = $state(false)` + 「編集モード」ボタンで toggle、編集モード ON 中だけ pan / handle / D&D 動作 | ✅ あり (撤廃対象)                                                  |
| **Pan: 中ボタン drag**                | `e.button === 1` で `panActive`、`scrollLeft / scrollTop` を pointer delta で書換                        | ✅ あり                                                             |
| **Pan: Space + 左 drag**              | `keydown Space` → `panSpacePressed`、`pointerdown` で起動                                                | ✅ あり                                                             |
| **Pan: 通常 wheel スクロール**        | `overflow-auto` の native scroll                                                                         | ✅ ブラウザ標準                                                     |
| **Pan: Shift + wheel (左右 pan)**     | ❌ **未実装**                                                                                            | 要追加                                                              |
| **Zoom: Ctrl + wheel**                | `widget-zoom.svelte.ts` で `setWidgetZoom +/- 10` 単位 (50〜200%)                                        | ✅ あり                                                             |
| **Zoom mechanism**                    | widget セルの `widgetW / widgetH` を CSS var で再計算 (transform: scale ではなく実寸変更)                | △ 確認: Obsidian は transform: scale。本 plan で transform 化を検討 |
| **Undo/Redo (Ctrl+Z / Ctrl+Shift+Z)** | ❌ **未実装**                                                                                            | 要追加                                                              |
| **Fit to content**                    | ❌ **未実装**                                                                                            | 要追加                                                              |
| **拡大率リセット (Ctrl+0)**           | ❌ **未実装**                                                                                            | 要追加                                                              |
| **即時保存**                          | ✅ `cmd_update_widget_position` を pointerup で呼び DB 反映、reload 後も維持                             | OK (編集モード確定の二段階を撤廃すれば自動的に「即時」化)           |
| **選択モデル**                        | single (selectedWidgetId)、multi-select 未実装                                                           | ✅ single OK、multi はスコープ外 (将来 plan)                        |
| **Minimap**                           | ❌ **未実装**                                                                                            | △ 優先度低、将来 plan                                               |
| **Dotted grid 背景**                  | ❌ Goal A では未実装 (旧 PH-494 で追加 → revert)                                                         | 要再追加                                                            |

### 旧 §13 規格 (ux_standards) 整理

旧 §13 は本 PR で update が必要:

- 「中ボタン drag / Space+左 drag」 → **Obsidian 入力マッピング全部** に拡張
- 「編集モード時 scrollbar 非表示」 → 編集モード撤廃で **常時 scrollbar 動作 (canvas-edit-mode class) + dotted grid 常時表示**
- 「ホバー toolbar TBD」 → PH-issue-001 で確定済 (選択時 ring + handles)

## UX 本質 phase

User の指示の核:

1. **編集モード切替撤廃** = 「設定変えたら即見た目が変わる、遅延反映は欠陥」(CLAUDE.md 哲学)。編集モード ON/OFF の二段階は **遅延 + 状態管理コスト** を増やすだけで毎日使うランチャーには合わない。常時編集可能にし、誤操作回復は Undo で行う (P2 失敗は前提で立て直し)。
2. **MVP 禁止** = 過去の PH-494 (dotted grid + 表示領域拡大だけ) は scope 不足、user 不満。**Obsidian 慣習を一括移植** して "普通の人が触って違和感がない" 水準を狙う。
3. **入力マッピング全部** = Obsidian / Figma / Miro / FigJam の標準 (マウス / Shift+wheel / Middle drag / Ctrl+wheel + Ctrl+0 / Ctrl+Shift+1 / Ctrl+Z) に揃える、agent 独自の動線を作らない (P5 OS 文脈)。
4. **即時保存** = 編集モード ON で操作 → OFF で確定する旧フローを廃止。すべての pointerup / config 変更で **即 IPC + DB 反映** + reload 後も維持。
5. **Undo/Redo** = 削除 / 移動 / リサイズ / 追加 / config 変更を 5 種 history に積み、Ctrl+Z / Ctrl+Shift+Z で巻戻し。50 件履歴上限。

## 横展開 phase (CLAUDE.md 横展開原則)

| 領域                            | 影響 / 対応                                                                                                                               |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Library 画面                    | pan / zoom 対象外 (グリッド固定 / scroll) → 触らない、Workspace Canvas のみ pan/zoom                                                      |
| Settings panel                  | scroll 干渉なし、触らない                                                                                                                 |
| Palette                         | 独立 window、触らない                                                                                                                     |
| Title bar                       | 触らない                                                                                                                                  |
| Workspace Canvas (本 plan 対象) | 編集モード撤廃 + Obsidian 入力マッピング + Undo/Redo + Fit/Reset                                                                          |
| WidgetHandles (PH-issue-001)    | 既に「選択時のみ」表示。編集モード撤廃で **常時 selection 可** に → ring/handle が widget click ごとに出るようになる、PH-issue-001 と整合 |
| WorkspaceWidgetGrid Delete キー | 既存。編集モード撤廃で **常時動作** に変更 (入力欄 focus 中は無効、既存 logic 保持)                                                       |
| dotted grid 背景                | Goal A で無いので新設 (旧 PH-494 revert された分の再追加)                                                                                 |

## Plan 文書化 phase

### 採用案 A: 「Obsidian Canvas 完全コピー (編集モード撤廃 + 全入力マッピング + history + Fit/Reset)」

**入力マッピング (Obsidian 慣習通り)**:

| 入力                           | 動作                                                                                      | 引用                                            |
| ------------------------------ | ----------------------------------------------------------------------------------------- | ----------------------------------------------- |
| マウス wheel (上下)            | 縦 scroll (pan Y)                                                                         | Obsidian / Figma / Notion 標準                  |
| Shift + wheel                  | 横 scroll (pan X)                                                                         | Figma / Miro 標準                               |
| 中ボタン drag                  | 自由 pan (XY 同時)                                                                        | Obsidian / Figma / DTP ツール標準               |
| Space + 左 drag                | 自由 pan (XY 同時)                                                                        | Adobe / Figma / Miro 標準                       |
| Ctrl + wheel                   | zoom (50〜200%、Obsidian は 25〜400% だが Arcagate widget サイズに合わせて 50〜200% 維持) | Obsidian / Figma 標準                           |
| Ctrl + 0                       | 拡大率リセット (100%)                                                                     | Obsidian (`Reset zoom`) / VS Code               |
| Ctrl + Shift + 1 (or Ctrl + 9) | Fit to content (全 widget が画面に収まる zoom 自動計算)                                   | Obsidian (`Fit to content`) / Figma `Shift + 1` |
| Ctrl + Z                       | Undo                                                                                      | OS 標準                                         |
| Ctrl + Shift + Z (or Ctrl + Y) | Redo                                                                                      | OS 標準                                         |
| Delete / Backspace             | 選択 widget 削除確認 (既存、PH-issue-001 で実装済)                                        | OS 標準                                         |
| Esc                            | 選択解除 (新規)                                                                           | DTP 標準                                        |

**編集モード撤廃**:

- `editMode = $state(true)` を**常時 true** 同等に (toggle ボタン削除 + Tip 文言 update)
- 旧「編集モード」「編集を確定」ボタン削除、または **「Undo」「Redo」「Fit」「100%」ボタン**に置換 (右下 toolbar)
- pan / handle / D&D / Delete キー はすべて常時動作
- 入力欄 focus 中はキーボード handle (Delete / Esc) を無効化 (既存 logic 維持)

**Undo/Redo system**:

- 新規 `src/lib/state/workspace-history.svelte.ts` (旧 PH-477 と同名・同等構造):
  - `HistoryEntry = { kind: 'add' | 'remove' | 'move' | 'resize' | 'config', widgetId, before?, after? }`
  - 50 件 ring buffer
  - `record(entry)` / `undo()` / `redo()` API
- pointerup 時に before/after snapshot を渡して record (移動 / リサイズ)
- `addWidget` / `removeWidget` 時に snapshot 込みで record
- `updateWidgetConfig` 時に before/after JSON で record
- `WorkspaceLayout` の global keyboard listener で Ctrl+Z / Ctrl+Shift+Z を捕捉

**Fit to content / Reset zoom**:

- `useWidgetZoom` に `resetZoom()` (100%) と `fitToContent()` (全 widget の bounding box から zoom 自動計算) を追加
- 右下 floating toolbar に button 追加: `[Undo] [Redo] [-] [zoom%] [+] [⛶ Fit] [100%]`
- toolbar は `WorkspaceLayout` 右下、`absolute bottom-4 right-4`、ghost button 並び

**dotted grid 背景**:

- `WorkspaceLayout` の workspaceContainer に `radial-gradient(circle, rgba(120,120,120,0.22) 1.2px, transparent 1.4px)` で 16px 間隔 dot
- gradient + dot を背景に重ねる (旧 PH-494 と同等仕様)
- 編集モード撤廃で**常時表示**

**transform: scale 化 (検討)**:

- 現状 widget サイズを実寸で計算 → ズームすると DOM レイアウト全部再計算で重い
- Obsidian は inner container に `transform: scale(zoom)` で軽量
- 但し transform: scale は drop zone hit 検出 / pointer 座標計算が複雑化
- **本 plan では実寸計算を維持** (既存実装活用)、transform 化は別 plan (perf 課題が出たら)

### 棄却案 B: 「編集モード残す + Obsidian 入力マッピングだけ追加」

- 編集モードボタンが残る → 「即時保存じゃない」体験、user fb 直接違反
- → 棄却

### 棄却案 C: 「Obsidian 完全 copy (transform: scale + minimap)」

- transform: scale は drop zone / pointer 座標計算が複雑、本 plan のスコープ超過
- minimap は将来要望、本 plan ではスコープ外 (P9 画面密度: タスクに合わせて、毎日のランチャーなら不要)
- → 一部採用 (transform は別 plan、minimap は撤退)

## 規格 doc 同時 update

`docs/l1_requirements/ux_standards.md §13` を以下のように update:

1. **編集モード撤廃**: 「Workspace Canvas は常時編集可能、編集モードトグルは廃止」
2. **入力マッピング表 update**: 上記採用案 A のテーブルを §13 に embed
3. **scrollbar**: 「常時 native scroll を許可、`canvas-edit-mode` class は廃止 (常時 dotted grid)」
4. **Undo/Redo**: 「Ctrl+Z / Ctrl+Shift+Z で 5 種 history (add/remove/move/resize/config) を 50 件巻戻し」
5. **Fit / Reset**: 「Ctrl+0 (100%)、Ctrl+Shift+1 (Fit to content)」

## 横展開 audit + 機械化

- 旧 「編集モード」 button の参照を全 grep して削除確認 (`getByLabel('編集モード')` 等の test も update が必要)
- E2E spec が「編集モード ON で何かを確認する」パターンに依存していないか audit
- 機械化候補: `scripts/audit-edit-mode-removal.sh` (`getByLabel('編集モード')` や `editMode = false` 周りの dead code 検出) — 必要なら追加

## 実装ステップ

1. **規格 §13 update を先に commit** (規格 → 実装の順、§11 ルール準拠)
2. `WorkspaceLayout.svelte`:
   - `editMode = $state(true)` 固定 (or 撤廃して直接 true 渡し)、toggle button 削除
   - 旧「編集モード」「編集を確定」UI 削除
   - 右下 toolbar 新設 (Undo/Redo/zoom/Fit/Reset)
   - Shift+wheel 左右 pan の wheel handler 追加 (既存 widget-zoom.svelte の handler と統合)
   - dotted grid 背景常時化
   - keydown handler に Ctrl+0 / Ctrl+Shift+1 / Ctrl+Z / Ctrl+Shift+Z 追加
3. `src/lib/state/workspace-history.svelte.ts` 新規:
   - HistoryEntry 5 種、50 件 ring buffer、record/undo/redo
4. `workspace.svelte.ts` store:
   - addWidget / removeWidget / moveWidget / resizeWidget / updateWidgetConfig 全て **before/after snapshot を history.record()** に渡す
   - undo/redo 経路で IPC 呼び戻し (cmd_add_widget / cmd_remove_widget / cmd_update_widget_position / cmd_update_widget_config)
5. `useWidgetZoom`:
   - `resetZoom()` / `fitToContent(widgets, containerW, containerH)` 関数追加
   - Ctrl+wheel zoom は既存維持 (delta 10%)
6. WorkspaceWidgetGrid:
   - 編集モード prop の default を true 固定 (撤廃時の cleanup)
   - Delete キー handler は既存維持 (PH-issue-001 で実装済)
7. **Tests**:
   - 既存 `workspace-editing.spec.ts` の「編集モード」trigger を撤廃 (常時編集可能化)
   - 新規 `tests/e2e/canvas-pan-zoom.spec.ts`:
     - Ctrl+wheel zoom: zoom % が変化 + Fit/Reset button が動作
     - Shift+wheel: 横 scroll
     - 中ボタン drag: pan
     - Ctrl+0: 100% リセット
     - Ctrl+Z / Ctrl+Shift+Z: 削除した widget が復活 / 再削除
   - smoke tag: Undo/Redo の add/remove サイクル + zoom リセット
8. `pnpm verify` 全通過
9. PR 1 本 + auto-merge SQUASH 予約

## E2E シナリオ (新規 spec、1 @smoke)

- @smoke: 編集モードボタンが存在しないこと + widget 追加 → Ctrl+Z で消える + Ctrl+Shift+Z で復活
- 通常: Ctrl+wheel で zoom 変化 → Ctrl+0 で 100% に戻る → Ctrl+Shift+1 で Fit
- 通常: Shift+wheel で横 scroll
- 通常: 中ボタン drag で pan

## UI/UX Review Note (desktop_ui_ux_agent_rules §5 format)

```md
- Goal: Obsidian Canvas 慣習を完全移植、編集モード撤廃 + 即時保存 + Undo + 入力マッピング揃え
- Principle:
  - P5 OS / アプリの文脈 → Obsidian / Figma / Notion の標準キーマップに揃える
  - P2 失敗は前提 → Undo で誤操作回復 (編集モード ON/OFF の保護を撤廃する代わり)
  - P10 熟練者効率 → Ctrl+Z / Ctrl+0 / Shift+wheel をすべて装備
  - CLAUDE.md「設定変えたら即見た目が変わる」 → 即時保存
- Reason: 旧 PH-494 MVP は dotted grid + 表示領域拡大だけで user 不満、本 plan で完成形
- Before: 編集モード切替の二段階、Undo 無し、入力マッピング Space+drag のみ
- After: 常時編集可能、Ctrl+Z で 50 件履歴、Obsidian 入力マッピング全装備
- Trade-off: 誤操作 / 誤削除リスクは Undo で吸収、編集確定動作は廃止
```

## 検収

`docs/dispatch-operation.md §11` 準拠で:

- agent 側 `pnpm verify` + CDP screenshot で動作確認
- main 反映後、user dev session で体感反応 (明示確認なし)
- user fb で次 issue へ移行

## 参考: PH-issue-001 との依存関係

- PH-issue-001 (Widget handles 普通化) は **必要前提**:
  - selection ring + handles の実装は本 plan でも継続使用
  - 編集モード撤廃で「**常時 click 選択可能**」になる → handles も常時 click ごとに出る
  - PR #217 が main 反映してから本 plan 実装着手 (順序遵守)
