---
id: PH-issue-005
title: アイテム Picker = LibraryCard 再利用 + 複数選択 + ソート / フィルタ
status: planning
parent_l1: REQ-006_workspace-widgets
related: 旧 PH-474 (Picker = LibraryCard 再利用、rollback で revert)
---

# Issue 5: アイテム Picker 刷新 — LibraryCard 再利用

## 元 user fb (検収項目 #5)

> Picker は Library カードを再利用、複数選択 + ソート / フィルタを Library と揃える

## 引用元 guideline doc

| Doc                                    | Section                                                           | 採用判断への寄与                                       |
| -------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------ |
| `docs/desktop_ui_ux_agent_rules.md`    | **P4 (同じ意味のものは同じように扱う) / 補足 2 (画面間の一貫性)** | Library と Picker で別 UI は不整合、共通コンポーネント |
| `docs/l1_requirements/ux_standards.md` | §6-3 Dialog / §11 アイテムカードサイズ                            | dialog 内 LibraryCard サイズ                           |
| `docs/l1_requirements/use-cases.md`    | アイテム選択 use case                                             | Library から widget へ追加するフロー                   |
| `CLAUDE.md`                            | 「同じ機能 = 同じ icon + 同じラベル」                             | Picker と Library で挙動 / 見た目を揃える              |

## Fact 確認 phase

`src/lib/components/arcagate/workspace/LibraryItemPicker.svelte` の現状実装を確認 (Goal A 時点)。
おそらく独自実装で、Library 画面の `LibraryMainArea.svelte` の LibraryCard とは別経路。

## UX 本質 phase

User 「LibraryCard 再利用」 =

1. Picker を開いた時に **Library と同じ見た目 + 同じ操作モデル** を提供 (P4 一貫性)
2. **複数選択 mode** で複数 item を一括 widget に紐付け
3. **ソート / フィルタ** UI も Library と共有 (search, タグ filter, sort by 起動回数等)
4. **タグ system** と連動 (Library の tag 切替が Picker 内でも動く)

→ **`LibraryCard.svelte` を Picker 内で再利用**し、サイズ・選択・hover・お気に入り表示を全部揃える。
→ Picker 固有の UI は「複数選択 mode toggle」「決定 / キャンセル」ボタンと dialog wrapper のみ。

## 横展開 phase

| 領域                                                   | 対応                                                                                  |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `LibraryCard.svelte` (既存)                            | 再利用、選択 mode prop を追加                                                         |
| `LibraryItemPicker.svelte`                             | 大幅 refactor、内部に LibraryMainArea 相当の表示 + 選択 toolbar                       |
| `LibraryMainArea.svelte` 既存 logic                    | 検索 / sort / filter store を Picker でも使えるよう抽出 (LibraryFilterToolbar 共通化) |
| Item Widget (`src/lib/widgets/item/ItemWidget.svelte`) | Picker 経由の選択結果を受け取って表示 (既存 IPC 維持)                                 |
| WidgetSettingsDialog                                   | Picker を中で render する箇所                                                         |

## Plan: 採用案 A: 「LibraryCard 再利用 + 選択 mode + 共通 toolbar」

**新コンポーネント**: `LibraryFilterToolbar.svelte` (search input + sort dropdown + tag filter chip)

- LibraryMainArea と LibraryItemPicker の両方で使う

**LibraryCard.svelte 拡張**: `selectionMode?: 'single' | 'multi' | null` prop 追加

- selectionMode === 'multi': click でカードに ✓ overlay、selected 状態を highlight
- selectionMode === null (default): 既存通り、click で起動

**LibraryItemPicker.svelte 改修**:

- 上部: LibraryFilterToolbar
- 中央: LibraryCard グリッド (selectionMode='multi')
- 下部: 「選択を確定」「キャンセル」ボタン

## 棄却案 B: 「Picker 独自実装維持、見た目だけ Library 風に」

- 二重実装、Library 側変更時に Picker が乖離するリスク
- → 棄却 (P4 違反)

## 棄却案 C: 「Library 画面を Picker mode と通常 mode のスイッチで兼用」

- Library 画面が dialog 内に出るのは UX が重い (mode 状態管理が複雑)
- → 棄却

## 横展開 audit (CI 候補)

- `src/lib/components/arcagate/workspace/LibraryItemPicker.svelte` 内に `LibraryCard` import が無ければ violation (機械検証)

## E2E 1 シナリオ + smoke

- `tests/e2e/library-item-picker.spec.ts` (1 @smoke):
  - Item Widget 設定 → Picker 開く → Library と同じ並び (sort 100% 一致)
  - 複数選択 → 確定 → widget が複数 item 表示

## 規格 update

`ux_standards §6-3 Dialog` に「Library Picker は LibraryCard + LibraryFilterToolbar の再利用が必須」を追加。

## 実装ステップ

1. LibraryFilterToolbar.svelte を抽出 (LibraryMainArea から)
2. LibraryCard.svelte に selectionMode prop 追加
3. LibraryItemPicker.svelte 全面 refactor
4. ItemWidget で複数 item 表示 (旧 PH-474 で実装、再構築)
5. E2E spec
6. ux_standards §6-3 update
