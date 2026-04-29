---
id: PH-issue-001
title: Widget handles 普通化 — Lucide ghost-icon × 編集モード規格整合 (ux_standards §6-1 / §13 + desktop_ui_ux_agent_rules P1/P3/P4/P5/P11/P12)
status: planning
parent_l1: REQ-006_workspace-widgets
related: 旧 PH-472 (handles normalize) + 旧 PH-486 (delete button emphasis)、両 plan は rollback で revert 済、本 plan で再実装
---

# Issue 1: Widget handles 普通化

## 元 user fb (検収項目 #1、再開時に user 「良かった」評価あり)

> ハンドル独自実装やめて、削除ボタンもださい。**普通そう実装しないでしょう**。

## 引用元 guideline doc (新運用 §11 必須)

| Doc                                         | Section                                                           | 採用判断への寄与                                                                                                                                 |
| ------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `docs/desktop_ui_ux_agent_rules.md`         | §1 最上位順 / P1 / P3 / P4 / P5 / P11 / P12                       | 操作 > 結果 > 立て直し > 意味 > 一貫 > 速さ > **見た目最後**。装飾より対象、整合性優先                                                           |
| `docs/l1_requirements/ux_standards.md`      | **§6-1 Widget**, **§13 Workspace Canvas 編集 UX 規約 (batch-70)** | 編集モード時 設定 + 削除可視 / `ring-2 ring-accent` / リサイズ段階 (e/s/se → 完成) / Trash2 ボタン / Delete・Backspace キー / hover toolbar 計画 |
| `docs/l1_requirements/ux_design_vision.md`  | §2-3 モーション 3 原則                                            | Purposeful / Responsive (100ms) / Consistent。easing は `--ag-ease-in-out` 統一                                                                  |
| `docs/l0_ideas/arcagate-visual-language.md` | 「よく磨かれた工具」 / 避けるキャラ                               | 過度に派手 NG → `rounded-full bg-destructive` 派手丸 を改める根拠                                                                                |
| `CLAUDE.md`                                 | 哲学節 (P4 横展開)                                                | 1 ファイル fix で終わらせない、同じ間違いは他にもある前提                                                                                        |

## Fact 確認 phase (Goal A 時点 e36836c — rollback merge 後の current 想定)

### 現状実装

`src/lib/components/arcagate/workspace/WorkspaceWidgetGrid.svelte` (318 行) 内、`{#each widgets}` ループ内で **編集モード ON 時に常時可視** の独自ハンドル群:

| 要素                      | 現状コード                                                                                                          | 違反観点                                                                                                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Drag handle** (左上)    | 24×24 角丸 chip、`bg-[var(--ag-surface-4)]/80`、`GripVertical` icon、`cursor-grab`、aria-label="ウィジェットを移動" | `ux_standards §6-1` で「設定 + 削除」を必須化しているが drag handle 仕様は未明記 (§13 で hover toolbar 計画は将来扱い) → 規格穴                                                   |
| **Delete button** (右上)  | **`rounded-full bg-destructive/80` 派手丸**、white text、`Trash2` icon、aria-label="ウィジェットを削除"             | **`arcagate-visual-language.md`「過度に派手 NG / よく磨かれた工具」違反**、`desktop_ui_ux_agent_rules P11`「装飾は対象より目立たない」違反、`P12`「派手な独自表現より整合性」違反 |
| **8 方向 Resize handles** | n/s/e/w 辺ストリップ + 4 corner chip、常時透明 + hover 半透明 accent                                                | `ux_standards §13` (batch-70) で **e/s/se の 3 つのみ規格化**、それ以外は将来扱い → 規格との時系列差。aria-label 規定は遵守済み (`RESIZE_LABELS` 参照)                            |
| **Selection ring**        | **無し** (selectedWidgetId は管理しているが `ring-2 ring-accent` 表示が無い、box-shadow inline で margin 表現のみ)  | **`ux_standards §6-1`「編集モード選択: ring-2 ring-[var(--ag-accent)]」を実装していない** ← 規格違反確定                                                                          |

### Root cause (UX 本質 phase)

`desktop_ui_ux_agent_rules` 最上位順で評価:

1. **意味が理解できること (#4)**: drag handle と delete button の icon 形 (`GripVertical` 縦 3 点 / `Trash2` ゴミ箱) は意味伝達 OK
2. **一貫していて予測できること (#5)**: ❌ 「**選択状態**を ring で示す」という規格 (§6-1) が**未実装**、選択 vs 非選択の差が薄い → user は「どれが今 active か分からない」
3. **見た目最後 (#7)**: ❌ にもかかわらず `bg-destructive/80` 丸 + `surface-4/80` chip が **対象より目立つ** (P11 違反)

→ user 「ださい」の根本: **規格通りの ring が無く** + **派手な丸ボタンが対象を圧迫** + **常時表示が認知ノイズ**。

「**普通そう実装しないでしょう**」の "普通" = `desktop_ui_ux_agent_rules` の P1/P3/P4/P5 + `ux_standards §6-1/§13` の規格通りに作ること、独自に派手な丸を足さないこと。

## 横展開 phase (CLAUDE.md 横展開原則 / P4 補足 3 必須)

同 pattern (絶対配置の icon button on widget/panel top) を全画面 grep。

### Widget container 系 (修正対象)

- ✅ `WorkspaceWidgetGrid.svelte:215-310` — **本 plan の対象**

### List item 内 delete button (修正不要、既に **規格通り** "ghost 風")

`grep -rnE "Trash2|XIcon|aria-label.*削除"` で audit:

| ファイル                            | 実装                                                                                         | 評価                                                         |
| ----------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `SnippetWidget.svelte:88-95`        | `opacity-0 group-hover:opacity-100` + `rounded p-0.5` ghost X、aria-label="スニペットを削除" | ✅ `ux_standards §6-4` ghost variant + P11 (邪魔しない) 整合 |
| `ClipboardHistoryWidget.svelte:159` | aria-label="履歴から削除"                                                                    | ✅ 同上                                                      |
| `DailyTaskWidget.svelte:130`        | aria-label="タスクを削除"                                                                    | ✅ 同上                                                      |
| `FileSearchWidget.svelte:186`       | XIcon 検索クリア                                                                             | ✅                                                           |

→ 既に "普通" 実装、**触らない**。

### Window TitleBar (修正不要)

- `TitleBar.svelte:70-90`: 最小化 / 最大化 / 閉じる ← Windows 標準慣習 (P5 OS 文脈 整合)

### Library カード操作 (修正不要)

- `LibraryMainArea.svelte:185-221`: 検索クリア / グリッド⇔リスト / 複数選択 ← 妥当

### 検証コマンド (CI に組み込む候補)

```sh
# 派手 delete button の独自実装が他に増えないよう検出
grep -rnE 'rounded-full bg-destructive' src/ | grep -v "WorkspaceWidgetGrid.svelte"
# 期待: 0 件
```

## Plan 文書化 phase

### 採用案 A: 「規格 §6-1 / §13 完全準拠 + 視覚を ghost-icon 風に整える」

```
編集モード ON
  ↓
全 widget で:
  - 通常: border-[var(--ag-border)] (§6-1)
  - 選択時: ring-2 ring-[var(--ag-accent)] (§6-1)
  - 設定ボタン (Settings2) + 削除ボタン (Trash2) 可視 (§6-1、編集モード時必須)
  - Drag handle (上端 floating bar、§13 ホバー toolbar 計画を 「常時表示」 に格上げ)
  - 8 handle のうち e/s/se のみ implement (§13 batch-70 段階)
  - 8 handle 完成 (n/w/nw/ne/sw + e/s/se) を §13 「将来 batch-71+」 に従って **本 plan で完成** させる
  - aria-label = 規格通り (RESIZE_LABELS const 維持)

視覚変更:
  - 削除ボタン: rounded-full bg-destructive/80 → **ghost-icon 風**
    `rounded-md p-1 text-destructive hover:bg-destructive/10 hover:text-destructive
     active:scale-[0.97] motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-destructive`
    (§6-4 destructive variant、ux_design_vision §2-1 Juice の active scale)
  - 設定ボタン: 同等の ghost-icon
  - Drag handle: surface-4/80 chip → ghost (transparent + cursor-grab)
  - Resize handles: 常時透明 placeholder → 通常 invisible + 選択時のみ visible (§13 既存 e/s/se 維持)

非選択時:
  - 編集モード OFF と同じ通常表示
  - ボタン群の opacity を 0 にする (display: none ではなく opacity で hover 余地、§7 Don't「opacity-0 だけで非表示」反例だが、編集モード ON 時に keyboard tab で選択する経路を残す)
  - **正確には visibility: hidden** で keyboard 不可も封じる
```

### 棄却案 B: 「選択時のみ全 handle 出す (常時非可視)」

| 評価軸                                               | A 案 (規格準拠)                      | B 案 (選択時のみ)                            | 引用 doc                       |
| ---------------------------------------------------- | ------------------------------------ | -------------------------------------------- | ------------------------------ |
| `ux_standards §6-1` 「編集モード時 設定 + 削除可視」 | ◎ 完全準拠                           | ✗ 規格逸脱 (選択時のみ可視)                  | `ux_standards §6-1`            |
| 認知負荷 (P3 主要操作)                               | ○ 編集モード = 操作可、明示          | △ 一手余分 (選択 → 操作)                     | `desktop_ui_ux_agent_rules P3` |
| 誤操作 (P2 立て直し)                                 | △ 編集モード ON 中の誤クリックリスク | ○ 選択経由でリスク低                         | `P2`                           |
| キーボード可 (P6 a11y)                               | ○ Tab で各 button 直接到達           | △ Tab で widget 選択 → handle Tab 経由で複雑 | `P6`                           |
| 一貫性 (P4 + §6-1)                                   | ◎ 規格更新不要                       | ✗ 規格更新が必要 (user 確認)                 | `P4`                           |

→ **A 案採用**。規格 (§6-1) は **既に検討済の合意点** であり、独断で B に動かない。

### 棄却案 C: 「色だけ ghost に変える、構造そのまま」

user fb 「やめて」「ださい」は **構造 + 視覚両方**の指摘。色変更だけでは不十分。

→ 棄却。

### 不整合 audit

- **規格 (§6-1) と現状コード**: 現状は **selection ring が未実装**、これは規格違反。本 plan で **fix in line** する (規格更新不要)
- **規格 (§13 batch-70) と本 plan**: §13 は「将来 batch-71+ で n/w/nw/ne/sw 完成」と書く。本 plan で完成させる = 規格進捗を batch-71 から本 plan に繰り上げ → **規格は更新が必要だが本 plan の commit 内で同時更新する**
- **規格 (§13 hover toolbar)**: §13 は将来扱いだが本 plan で「常時可視」(§6-1 編集モード時設定+削除可視) に統合。**§13 hover toolbar 行を update**し本 plan を反映 (規格と plan が同期)

### 実装ステップ

1. **規格 update を先に commit**:
   - `ux_standards §13` の「ホバー toolbar (TBD)」を「**編集モード時 常時可視 + 選択時 ring + 8 handle 完成**」に更新
   - `ux_standards §6-1 Widget` の「設定ボタン + 削除ボタン」記述を維持、ghost-icon variant 明示
2. 新規 `src/lib/components/arcagate/workspace/WidgetHandles.svelte`:
   - props: widgetId, isSelected, onDelete, onSettings
   - selection ring (`ring-2 ring-[var(--ag-accent)]`) は selected 時のみ
   - 設定 (Settings2) + 削除 (Trash2) ghost-icon button (常時 visible、編集モード時)
   - Drag handle (上端、ghost、cursor-grab、`pointerDrag` store 活用)
   - Resize 8 handles (n/s/e/w + 4 corner)、aria-label は `RESIZE_LABELS` const
3. `WorkspaceWidgetGrid.svelte` の独自 handle 全削除 (~115 行 削減)、`<WidgetHandles>` をマウント
4. CSS: `motion-reduce:transition-none` 全 button、`--ag-duration-fast` (120ms)、`--ag-ease-in-out` 統一
5. `WorkspaceLayout` Tip 文言更新: 「ボタンで操作、四隅のハンドルでリサイズ、× で削除、Delete キーでも削除可」(§13 + Delete/Backspace 経路)
6. E2E spec 新規 `tests/e2e/widget-handles-spec.spec.ts`:
   - 編集モード ON → 全 widget で設定 + 削除 button 可視 (§6-1)
   - widget click → ring-2 ring-accent (§6-1)
   - 別 widget click → ring 移動
   - 上端 drag → 移動 (位置確定 + history、Undo/Redo は Issue 4 で取り扱い)
   - SE corner drag → リサイズ
   - Delete キー → 削除 confirmation
   - × click → 削除 confirmation
7. **横展開 audit script** (CI に追加):
   ```sh
   # 派手 delete button の検出
   if grep -rnE 'rounded-full bg-destructive' src/; then
     echo "ERROR: 派手 destructive button が再発、ghost variant を使う"
     exit 1
   fi
   ```
8. `pnpm verify` 全通過 + dev session 確認

### UI/UX Review Note (desktop_ui_ux_agent_rules §5 format)

```md
- Goal: Widget の編集モード handle を規格 (§6-1 / §13) 通りに整え、user fb 「ださい / 普通そう実装しない」を解消
- Principle:
  - desktop_ui_ux_agent_rules §1 最上位順「見た目最後」 → 操作 / 状態 / 一貫を先に直す
  - P11 装飾は対象を邪魔しない → 派手丸 destructive を ghost-icon 化
  - P12 整合性 → 既存 ux_standards §6-1 の selection ring を実装、独自表現を捨てる
  - ux_standards §6-1 編集モード仕様 + §13 Workspace Canvas 編集 UX
- Reason: rollback で revert された旧 PH-472 のデザインは概ね正しかったが、`ux_standards §6-1` の selection ring 実装漏れ + `§13` の段階実装に揃っていない部分があったため、規格と完全整合する形で再実装する
- Before: 派手 destructive 丸ボタン + selection ring 不在 + 8 handle 未完成
- After: ghost-icon Trash2 + Settings2 + ring-2 ring-accent + 8 handle 完成 + Delete キー
- Trade-off: 編集モード時 全 widget に button 可視 (規格通り) → 認知負荷は若干上がるが規格と一貫、選択経由は B 案棄却
```

## 検収

`docs/dispatch-operation.md §11` 準拠で:

- agent 側 `pnpm verify` + CDP screenshot で動作確認
- main 反映後、user dev session で体感反応 (明示確認なし)
- user fb で次 issue へ移行
